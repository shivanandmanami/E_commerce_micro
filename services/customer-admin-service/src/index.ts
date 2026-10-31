// ============================================================================
// 7. CUSTOMER & ADMIN SERVICE (Port 4006)
// Handles:
//   - User Login & JWT Token generation (/auth/login)
//   - Customer Order History (/customers/me/orders)
//   - Admin Store Dashboard & Product Creation (/admin/dashboard, /admin/products)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  createLogger,
  InventoryItemDTO,
  OrderDTO,
  ProductDTO,
  resolveRequestUser,
  signAuthToken,
  UserRole,
} from '@ecommerce/shared';

const logger = createLogger('customer-admin-service');
const PORT = Number(process.env.CUSTOMER_ADMIN_SERVICE_PORT || 4006);

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:4001';
const ORDER_INV_URL = process.env.ORDER_INVENTORY_SERVICE_URL || 'http://localhost:4004';

// Pre-configured demo accounts for easy testing
const DEMO_USERS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'customer@ecommerce.local',
    password: 'customer123',
    fullName: 'Alex Rivera (Customer)',
    role: 'customer' as UserRole,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'admin@ecommerce.local',
    password: 'admin123',
    fullName: 'Morgan Vance (Store Admin)',
    role: 'admin' as UserRole,
  },
];

export function createCustomerAdminApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'customer-admin-service', status: 'UP' });
  });

  // 1A. Register a new Customer or Admin account
  const handleRegister = (req: Request, res: Response) => {
    const { email, password, fullName, role = 'customer' } = req.body || {};
    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: String(email).toLowerCase().trim(),
      password: String(password),
      fullName: String(fullName),
      role: (role === 'admin' ? 'admin' : 'customer') as UserRole,
    };

    DEMO_USERS.push(newUser);
    const token = signAuthToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
    });

    res.status(201).json({ token, user: newUser });
  };
  app.post('/auth/register', handleRegister);
  app.post('/register', handleRegister);

  // 1B. Login Endpoint -> returns a signed JWT token
  const handleLogin = (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    const user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === String(email || '').toLowerCase() && u.password === password
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({ token, user });
  };
  app.post('/auth/login', handleLogin);
  app.post('/login', handleLogin);

  // 2. Customer Order History Endpoint
  const handleCustomerOrders = async (req: Request, res: Response) => {
    const user = resolveRequestUser(req.headers as Record<string, string | string[] | undefined>);
    const userId = user?.userId || DEMO_USERS[0].id;

    const response = await fetch(`${ORDER_INV_URL}/orders?userId=${encodeURIComponent(userId)}`);
    const data = (await response.json()) as { items?: OrderDTO[] };
    const orders = data.items || [];

    res.json({
      userId,
      totalOrders: orders.length,
      orders,
    });
  };
  app.get('/customers/me/orders', handleCustomerOrders);
  app.get('/me/orders', handleCustomerOrders);

  // 3. Admin Store Operations Dashboard
  const handleAdminDashboard = async (_req: Request, res: Response) => {
    const [ordersRes, invRes, prodRes] = await Promise.all([
      fetch(`${ORDER_INV_URL}/orders`),
      fetch(`${ORDER_INV_URL}/inventory`),
      fetch(`${CATALOG_URL}/products`),
    ]);

    const orders = ((await ordersRes.json()) as { items?: OrderDTO[] }).items || [];
    const inventory = ((await invRes.json()) as { items?: InventoryItemDTO[] }).items || [];
    const products = ((await prodRes.json()) as { items?: ProductDTO[] }).items || [];

    const confirmed = orders.filter((o) => o.status === 'CONFIRMED');
    const compensated = orders.filter((o) => o.sagaStatus === 'COMPENSATED');
    const totalRevenue = confirmed.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      metrics: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders: orders.length,
        confirmedOrdersCount: confirmed.length,
        compensatedSagaCount: compensated.length,
        catalogSize: products.length,
      },
      lowStockItems: inventory.filter((i) => i.availableStock <= 10),
      recentOrders: orders.slice(0, 10),
    });
  };
  app.get('/admin/dashboard', handleAdminDashboard);
  app.get('/dashboard', handleAdminDashboard);

  // 4. Admin Create Product (adds to Catalog Service and initializes Inventory)
  const handleAdminCreateProduct = async (req: Request, res: Response) => {
    const body = req.body || {};

    const catalogRes = await fetch(`${CATALOG_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const createdProduct = (await catalogRes.json()) as ProductDTO;

    await fetch(`${ORDER_INV_URL}/inventory/${encodeURIComponent(createdProduct.sku)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalStock: body.availableQuantity ?? 25,
        unitPrice: createdProduct.price,
        productName: createdProduct.name,
        productId: createdProduct.id,
      }),
    });

    res.status(201).json(createdProduct);
  };
  app.post('/admin/products', handleAdminCreateProduct);
  app.post('/products', handleAdminCreateProduct);

  return app;
}

export async function startCustomerAdminService() {
  const app = createCustomerAdminApp();
  return app.listen(PORT, () => {
    logger.info(`Customer & Admin Service running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startCustomerAdminService();
}

// ============================================================================
// 4. CART SERVICE (Port 4003)
// Manages each customer's shopping cart and promo coupons (SAVE10, VIP20).
// Uses fast key-value storage (Redis or an in-memory Map).
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Cart, CartItem, createLogger, resolveRequestUser } from '@ecommerce/shared';

const logger = createLogger('cart-service');
const PORT = Number(process.env.CART_SERVICE_PORT || 4003);

// Available promo codes and their discount percentage
const COUPONS: Record<string, number> = {
  SAVE10: 0.1, // 10% off
  WELCOME15: 0.15, // 15% off
  VIP20: 0.2, // 20% off
};

// Key-value store: userId -> Cart
const carts = new Map<string, Cart>();

// Helper: Calculate subtotal, discount, and final total for a cart
function buildCart(userId: string, items: CartItem[], couponCode?: string): Cart {
  const subtotal = Number(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );

  const code = couponCode ? couponCode.toUpperCase() : undefined;
  const discountRate = code && COUPONS[code] ? COUPONS[code] : 0;
  const discountAmount = Number((subtotal * discountRate).toFixed(2));
  const total = Number((subtotal - discountAmount).toFixed(2));

  return {
    userId,
    items,
    couponCode: discountRate > 0 ? code : undefined,
    discountAmount,
    subtotal,
    total,
    updatedAt: new Date().toISOString(),
  };
}

// Helper: Find out which user owns the request
function getUserId(req: Request): string {
  if (req.params.userId) return String(req.params.userId);
  const user = resolveRequestUser(req.headers as Record<string, string | string[] | undefined>);
  return user?.userId || 'guest-default';
}

export function createCartApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'cart-service', status: 'UP', activeCarts: carts.size });
  });

  // 1. Get customer's cart
  const handleGetCart = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const cart = carts.get(userId) || buildCart(userId, []);
    res.json(cart);
  };
  app.get('/cart/:userId', handleGetCart);
  app.get('/:userId', handleGetCart);

  // 2. Add an item to the cart
  const handleAddItem = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { productId, sku, name, unitPrice, quantity = 1, image } = req.body || {};

    const currentCart = carts.get(userId) || buildCart(userId, []);
    const items = [...currentCart.items];

    // If item is already in cart, increase its quantity
    const existing = items.find((i) => i.sku === sku);
    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      items.push({
        productId: String(productId || sku),
        sku: String(sku),
        name: String(name),
        unitPrice: Number(unitPrice),
        quantity: Number(quantity),
        image,
      });
    }

    const updated = buildCart(userId, items, currentCart.couponCode);
    carts.set(userId, updated);
    res.json(updated);
  };
  app.post('/cart/:userId/items', handleAddItem);
  app.post('/:userId/items', handleAddItem);

  // 3. Change an item's quantity (or remove it if quantity <= 0)
  const handleUpdateQty = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const sku = String(req.params.sku);
    const quantity = Number(req.body?.quantity ?? 0);

    const currentCart = carts.get(userId) || buildCart(userId, []);
    const items =
      quantity <= 0
        ? currentCart.items.filter((i) => i.sku !== sku)
        : currentCart.items.map((i) => (i.sku === sku ? { ...i, quantity } : i));

    const updated = buildCart(userId, items, currentCart.couponCode);
    carts.set(userId, updated);
    res.json(updated);
  };
  app.patch('/cart/:userId/items/:sku', handleUpdateQty);
  app.patch('/:userId/items/:sku', handleUpdateQty);

  // 4. Remove a single item from the cart
  const handleRemoveItem = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const sku = String(req.params.sku);
    const currentCart = carts.get(userId) || buildCart(userId, []);
    const items = currentCart.items.filter((i) => i.sku !== sku);

    const updated = buildCart(userId, items, currentCart.couponCode);
    carts.set(userId, updated);
    res.json(updated);
  };
  app.delete('/cart/:userId/items/:sku', handleRemoveItem);
  app.delete('/:userId/items/:sku', handleRemoveItem);

  // 5. Apply a coupon code (SAVE10, WELCOME15, VIP20)
  const handleApplyCoupon = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const code = String(req.body?.couponCode || '').toUpperCase();

    if (code && !COUPONS[code]) {
      res.status(400).json({ message: 'Invalid coupon. Try SAVE10, WELCOME15, or VIP20.' });
      return;
    }

    const currentCart = carts.get(userId) || buildCart(userId, []);
    const updated = buildCart(userId, currentCart.items, code);
    carts.set(userId, updated);
    res.json(updated);
  };
  app.post('/cart/:userId/coupon', handleApplyCoupon);
  app.post('/:userId/coupon', handleApplyCoupon);

  // 6. Clear the entire cart
  const handleClearCart = (req: Request, res: Response) => {
    const userId = getUserId(req);
    const empty = buildCart(userId, []);
    carts.delete(userId);
    res.json(empty);
  };
  app.delete('/cart/:userId', handleClearCart);
  app.delete('/:userId', handleClearCart);

  return app;
}

if (require.main === module) {
  createCartApp().listen(PORT, () => {
    logger.info(`Cart Service running on http://localhost:${PORT}`);
  });
}

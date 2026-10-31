// ============================================================================
// 1. API GATEWAY SERVICE (Port 4000)
// This is the single entry point for the frontend.
// It handles:
//   - Rate Limiting (max 180 requests per minute per IP)
//   - JWT Authentication (checks if the user is logged in or is an Admin)
//   - Request Routing (forwards /api/* requests to the right microservice)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import {
  AuthTokenPayload,
  createLogger,
  extractBearerToken,
  verifyAuthToken,
} from '@ecommerce/shared';

const logger = createLogger('api-gateway');
const PORT = Number(process.env.GATEWAY_PORT || 4000);

// URLs of all backend microservices
const SERVICES = {
  catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:4001',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:4002',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:4003',
  orderInventory: process.env.ORDER_INVENTORY_SERVICE_URL || 'http://localhost:4004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4005',
  customerAdmin: process.env.CUSTOMER_ADMIN_SERVICE_URL || 'http://localhost:4006',
};

// Allow req.user in Express TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

// ----------------------------------------------------------------------------
// STEP 1: Simple Rate Limiter Middleware (180 requests per 60 seconds)
// ----------------------------------------------------------------------------
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip || 'local-user';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 180;

  let record = requestCounts.get(clientIp);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    requestCounts.set(clientIp, record);
  } else {
    record.count += 1;
  }

  // Send standard rate-limit headers back to the client
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));

  if (record.count > maxRequests) {
    res.status(429).json({ error: 'Too many requests, please try again in a minute.' });
    return;
  }

  next();
}

// ----------------------------------------------------------------------------
// STEP 2: JWT Authentication Middleware
// ----------------------------------------------------------------------------
function readUserFromToken(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    try {
      const user = verifyAuthToken(token);
      req.user = user;
      // Pass user info as headers to downstream microservices
      req.headers['x-user-id'] = user.userId;
      req.headers['x-user-email'] = user.email;
      req.headers['x-user-role'] = user.role;
      req.headers['x-user-name'] = user.fullName;
    } catch {
      // Ignore invalid token on public routes
    }
  }
  next();
}

function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Please log in first.' });
    return;
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

// ----------------------------------------------------------------------------
// STEP 3: Create Express Gateway & Route Traffic to Microservices
// ----------------------------------------------------------------------------
export function createGatewayApp() {
  const app = express();
  app.use(cors());
  app.use(rateLimiter);
  app.use(readUserFromToken);

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      service: 'api-gateway',
      status: 'UP',
      services: SERVICES,
    });
  });

  // Route 1: Auth, Customer Profile & Admin Portal -> customer-admin-service (4006)
  app.use('/api/auth', createProxyMiddleware({ target: `${SERVICES.customerAdmin}/auth`, changeOrigin: true }));
  app.use('/api/customers', requireLogin, createProxyMiddleware({ target: `${SERVICES.customerAdmin}/customers`, changeOrigin: true }));
  app.use('/api/admin', requireAdmin, createProxyMiddleware({ target: `${SERVICES.customerAdmin}/admin`, changeOrigin: true }));

  // Route 2: Search & Discovery -> search-service (4002)
  app.use('/api/search', createProxyMiddleware({ target: `${SERVICES.search}/search`, changeOrigin: true }));

  // Route 3: Product Catalog -> catalog-service (4001)
  app.use('/api/products', createProxyMiddleware({ target: `${SERVICES.catalog}/products`, changeOrigin: true }));

  // Route 4: Shopping Cart -> cart-service (4003)
  app.use('/api/cart', createProxyMiddleware({ target: `${SERVICES.cart}/cart`, changeOrigin: true }));

  // Route 5: Orders & Inventory -> order-inventory-service (4004)
  app.use('/api/orders', requireLogin, createProxyMiddleware({ target: `${SERVICES.orderInventory}/orders`, changeOrigin: true }));
  app.use('/api/inventory', createProxyMiddleware({ target: `${SERVICES.orderInventory}/inventory`, changeOrigin: true }));

  // Route 6: Payments -> payment-service (4005)
  app.use('/api/payments', createProxyMiddleware({ target: `${SERVICES.payment}/payments`, changeOrigin: true }));

  return app;
}

if (require.main === module) {
  createGatewayApp().listen(PORT, () => {
    logger.info(`API Gateway running on http://localhost:${PORT}`);
  });
}

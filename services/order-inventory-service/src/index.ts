// ============================================================================
// 5. ORDER & INVENTORY SERVICE (Port 4004)
// Implements the "SAGA PATTERN" for safe distributed orders:
//   Step 1: When a customer places an order, we LOCK (reserve) the stock first
//           and send an event to the Payment Service.
//   Step 2A (Happy Path): If Payment succeeds, we permanently deduct the stock
//           and mark the order as CONFIRMED.
//   Step 2B (Rollback / Compensating Transaction): If Payment fails, we RELEASE
//           the locked stock back to available inventory and mark the order CANCELLED.
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  createLogger,
  EventBus,
  INITIAL_PRODUCTS,
  InventoryItemDTO,
  KafkaTopics,
  OrderDTO,
  OrderInventoryLockedEvent,
  OrderItemDTO,
  PaymentFailedEvent,
  PaymentSucceededEvent,
  ProductUpsertedEvent,
  resolveRequestUser,
  ShippingAddress,
} from '@ecommerce/shared';

const logger = createLogger('order-inventory-service');
const PORT = Number(process.env.ORDER_INVENTORY_SERVICE_PORT || 4004);

export const eventBus = new EventBus({ serviceName: 'order-inventory-service' });

// Store Inventory by SKU
const inventory = new Map<string, InventoryItemDTO>(
  INITIAL_PRODUCTS.map((p) => [
    p.sku,
    {
      sku: p.sku,
      productId: p.id,
      productName: p.name,
      totalStock: p.availableQuantity ?? 25,
      reservedStock: 0,
      availableStock: p.availableQuantity ?? 25,
      unitPrice: p.price,
      updatedAt: new Date().toISOString(),
    },
  ])
);

// Store Orders by Order ID
const orders = new Map<string, OrderDTO>();

// Helper: Add a readable step to an order's Saga history log
function logSagaStep(order: OrderDTO, step: string, eventType: string) {
  order.sagaHistory = order.sagaHistory || [];
  order.sagaHistory.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    step,
    eventType,
    payload: {},
    createdAt: new Date().toISOString(),
  });
}

// ----------------------------------------------------------------------------
// SAGA STEP 1: Create Order & Lock Inventory
// ----------------------------------------------------------------------------
export async function startOrderSaga(params: {
  userId: string;
  items: OrderItemDTO[];
  shippingAddress: ShippingAddress;
  simulatePaymentFailure?: boolean;
}): Promise<OrderDTO> {
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const totalAmount = Number(
    params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );

  const order: OrderDTO = {
    id: orderId,
    userId: params.userId,
    status: 'PENDING',
    sagaStatus: 'AWAITING_INVENTORY_LOCK',
    totalAmount,
    currency: 'USD',
    items: params.items,
    shippingAddress: params.shippingAddress,
    sagaHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  logSagaStep(order, 'SAGA_INITIATED', 'ORDER_CREATED');

  // 1. Check if every item has enough available stock
  for (const item of params.items) {
    const stockItem = inventory.get(item.sku);
    if (!stockItem || stockItem.availableStock < item.quantity) {
      order.status = 'CANCELLED';
      order.sagaStatus = 'FAILED_OUT_OF_STOCK';
      order.failureReason = `Not enough stock for ${item.sku}`;
      logSagaStep(order, 'INVENTORY_LOCK_FAILED', 'OUT_OF_STOCK');
      orders.set(orderId, order);
      return order;
    }
  }

  // 2. Lock (reserve) the stock for each item
  for (const item of params.items) {
    const stockItem = inventory.get(item.sku)!;
    stockItem.reservedStock += item.quantity;
    stockItem.availableStock = stockItem.totalStock - stockItem.reservedStock;
  }

  order.status = 'INVENTORY_LOCKED';
  order.sagaStatus = 'INVENTORY_LOCKED_AWAITING_PAYMENT';
  logSagaStep(order, 'INVENTORY_LOCKED', 'STOCK_RESERVED');
  orders.set(orderId, order);

  // 3. Publish Kafka event to tell Payment Service to charge the customer
  const event: OrderInventoryLockedEvent = {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId,
    userId: params.userId,
    totalAmount,
    currency: 'USD',
    simulatePaymentFailure: params.simulatePaymentFailure,
    items: params.items,
  };
  await eventBus.publish(KafkaTopics.ORDER_INVENTORY_LOCKED, orderId, event);

  return orders.get(orderId)!;
}

// ----------------------------------------------------------------------------
// SAGA STEP 2A (Happy Path): Payment Succeeded -> Commit Inventory Deduction
// ----------------------------------------------------------------------------
export async function completeSagaOnPaymentSuccess(event: PaymentSucceededEvent) {
  const order = orders.get(event.orderId);
  if (!order) return;

  for (const item of order.items) {
    const stockItem = inventory.get(item.sku);
    if (stockItem) {
      stockItem.totalStock -= item.quantity;
      stockItem.reservedStock -= item.quantity;
      stockItem.availableStock = stockItem.totalStock - stockItem.reservedStock;
    }
  }

  order.status = 'CONFIRMED';
  order.deliveryStatus = 'ORDER_CONFIRMED';
  order.trackingNote = 'Order confirmed & sent to fulfillment warehouse';
  order.sagaStatus = 'COMPLETED';
  logSagaStep(order, 'SAGA_COMPLETED', 'PAYMENT_CONFIRMED_INVENTORY_COMMITTED');
}

// ----------------------------------------------------------------------------
// SAGA STEP 2B (Rollback): Payment Failed -> Release Locked Inventory
// ----------------------------------------------------------------------------
export async function compensateSagaOnPaymentFailure(event: PaymentFailedEvent) {
  const order = orders.get(event.orderId);
  if (!order) return;

  logSagaStep(order, 'SAGA_COMPENSATING', 'PAYMENT_FAILED_RELEASING_INVENTORY');

  // Release the reserved stock back into availableStock
  for (const item of order.items) {
    const stockItem = inventory.get(item.sku);
    if (stockItem) {
      stockItem.reservedStock -= item.quantity;
      stockItem.availableStock = stockItem.totalStock - stockItem.reservedStock;
    }
  }

  order.status = 'CANCELLED';
  order.deliveryStatus = 'CANCELLED';
  order.sagaStatus = 'COMPENSATED';
  order.failureReason = event.reason;
  logSagaStep(order, 'SAGA_COMPENSATED', 'INVENTORY_LOCK_RELEASED');
}

// ----------------------------------------------------------------------------
// Express API Routes
// ----------------------------------------------------------------------------
export function createOrderInventoryApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'order-inventory-service', status: 'UP', totalOrders: orders.size });
  });

  // Create a new order and start the Saga
  const handleCreateOrder = async (req: Request, res: Response) => {
    const user = resolveRequestUser(req.headers as Record<string, string | string[] | undefined>);
    const userId = req.body?.userId || user?.userId || 'customer-demo-1';
    const items: OrderItemDTO[] = req.body?.items || [];

    if (items.length === 0) {
      res.status(400).json({ error: 'Order must have at least one item' });
      return;
    }

    const order = await startOrderSaga({
      userId,
      items,
      shippingAddress: req.body?.shippingAddress || {
        recipientName: 'Alex Rivera',
        street: '742 Evergreen Terrace',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94107',
        country: 'US',
      },
      simulatePaymentFailure: Boolean(req.body?.simulatePaymentFailure),
    });

    res.status(201).json(order);
  };
  app.post('/orders', handleCreateOrder);
  app.post('/', handleCreateOrder);

  // List orders
  const handleListOrders = (req: Request, res: Response) => {
    const user = resolveRequestUser(req.headers as Record<string, string | string[] | undefined>);
    const filterUserId =
      typeof req.query.userId === 'string'
        ? req.query.userId
        : user?.role === 'admin'
          ? undefined
          : user?.userId;

    let list = Array.from(orders.values()).reverse();
    if (filterUserId) {
      list = list.filter((o) => o.userId === filterUserId);
    }
    res.json({ items: list, total: list.length });
  };
  app.get('/orders', handleListOrders);

  // Cancel / Return an Order & Restore Stock back to Inventory
  const handleCancelOrder = (req: Request, res: Response) => {
    const orderId = String(req.params.id);
    const order = orders.get(orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'CONFIRMED') {
      for (const item of order.items) {
        const stockItem = inventory.get(item.sku);
        if (stockItem) {
          stockItem.totalStock += item.quantity;
          stockItem.availableStock = stockItem.totalStock - stockItem.reservedStock;
        }
      }
      order.status = 'CANCELLED';
      order.deliveryStatus = 'CANCELLED';
      order.sagaStatus = 'COMPENSATED';
      order.failureReason = 'Customer cancelled / returned order (Stock restored)';
      logSagaStep(order, 'ORDER_RETURNED', 'STOCK_RESTORED_TO_INVENTORY');
    }

    res.json(order);
  };
  app.post('/orders/:id/cancel', handleCancelOrder);
  app.post('/:id/cancel', handleCancelOrder);

  // Admin: Process order & update live delivery status for the customer
  const handleAdminUpdateOrderStatus = (req: Request, res: Response) => {
    const orderId = String(req.params.id);
    const order = orders.get(orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const { deliveryStatus, trackingNote } = req.body || {};

    // If Admin cancels a confirmed order, restore stock back to inventory
    if (deliveryStatus === 'CANCELLED' && order.status === 'CONFIRMED') {
      for (const item of order.items) {
        const stockItem = inventory.get(item.sku);
        if (stockItem) {
          stockItem.totalStock += item.quantity;
          stockItem.availableStock = stockItem.totalStock - stockItem.reservedStock;
        }
      }
      order.status = 'CANCELLED';
      order.deliveryStatus = 'CANCELLED';
      order.sagaStatus = 'COMPENSATED';
      order.failureReason = trackingNote || 'Order cancelled by Store Admin (Stock restored)';
      logSagaStep(order, 'ADMIN_CANCELLED', 'STOCK_RESTORED');
    } else if (deliveryStatus) {
      order.deliveryStatus = deliveryStatus;
      order.trackingNote = trackingNote || `Admin updated status to ${deliveryStatus}`;
      order.updatedAt = new Date().toISOString();
      logSagaStep(order, 'ADMIN_FULFILLMENT_UPDATE', String(deliveryStatus));
    }

    res.json(order);
  };
  app.patch('/orders/:id/status', handleAdminUpdateOrderStatus);
  app.patch('/:id/status', handleAdminUpdateOrderStatus);

  // List all inventory stock
  const handleListInventory = (_req: Request, res: Response) => {
    const list = Array.from(inventory.values());
    res.json({ items: list, total: list.length });
  };
  app.get('/inventory', handleListInventory);

  // Get stock for one SKU
  const handleGetSku = (req: Request, res: Response) => {
    const sku = String(req.params.sku || req.params.id).toUpperCase();
    const item = inventory.get(sku);
    if (!item) {
      res.status(404).json({ error: 'SKU not found' });
      return;
    }
    res.json(item);
  };
  app.get('/inventory/:sku', handleGetSku);

  // Update stock for a SKU (Admin Restock)
  const handleUpdateStock = (req: Request, res: Response) => {
    const sku = String(req.params.sku).toUpperCase();
    const existing = inventory.get(sku);
    const totalStock = Number(req.body?.totalStock ?? 25);
    const reserved = existing ? existing.reservedStock : 0;

    const updated: InventoryItemDTO = {
      sku,
      productId: req.body?.productId || existing?.productId || sku,
      productName: req.body?.productName || existing?.productName || sku,
      totalStock,
      reservedStock: reserved,
      availableStock: totalStock - reserved,
      unitPrice: Number(req.body?.unitPrice ?? existing?.unitPrice ?? 99),
      updatedAt: new Date().toISOString(),
    };
    inventory.set(sku, updated);
    res.json(updated);
  };
  app.put('/inventory/:sku', handleUpdateStock);
  app.put('/:sku', handleUpdateStock);

  // Root fallback routes when proxied through API Gateway
  app.get('/', (req: Request, res: Response) => {
    if (req.baseUrl.includes('inventory')) return handleListInventory(req, res);
    return handleListOrders(req, res);
  });
  app.get('/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (id.startsWith('SKU-')) return handleGetSku(req, res);
    const found = orders.get(id);
    if (!found) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(found);
  });

  // Receive Kafka events over HTTP fallback
  app.post('/internal/events', async (req: Request, res: Response) => {
    const { topic, payload } = req.body || {};
    if (topic) await eventBus.dispatchLocal(topic as KafkaTopics, payload);
    res.json({ received: true });
  });

  return app;
}

export async function startOrderInventoryService() {
  await eventBus.subscribe<PaymentSucceededEvent>(KafkaTopics.PAYMENT_SUCCEEDED, async (event) => {
    logger.info(`Payment succeeded for order ${event.orderId} -> Committing stock`);
    await completeSagaOnPaymentSuccess(event);
  });

  await eventBus.subscribe<PaymentFailedEvent>(KafkaTopics.PAYMENT_FAILED, async (event) => {
    logger.warn(`Payment failed for order ${event.orderId} -> Releasing locked stock`);
    await compensateSagaOnPaymentFailure(event);
  });

  await eventBus.subscribe<ProductUpsertedEvent>(KafkaTopics.PRODUCT_UPSERTED, async (event) => {
    const p = event?.product;
    if (p && !inventory.has(p.sku)) {
      inventory.set(p.sku, {
        sku: p.sku,
        productId: p.id,
        productName: p.name,
        totalStock: p.availableQuantity ?? 25,
        reservedStock: 0,
        availableStock: p.availableQuantity ?? 25,
        unitPrice: p.price,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  await eventBus.connect();
  await eventBus.startConsumer();

  const app = createOrderInventoryApp();
  return app.listen(PORT, () => {
    logger.info(`Order & Inventory Service running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startOrderInventoryService();
}

// ============================================================================
// 6. PAYMENT SERVICE (Port 4005)
// Listens for "ORDER_INVENTORY_LOCKED" events from the Order Service.
// Charges the customer using Stripe (or simulates a card approval/decline):
//   - If approved -> publishes "PAYMENT_SUCCEEDED"
//   - If declined -> publishes "PAYMENT_FAILED" (triggers Saga stock rollback)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import {
  createLogger,
  EventBus,
  KafkaTopics,
  OrderInventoryLockedEvent,
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '@ecommerce/shared';

const logger = createLogger('payment-service');
const PORT = Number(process.env.PAYMENT_SERVICE_PORT || 4005);
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';

export const stripeClient = new Stripe(STRIPE_KEY);
export const eventBus = new EventBus({ serviceName: 'payment-service' });

// Process payment for an order whose inventory has been locked
export async function processOrderPayment(event: OrderInventoryLockedEvent) {
  const paymentId = crypto.randomUUID();

  // 1. Check if the user chose "Simulate Stripe Decline" in the checkout page
  if (event.simulatePaymentFailure) {
    const failEvent: PaymentFailedEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      orderId: event.orderId,
      userId: event.userId,
      reason: 'Stripe card declined (insufficient_funds / simulated failure)',
    };
    await eventBus.publish(KafkaTopics.PAYMENT_FAILED, event.orderId, failEvent);
    return { status: 'FAILED', orderId: event.orderId, reason: failEvent.reason };
  }

  // 2. Otherwise approve the payment and publish PAYMENT_SUCCEEDED
  const successEvent: PaymentSucceededEvent = {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: event.orderId,
    userId: event.userId,
    paymentId,
    stripePaymentIntentId: `pi_${crypto.randomUUID().slice(0, 12)}`,
    amount: event.totalAmount,
    currency: event.currency || 'USD',
  };

  await eventBus.publish(KafkaTopics.PAYMENT_SUCCEEDED, event.orderId, successEvent);
  return { status: 'SUCCEEDED', orderId: event.orderId, paymentId };
}

export function createPaymentApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'payment-service', status: 'UP' });
  });

  // Direct API endpoint to trigger payment
  app.post('/payments/create-intent', async (req: Request, res: Response) => {
    const result = await processOrderPayment({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      orderId: String(req.body?.orderId),
      userId: String(req.body?.userId || 'customer-1'),
      totalAmount: Number(req.body?.amount || 0),
      currency: 'USD',
      simulatePaymentFailure: Boolean(req.body?.simulatePaymentFailure),
      items: [],
    });
    res.json(result);
  });

  // Receive Kafka events over HTTP fallback
  app.post('/internal/events', async (req: Request, res: Response) => {
    const { topic, payload } = req.body || {};
    if (topic) await eventBus.dispatchLocal(topic as KafkaTopics, payload);
    res.json({ received: true });
  });

  return app;
}

export async function startPaymentService() {
  // Automatically process payment whenever Order Service locks inventory
  await eventBus.subscribe<OrderInventoryLockedEvent>(
    KafkaTopics.ORDER_INVENTORY_LOCKED,
    async (event) => {
      logger.info(`Charging $${event.totalAmount} for order ${event.orderId}`);
      await processOrderPayment(event);
    }
  );

  await eventBus.connect();
  await eventBus.startConsumer();

  const app = createPaymentApp();
  return app.listen(PORT, () => {
    logger.info(`Payment Service running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startPaymentService();
}

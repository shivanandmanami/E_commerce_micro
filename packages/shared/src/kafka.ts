// ============================================================================
// SIMPLE EVENT BUS (KAFKA + AUTOMATIC HTTP FALLBACK)
// Allows microservices to publish and subscribe to events (like Order Locked,
// Payment Succeeded, or Payment Failed).
// If Apache Kafka is running in Docker, it uses Kafka.
// If Kafka is NOT running, it sends the event via HTTP so local dev still works!
// ============================================================================

import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { createLogger, Logger } from './logger';
import { KafkaTopics } from './types';

export type EventHandler<T = any> = (payload: T) => Promise<void>;

// Where to send events when running locally without Docker Kafka
const FALLBACK_URLS: Partial<Record<KafkaTopics, string[]>> = {
  [KafkaTopics.PRODUCT_UPSERTED]: ['http://localhost:4002', 'http://localhost:4004'],
  [KafkaTopics.PRODUCT_DELETED]: ['http://localhost:4002'],
  [KafkaTopics.ORDER_INVENTORY_LOCKED]: ['http://localhost:4005'],
  [KafkaTopics.PAYMENT_SUCCEEDED]: ['http://localhost:4004'],
  [KafkaTopics.PAYMENT_FAILED]: ['http://localhost:4004'],
};

export class EventBus {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private isKafkaConnected = false;
  private handlers = new Map<string, EventHandler[]>();
  private logger: Logger;
  private serviceName: string;

  constructor(options: { serviceName: string }) {
    this.serviceName = options.serviceName;
    this.logger = createLogger(`${options.serviceName}:events`);

    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.kafka = new Kafka({
      clientId: options.serviceName,
      brokers,
      logLevel: logLevel.NOTHING,
      retry: { retries: 1 },
    });
  }

  // Connect to Kafka if available
  public async connect(): Promise<boolean> {
    if (process.env.DISABLE_KAFKA === 'true') {
      this.isKafkaConnected = false;
      return false;
    }

    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isKafkaConnected = true;
      this.logger.info('Connected to Apache Kafka');
      return true;
    } catch {
      this.isKafkaConnected = false;
      this.logger.info('Kafka not running; using simple HTTP event relay');
      return false;
    }
  }

  // Register a function to run when a specific event arrives
  public async subscribe<T = any>(topic: KafkaTopics, handler: EventHandler<T>): Promise<void> {
    const list = this.handlers.get(topic) || [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  // Start listening to Kafka topics
  public async startConsumer(): Promise<void> {
    if (!this.isKafkaConnected || this.handlers.size === 0) return;

    try {
      this.consumer = this.kafka.consumer({ groupId: `${this.serviceName}-group` });
      await this.consumer.connect();

      for (const topic of this.handlers.keys()) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (!message.value) return;
          const data = JSON.parse(message.value.toString());
          await this.dispatchLocal(topic as KafkaTopics, data);
        },
      });
    } catch {
      this.isKafkaConnected = false;
    }
  }

  // Run all local handlers registered for a topic
  public async dispatchLocal(topic: KafkaTopics, payload: unknown): Promise<void> {
    const list = this.handlers.get(topic) || [];
    for (const handler of list) {
      await handler(payload);
    }
  }

  // Publish an event to other microservices
  public async publish<T>(topic: KafkaTopics, key: string, payload: T): Promise<void> {
    // 1. If connected to Kafka, send via Kafka
    if (this.isKafkaConnected && this.producer) {
      try {
        await this.producer.send({
          topic,
          messages: [{ key, value: JSON.stringify(payload) }],
        });
        return;
      } catch {
        // Fall through to HTTP relay if Kafka send fails
      }
    }

    // 2. Otherwise, send the event over HTTP to target services
    const targetServices = FALLBACK_URLS[topic] || [];
    for (const url of targetServices) {
      try {
        await fetch(`${url}/internal/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, key, payload }),
        });
      } catch {
        // Ignore if target service is not running yet
      }
    }
  }

  public getStatus(): { connected: boolean; mode: 'kafka' | 'http-relay' } {
    return {
      connected: this.isKafkaConnected,
      mode: this.isKafkaConnected ? 'kafka' : 'http-relay',
    };
  }
}

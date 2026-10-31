// ============================================================================
// 2. PRODUCT CATALOG SERVICE (Port 4001)
// Stores all 250+ products and their dynamic attributes.
// Supports:
//   - GET /products         (list all products)
//   - GET /products/:id     (get single product)
//   - POST /products        (create product)
//   - PATCH /products/:id   (edit product price, name, or deal status)
//   - DELETE /products/:id  (delete product)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import crypto from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose, { Schema } from 'mongoose';
import {
  createLogger,
  EventBus,
  INITIAL_PRODUCTS,
  KafkaTopics,
  ProductDTO,
} from '@ecommerce/shared';

const logger = createLogger('catalog-service');
const PORT = Number(process.env.CATALOG_SERVICE_PORT || 4001);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_catalog';

const ProductSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    brand: { type: String, default: 'Generic' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    attributes: { type: Schema.Types.Mixed, default: {} },
    inStock: { type: Boolean, default: true },
    availableQuantity: { type: Number, default: 25 },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 10 },
  },
  { timestamps: true }
);

const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// In-memory product Map pre-loaded with 250 sample products
const products = new Map<string, ProductDTO>(
  INITIAL_PRODUCTS.map((item) => [item.id, { ...item }])
);

export const eventBus = new EventBus({ serviceName: 'catalog-service' });

async function connectMongoIfAvailable() {
  if (process.env.DISABLE_MONGO === 'true') return;
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 1500 });
    logger.info('Connected to MongoDB');
  } catch {
    logger.info('Using pre-loaded in-memory Product Catalog (250 products)');
  }
}

export function createCatalogApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'catalog-service', status: 'UP', totalProducts: products.size });
  });

  // 1. Get all products
  const getAllProducts = (_req: Request, res: Response) => {
    const list = Array.from(products.values());
    res.json({ items: list, total: list.length });
  };
  app.get('/products', getAllProducts);
  app.get('/', getAllProducts);

  // 2. Get one product by ID or SKU
  const getOneProduct = (req: Request, res: Response) => {
    const id = String(req.params.id);
    const found =
      products.get(id) || Array.from(products.values()).find((p) => p.sku === id);

    if (!found) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(found);
  };
  app.get('/products/:id', getOneProduct);
  app.get('/:id', getOneProduct);

  // 3. Create a new product
  const createProduct = async (req: Request, res: Response) => {
    const body = req.body || {};
    const now = new Date().toISOString();

    const newProduct: ProductDTO = {
      id: body.id || `prod-${crypto.randomUUID().slice(0, 8)}`,
      sku: String(body.sku || 'SKU-NEW').toUpperCase(),
      name: String(body.name || 'New Product'),
      description: String(body.description || ''),
      category: String(body.category || 'General'),
      brand: String(body.brand || 'Generic'),
      price: Number(body.price || 0),
      currency: 'USD',
      images: body.images || [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
      ],
      tags: Array.isArray(body.tags) ? body.tags : [],
      attributes: body.attributes || {},
      inStock: true,
      availableQuantity: Number(body.availableQuantity ?? 25),
      rating: 4.9,
      reviewCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    products.set(newProduct.id, newProduct);
    if (mongoose.connection.readyState === 1) {
      await ProductModel.create(newProduct).catch(() => undefined);
    }

    await eventBus.publish(KafkaTopics.PRODUCT_UPSERTED, newProduct.id, {
      eventId: crypto.randomUUID(),
      timestamp: now,
      product: newProduct,
    });

    res.status(201).json(newProduct);
  };
  app.post('/products', createProduct);
  app.post('/', createProduct);

  // 4. Edit an existing product (price, name, deal tag, etc.)
  const updateProduct = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const existing =
      products.get(id) || Array.from(products.values()).find((p) => p.sku === id);

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const updates = req.body || {};
    const updated: ProductDTO = {
      ...existing,
      ...updates,
      id: existing.id,
      price: updates.price !== undefined ? Number(updates.price) : existing.price,
      updatedAt: new Date().toISOString(),
    };

    products.set(existing.id, updated);
    await eventBus.publish(KafkaTopics.PRODUCT_UPSERTED, updated.id, {
      eventId: crypto.randomUUID(),
      timestamp: updated.updatedAt,
      product: updated,
    });

    res.json(updated);
  };
  app.patch('/products/:id', updateProduct);
  app.patch('/:id', updateProduct);

  // 5. Delete a product
  const deleteProduct = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const existing =
      products.get(id) || Array.from(products.values()).find((p) => p.sku === id);

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    products.delete(existing.id);
    await eventBus.publish(KafkaTopics.PRODUCT_DELETED, existing.id, {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      productId: existing.id,
      sku: existing.sku,
    });

    res.json({ deleted: true, id: existing.id });
  };
  app.delete('/products/:id', deleteProduct);
  app.delete('/:id', deleteProduct);

  return app;
}

export async function startCatalogService() {
  await connectMongoIfAvailable();
  await eventBus.connect();
  const app = createCatalogApp();
  return app.listen(PORT, () => {
    logger.info(`Catalog Service running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startCatalogService();
}

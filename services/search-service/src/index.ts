// ============================================================================
// 3. SEARCH & DISCOVERY SERVICE (Port 4002)
// Searches and filters all 250+ products by:
//   - Keyword (q)
//   - Category & Brand
//   - Price Range (minPrice, maxPrice)
//   - Customer Star Rating (minRating)
//   - In-Stock Only (inStock=true) & Deals Only (onlyDeals=true)
//   - Dynamic specifications (e.g., ?attr.ramGb=64)
//   - Sorting (Featured, Price Low->High, Price High->Low, Highest Rated, Most Reviewed)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  createLogger,
  EventBus,
  INITIAL_PRODUCTS,
  KafkaTopics,
  ProductDeletedEvent,
  ProductDTO,
  ProductUpsertedEvent,
} from '@ecommerce/shared';

const logger = createLogger('search-service');
const PORT = Number(process.env.SEARCH_SERVICE_PORT || 4002);

// Search index holding all 250+ products
const searchIndex = new Map<string, ProductDTO>(
  INITIAL_PRODUCTS.map((p) => [p.id, { ...p }])
);

export const eventBus = new EventBus({ serviceName: 'search-service' });

// Helper: Count how many products exist for each category or brand
function countBuckets(values: string[]) {
  const counts = new Map<string, number>();
  for (const val of values) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function createSearchApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'search-service', status: 'UP', indexedProducts: searchIndex.size });
  });

  // Main Search Endpoint: GET /search
  const handleSearch = (req: Request, res: Response) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    const category = String(req.query.category || '').trim();
    const brand = String(req.query.brand || '').trim();
    const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
    const minRating = req.query.minRating !== undefined ? Number(req.query.minRating) : undefined;
    const inStockOnly = String(req.query.inStock || '') === 'true';
    const onlyDeals = String(req.query.onlyDeals || '') === 'true';
    const sort = String(req.query.sort || 'relevance');

    const allProducts = Array.from(searchIndex.values());
    let results = [...allProducts];

    // 1. Keyword search (matches name, brand, category, description, tags, or SKU)
    if (q) {
      results = results.filter((p) => {
        const searchableText = [
          p.name,
          p.description,
          p.brand,
          p.category,
          p.sku,
          ...(p.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        return searchableText.includes(q);
      });
    }

    // 2. Category & Brand filters
    if (category) {
      results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (brand) {
      results = results.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }

    // 3. Price Range filter
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      results = results.filter((p) => p.price >= minPrice);
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      results = results.filter((p) => p.price <= maxPrice);
    }

    // 4. Minimum Star Rating filter (e.g. 4.0 & Up)
    if (minRating !== undefined && !Number.isNaN(minRating)) {
      results = results.filter((p) => p.rating >= minRating);
    }

    // 5. In-Stock Only & Deals Only filters
    if (inStockOnly) {
      results = results.filter((p) => p.inStock);
    }
    if (onlyDeals) {
      results = results.filter((p) => p.tags.includes('deal'));
    }

    // 6. Dynamic Attribute filters (like ?attr.ramGb=64)
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith('attr.') && typeof value === 'string' && value) {
        const attrName = key.slice(5);
        results = results.filter(
          (p) => String(p.attributes?.[attrName] || '').toLowerCase() === value.toLowerCase()
        );
      }
    }

    // 7. Sort results
    if (sort === 'price_asc') results.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
    if (sort === 'rating_desc') results.sort((a, b) => b.rating - a.rating);
    if (sort === 'reviews_desc') results.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));

    // 8. Build sidebar facets (counts across catalog so user can easily switch filters)
    const facets = {
      categories: countBuckets(allProducts.map((p) => p.category)),
      brands: countBuckets(
        (category
          ? allProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase())
          : allProducts
        ).map((p) => p.brand)
      ),
      tags: countBuckets(results.flatMap((p) => p.tags)),
      priceRanges: [
        { label: 'Under $100', min: 0, max: 100, count: allProducts.filter((p) => p.price < 100).length },
        { label: '$100 to $300', min: 100, max: 300, count: allProducts.filter((p) => p.price >= 100 && p.price <= 300).length },
        { label: '$300 to $800', min: 300, max: 800, count: allProducts.filter((p) => p.price > 300 && p.price <= 800).length },
        { label: '$800 & Above', min: 800, max: null, count: allProducts.filter((p) => p.price > 800).length },
      ],
      attributes: {},
    };

    res.json({
      query: q,
      total: results.length,
      engine: 'elasticsearch-compatible',
      hits: results,
      facets,
    });
  };

  app.get('/search', handleSearch);
  app.get('/', handleSearch);

  // Receive Kafka events when Catalog Service adds or updates a product
  app.post('/internal/events', async (req: Request, res: Response) => {
    const { topic, payload } = req.body || {};
    if (topic) await eventBus.dispatchLocal(topic as KafkaTopics, payload);
    res.json({ received: true });
  });

  return app;
}

export async function startSearchService() {
  await eventBus.subscribe<ProductUpsertedEvent>(KafkaTopics.PRODUCT_UPSERTED, async (event) => {
    if (event?.product) {
      searchIndex.set(event.product.id, event.product);
      logger.info(`Indexed product: ${event.product.name}`);
    }
  });

  await eventBus.subscribe<ProductDeletedEvent>(KafkaTopics.PRODUCT_DELETED, async (event) => {
    if (event?.productId) {
      searchIndex.delete(event.productId);
      logger.info(`Removed product from search index: ${event.productId}`);
    }
  });

  await eventBus.connect();
  await eventBus.startConsumer();

  const app = createSearchApp();
  return app.listen(PORT, () => {
    logger.info(`Search Service running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startSearchService();
}

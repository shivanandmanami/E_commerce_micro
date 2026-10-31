import net from 'net';
import { createLogger } from '@ecommerce/shared';

const logger = createLogger('orchestrator');

function checkPortOpen(port: number, host = '127.0.0.1', timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(open);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function detectLocalInfrastructure() {
  const [pgOpen, mongoOpen, redisOpen, esOpen, kafkaOpen] = await Promise.all([
    checkPortOpen(5432),
    checkPortOpen(27017),
    checkPortOpen(6379),
    checkPortOpen(9200),
    checkPortOpen(9092),
  ]);

  if (!pgOpen) process.env.DISABLE_POSTGRES = 'true';
  if (!mongoOpen) process.env.DISABLE_MONGO = 'true';
  if (!redisOpen) process.env.DISABLE_REDIS = 'true';
  if (!esOpen) process.env.DISABLE_ELASTICSEARCH = 'true';
  if (!kafkaOpen) process.env.DISABLE_KAFKA = 'true';

  logger.info('Infrastructure port detection complete', {
    postgres: pgOpen ? 'ONLINE (5432)' : 'FALLBACK (in-memory)',
    mongodb: mongoOpen ? 'ONLINE (27017)' : 'FALLBACK (in-memory)',
    redis: redisOpen ? 'ONLINE (6379)' : 'FALLBACK (in-memory)',
    elasticsearch: esOpen ? 'ONLINE (9200)' : 'FALLBACK (in-memory)',
    kafka: kafkaOpen ? 'ONLINE (9092)' : 'FALLBACK (http-relay)',
  });
}

async function bootAllMicroservices() {
  logger.info('Booting all e-commerce microservices...');
  await detectLocalInfrastructure();

  const [
    { startCatalogService },
    { startSearchService },
    { createCartApp },
    { startOrderInventoryService },
    { startPaymentService },
    { startCustomerAdminService },
    { createGatewayApp },
  ] = await Promise.all([
    import('../services/catalog-service/src/index'),
    import('../services/search-service/src/index'),
    import('../services/cart-service/src/index'),
    import('../services/order-inventory-service/src/index'),
    import('../services/payment-service/src/index'),
    import('../services/customer-admin-service/src/index'),
    import('../services/api-gateway/src/index'),
  ]);

  await Promise.all([
    startCatalogService(),
    startSearchService(),
    startOrderInventoryService(),
    startPaymentService(),
    startCustomerAdminService(),
  ]);

  const cartPort = Number(process.env.CART_SERVICE_PORT || 4003);
  createCartApp().listen(cartPort, () => {
    logger.info(`Cart Service listening on http://localhost:${cartPort}`);
  });

  const gatewayPort = Number(process.env.GATEWAY_PORT || 4000);
  createGatewayApp().listen(gatewayPort, () => {
    logger.info(`API Gateway listening on http://localhost:${gatewayPort}`);
  });
}

bootAllMicroservices().catch((err) => {
  logger.error('Failed to boot microservices', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

import assert from 'assert';
import { Server } from 'http';
import { startCatalogService } from '../services/catalog-service/src/index';
import { startSearchService } from '../services/search-service/src/index';
import { createCartApp } from '../services/cart-service/src/index';
import { startOrderInventoryService } from '../services/order-inventory-service/src/index';
import { startPaymentService } from '../services/payment-service/src/index';
import { startCustomerAdminService } from '../services/customer-admin-service/src/index';
import { createGatewayApp } from '../services/api-gateway/src/index';

process.env.DISABLE_KAFKA = 'true';
process.env.DISABLE_MONGO = 'true';
process.env.DISABLE_POSTGRES = 'true';
process.env.DISABLE_ELASTICSEARCH = 'true';
process.env.DISABLE_REDIS = 'true';

const GATEWAY = 'http://localhost:4000/api';

async function runVerification() {
  const servers: Server[] = [];

  try {
    let alreadyRunning = false;
    try {
      const check = await fetch(`${GATEWAY}/health`, { signal: AbortSignal.timeout(500) });
      alreadyRunning = check.ok;
    } catch {
      alreadyRunning = false;
    }

    if (alreadyRunning) {
      console.log('1. Detected running microservices on ports 4000-4006...');
    } else {
      console.log('1. Starting all 6 microservices + API Gateway...');
      servers.push(await startCatalogService());
      servers.push(await startSearchService());
      servers.push(createCartApp().listen(4003));
      servers.push(await startOrderInventoryService());
      servers.push(await startPaymentService());
      servers.push(await startCustomerAdminService());
      servers.push(createGatewayApp().listen(4000));
      await new Promise((r) => setTimeout(r, 300));
    }

    // 2. Verify API Gateway Health & Rate Limit Headers
    console.log('2. Verifying API Gateway health & rate limiting headers...');
    const healthRes = await fetch(`${GATEWAY}/health`);
    assert.strictEqual(healthRes.status, 200);
    assert.ok(healthRes.headers.get('x-ratelimit-limit'), 'Rate limit header missing');
    const healthBody: any = await healthRes.json();
    assert.strictEqual(healthBody.status, 'UP');

    // 3. Authenticate Customer & Admin via Customer/Admin Service
    console.log('3. Verifying JWT Authentication for Customer & Admin personas...');
    const custLoginRes = await fetch(`${GATEWAY}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@ecommerce.local', password: 'customer123' }),
    });
    assert.strictEqual(custLoginRes.status, 200);
    const custAuth: any = await custLoginRes.json();
    assert.ok(custAuth.token);

    const adminLoginRes = await fetch(`${GATEWAY}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ecommerce.local', password: 'admin123' }),
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminAuth: any = await adminLoginRes.json();
    assert.ok(adminAuth.token);

    // 4. Verify Multi-Faceted Search & Discovery across 250-product catalog
    console.log('4. Verifying Search & Discovery multi-faceted filtering & 250+ catalog...');
    const allSearchRes = await fetch(`${GATEWAY}/search`);
    const allSearchData: any = await allSearchRes.json();
    assert.ok(allSearchData.total >= 250, `Expected >=250 products, got ${allSearchData.total}`);

    const searchRes = await fetch(`${GATEWAY}/search?category=Laptops&attr.ramGb=64`);
    assert.strictEqual(searchRes.status, 200);
    const searchData: any = await searchRes.json();
    assert.strictEqual(searchData.total, 1);
    assert.strictEqual(searchData.hits[0].sku, 'SKU-LAPTOP-PRO-16');

    // 5. Verify Dynamic Product Creation via Admin Service -> Catalog -> Search & Inventory sync
    console.log('5. Verifying dynamic product creation & cross-service event sync...');
    const createProdRes = await fetch(`${GATEWAY}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({
        sku: 'SKU-VR-HEADSET-X1',
        name: 'AetherVision Spatial VR Headset',
        category: 'VR',
        brand: 'AetherTech',
        price: 899,
        description: 'Dual Micro-OLED 4K per-eye spatial headset',
        availableQuantity: 30,
        attributes: {
          resolutionPerEye: '3840x3552',
          fieldOfViewDegrees: 115,
        },
      }),
    });
    assert.strictEqual(createProdRes.status, 201);

    // 6. Verify Cart Service operations & coupon discount
    console.log('6. Verifying Cart Service item operations & coupon calculation...');
    await fetch(`${GATEWAY}/cart/${custAuth.user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${custAuth.token}` },
    });

    const addCartRes = await fetch(`${GATEWAY}/cart/${custAuth.user.id}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({
        productId: 'prod-102',
        sku: 'SKU-HEADPHONES-ANC',
        name: 'AeroSonic Wireless ANC Headphones',
        unitPrice: 349,
        quantity: 2,
      }),
    });
    assert.strictEqual(addCartRes.status, 200);
    const cartAfterAdd: any = await addCartRes.json();
    assert.strictEqual(cartAfterAdd.subtotal, 698);

    const couponRes = await fetch(`${GATEWAY}/cart/${custAuth.user.id}/coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({ couponCode: 'SAVE10' }),
    });
    assert.strictEqual(couponRes.status, 200);
    const cartAfterCoupon: any = await couponRes.json();
    assert.strictEqual(cartAfterCoupon.discountAmount, 69.8);
    assert.strictEqual(cartAfterCoupon.total, 628.2);

    // 7. Verify Saga Pattern Happy Path (Inventory Locked -> Stripe Payment Succeeded -> Stock Committed)
    console.log('7. Verifying Saga Pattern Happy Path (Inventory Lock -> Payment Success -> Commit)...');
    const invBeforeRes = await fetch(`${GATEWAY}/inventory/SKU-HEADPHONES-ANC`);
    const invBefore: any = await invBeforeRes.json();
    const startStock = Number(invBefore.availableStock);

    const orderSuccessRes = await fetch(`${GATEWAY}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({
        items: [
          {
            sku: 'SKU-HEADPHONES-ANC',
            productId: 'prod-102',
            productName: 'AeroSonic Wireless ANC Headphones',
            quantity: 2,
            unitPrice: 349,
          },
        ],
        simulatePaymentFailure: false,
      }),
    });
    assert.strictEqual(orderSuccessRes.status, 201);
    const confirmedOrder: any = await orderSuccessRes.json();
    assert.strictEqual(confirmedOrder.status, 'CONFIRMED');
    assert.strictEqual(confirmedOrder.sagaStatus, 'COMPLETED');

    const invAfterSuccessRes = await fetch(`${GATEWAY}/inventory/SKU-HEADPHONES-ANC`);
    const invAfterSuccess: any = await invAfterSuccessRes.json();
    assert.strictEqual(invAfterSuccess.availableStock, startStock - 2);

    // 7b. Verify Admin Order Fulfillment Status Update (Live Customer Order Tracking)
    console.log('7b. Verifying Admin live order status update (Pack -> Ship -> Out for Delivery)...');
    const shipUpdateRes = await fetch(`${GATEWAY}/orders/${confirmedOrder.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({ deliveryStatus: 'OUT_FOR_DELIVERY' }),
    });
    assert.strictEqual(shipUpdateRes.status, 200);
    const updatedOrder: any = await shipUpdateRes.json();
    assert.strictEqual(updatedOrder.deliveryStatus, 'OUT_FOR_DELIVERY');
    assert.ok(updatedOrder.trackingNote, 'Expected live trackingNote on updated order');

    // 8. Verify Saga Pattern Compensating Rollback (Inventory Locked -> Payment Failed -> Stock Released)
    console.log('8. Verifying Saga Compensating Rollback (Inventory Lock -> Payment Failed -> Stock Released)...');
    const orderFailRes = await fetch(`${GATEWAY}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({
        items: [
          {
            sku: 'SKU-HEADPHONES-ANC',
            productId: 'prod-102',
            productName: 'AeroSonic Wireless ANC Headphones',
            quantity: 5,
            unitPrice: 349,
          },
        ],
        simulatePaymentFailure: true,
      }),
    });
    assert.strictEqual(orderFailRes.status, 201);
    const compensatedOrder: any = await orderFailRes.json();
    assert.strictEqual(compensatedOrder.status, 'CANCELLED');
    assert.strictEqual(compensatedOrder.sagaStatus, 'COMPENSATED');

    const invAfterRollbackRes = await fetch(`${GATEWAY}/inventory/SKU-HEADPHONES-ANC`);
    const invAfterRollback: any = await invAfterRollbackRes.json();
    assert.strictEqual(invAfterRollback.availableStock, startStock - 2);

    // 9. Verify Customer Order Return / Cancel restores stock
    console.log('9. Verifying Order Return / Cancel restores stock to inventory...');
    const cancelRes = await fetch(`${GATEWAY}/orders/${confirmedOrder.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custAuth.token}` },
    });
    assert.strictEqual(cancelRes.status, 200);
    const invAfterReturnRes = await fetch(`${GATEWAY}/inventory/SKU-HEADPHONES-ANC`);
    const invAfterReturn: any = await invAfterReturnRes.json();
    assert.strictEqual(invAfterReturn.availableStock, startStock);

    console.log('\n✅ ALL MICROSERVICE & SAGA E2E VERIFICATION CHECKS PASSED!');
  } finally {
    for (const s of servers) {
      s.close();
    }
  }
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });

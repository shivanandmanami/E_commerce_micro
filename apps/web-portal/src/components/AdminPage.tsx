// ============================================================================
// ADMIN PORTAL PAGE (Simple, Beginner-Friendly Component)
// Includes:
//   1. Store KPI Summary Cards + CSV Export Buttons (Orders CSV & Inventory CSV)
//   2. Customer Order Fulfillment Manager (Admin processes orders & sets live
//      status: Packing -> Shipped -> Out for Delivery -> Delivered -> Cancelled)
//   3. Visual Category Breakdown Bar Chart + New Product Creator
//   4. Product Editor & Inventory Stock Manager
// ============================================================================

import React, { useState } from 'react';
import {
  ALL_DEPARTMENTS,
  DeliveryStatus,
  downloadCsv,
  InventoryItem,
  Order,
  Product,
} from '../types';

export function AdminPage(props: {
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  categories: Array<{ key: string; count: number }>;
  onUpdateOrderStatus: (orderId: string, status: DeliveryStatus, note: string) => void;
  onRestock: (sku: string, currentTotal: number) => void;
  onCreateProduct: (prod: {
    sku: string;
    name: string;
    category: string;
    brand: string;
    price: number;
    description: string;
  }) => void;
  onEditProductPrice: (product: Product, newPrice: number) => void;
  onDeleteProduct: (productId: string) => void;
}) {
  const {
    products,
    inventory,
    orders,
    categories,
    onUpdateOrderStatus,
    onRestock,
    onCreateProduct,
    onEditProductPrice,
    onDeleteProduct,
  } = props;

  const [newProd, setNewProd] = useState({
    sku: 'SKU-NEW-500',
    name: 'AetherTech Pro Wireless Earbuds',
    category: 'Audio',
    brand: 'AetherTech',
    price: '199',
    description: 'Lossless spatial audio earbuds with 36-hour battery case.',
  });

  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const maxCategoryCount = Math.max(1, ...categories.map((c) => c.count));

  // Export all customer orders as a CSV spreadsheet
  function exportOrdersCsv() {
    const rows = [
      ['Order ID', 'Created At', 'Order Status', 'Delivery Stage', 'Total USD', 'Items'],
      ...orders.map((o) => [
        o.id,
        o.createdAt,
        o.status,
        o.deliveryStatus || o.status,
        o.totalAmount.toFixed(2),
        o.items.map((i) => `${i.quantity}x ${i.sku}`).join('; '),
      ]),
    ];
    downloadCsv('admin-all-orders.csv', rows);
  }

  // Export all inventory stock levels as a CSV spreadsheet
  function exportInventoryCsv() {
    const rows = [
      ['SKU', 'Product Name', 'Total Stock', 'Reserved Stock', 'Available Stock'],
      ...inventory.map((i) => [
        i.sku,
        i.productName,
        String(i.totalStock),
        String(i.reservedStock),
        String(i.availableStock),
      ]),
    ];
    downloadCsv('admin-inventory-stock.csv', rows);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreateProduct({
      ...newProd,
      price: Number(newProd.price),
    });
  }

  return (
    <div>
      {/* 1. Store KPI Summary Cards + CSV Export Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Seller Central — Store Operations & Order Fulfillment</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-amz-yellow" onClick={exportOrdersCsv}>
            📥 Export Orders CSV ({orders.length})
          </button>
          <button className="btn" onClick={exportInventoryCsv}>
            📥 Export Inventory CSV ({inventory.length})
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="text-muted">Confirmed GMV Revenue</div>
          <div className="kpi-value">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="text-muted">Total Orders</div>
          <div className="kpi-value">{orders.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-muted">Compensated / Cancelled</div>
          <div className="kpi-value">{cancelledOrders.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-muted">Active Catalog Products</div>
          <div className="kpi-value">{products.length}</div>
        </div>
      </div>

      {/* 2. Live Customer Order Fulfillment & Status Processing Panel */}
      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <h3>🚚 Process Customer Orders & Update Live Delivery Status</h3>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Click any stage button below to process an order. The customer&apos;s Order Tracking page
          updates immediately in real time!
        </p>

        {orders.length === 0 ? (
          <p className="text-muted">
            No customer orders yet. Place an order from the Storefront to process it here!
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Items</th>
                <th>Total</th>
                <th>Current Delivery Stage</th>
                <th>Process Order (Set Live Status for Customer)</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const stage = order.deliveryStatus || order.status;
                const isCancelled = order.status === 'CANCELLED' || stage === 'CANCELLED';

                return (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                      <div className="text-muted">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      {order.items.map((item) => (
                        <div key={item.sku}>
                          {item.quantity} × {item.productName}
                        </div>
                      ))}
                    </td>
                    <td>
                      <strong>${order.totalAmount.toFixed(2)}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${isCancelled ? 'badge-danger' : 'badge-success'}`}
                      >
                        {stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <button
                          className="btn"
                          disabled={isCancelled}
                          onClick={() =>
                            onUpdateOrderStatus(
                              order.id,
                              'PACKING_IN_WAREHOUSE',
                              'Items are being packed at Aetherzon Fulfillment Center'
                            )
                          }
                        >
                          📦 1. Pack
                        </button>
                        <button
                          className="btn"
                          disabled={isCancelled}
                          onClick={() =>
                            onUpdateOrderStatus(
                              order.id,
                              'SHIPPED_IN_TRANSIT',
                              'Package shipped via Prime Air Carrier'
                            )
                          }
                        >
                          🚚 2. Ship
                        </button>
                        <button
                          className="btn"
                          disabled={isCancelled}
                          onClick={() =>
                            onUpdateOrderStatus(
                              order.id,
                              'OUT_FOR_DELIVERY',
                              'Courier is out for delivery in your neighborhood'
                            )
                          }
                        >
                          🛵 3. Out for Delivery
                        </button>
                        <button
                          className="btn btn-amz-yellow"
                          disabled={isCancelled}
                          onClick={() =>
                            onUpdateOrderStatus(
                              order.id,
                              'DELIVERED',
                              'Delivered to customer front porch'
                            )
                          }
                        >
                          ✅ 4. Delivered
                        </button>
                        {!isCancelled && (
                          <button
                            className="btn"
                            onClick={() =>
                              onUpdateOrderStatus(
                                order.id,
                                'CANCELLED',
                                'Cancelled by Store Admin (Stock restored)'
                              )
                            }
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Category Breakdown Chart + New Product Creator */}
      <div className="admin-operations-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="panel">
          <h3>📊 Catalog & Department Breakdown Chart</h3>
          {categories.map((c) => {
            const widthPercent = Math.round((c.count / maxCategoryCount) * 100);
            return (
              <div key={c.key} className="amz-chart-row">
                <strong>{c.key}</strong>
                <div className="amz-chart-bar-bg">
                  <div
                    className="amz-chart-bar-fill"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="text-muted">{c.count} items</span>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3>➕ Add New Product to Catalog</h3>
          <form onSubmit={handleSubmit}>
            <input
              className="input"
              placeholder="SKU"
              value={newProd.sku}
              onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
            />
            <input
              className="input"
              placeholder="Product Name"
              value={newProd.name}
              onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
            />
            <select
              className="select"
              value={newProd.category}
              onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
            >
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Brand"
              value={newProd.brand}
              onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
            />
            <input
              className="input"
              placeholder="Price (USD)"
              type="number"
              value={newProd.price}
              onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
            />
            <button type="submit" className="btn btn-amz-yellow btn-block">
              Create Product
            </button>
          </form>
        </div>
      </div>

      {/* 4. Product Editor Table + Inventory Stock Manager */}
      <div className="admin-operations-grid">
        <div className="panel">
          <h3>🛠 Edit or Delete Catalog Products (Top 15)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 15).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="btn"
                      onClick={() => onEditProductPrice(p, Math.max(10, p.price - 20))}
                    >
                      -$20
                    </button>
                    <button
                      className="btn"
                      onClick={() => onEditProductPrice(p, p.price + 20)}
                    >
                      +$20
                    </button>
                    <button className="btn" onClick={() => onDeleteProduct(p.id)}>
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>📦 Inventory Stock Manager (Top 15 SKUs)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Available</th>
                <th>Restock</th>
              </tr>
            </thead>
            <tbody>
              {inventory.slice(0, 15).map((inv) => (
                <tr key={inv.sku}>
                  <td>{inv.sku}</td>
                  <td>{inv.productName}</td>
                  <td>{inv.availableStock}</td>
                  <td>
                    <button className="btn" onClick={() => onRestock(inv.sku, inv.totalStock)}>
                      +10 Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

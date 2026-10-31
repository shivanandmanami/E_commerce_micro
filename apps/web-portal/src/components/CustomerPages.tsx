// ============================================================================
// CUSTOMER PAGES (Simple, Beginner-Friendly Components)
// Contains:
//   1. ComparePage        (Side-by-Side Product Comparison Table)
//   2. WishlistPage       (Saved Items)
//   3. ProfilePage        (Saved Addresses Book & Saved Payment Wallet)
//   4. LoginPage          (Sign-In & Create New Account Page)
//   5. OrdersPage         (Live 5-Step Admin Fulfillment Bar + CSV Export)
//   6. InvoicePage        (Printable Order Receipt)
//   7. NotificationsPage  (Real-Time Activity & Order Notification Feed)
// ============================================================================

import React, { useState } from 'react';
import {
  DeliveryStatus,
  downloadCsv,
  Order,
  PageName,
  Product,
  SavedAddress,
  SavedCard,
} from '../types';

// ----------------------------------------------------------------------------
// 1. SIDE-BY-SIDE PRODUCT COMPARISON PAGE
// ----------------------------------------------------------------------------
export function ComparePage(props: {
  compareList: Product[];
  onAddToCart: (p: Product) => void;
  onRemoveCompare: (id: string) => void;
  onOpenProduct: (p: Product) => void;
  onBack: () => void;
}) {
  const { compareList, onAddToCart, onRemoveCompare, onOpenProduct, onBack } = props;

  if (compareList.length === 0) {
    return (
      <div className="panel">
        <h3>Compare Products Side-by-Side</h3>
        <p className="text-muted">
          You have no products selected for comparison. Click &quot;⚖&quot; on any product card!
        </p>
        <button className="btn btn-amz-yellow" onClick={onBack}>
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Side-by-Side Product Comparison ({compareList.length} items)</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Feature</th>
            {compareList.map((p) => (
              <th key={p.id}>
                <img
                  src={p.images?.[0]}
                  alt={p.name}
                  style={{ width: '110px', height: '80px', objectFit: 'cover', borderRadius: '6px' }}
                />
                <div className="amz-product-title" onClick={() => onOpenProduct(p)}>
                  {p.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Price</strong></td>
            {compareList.map((p) => (
              <td key={p.id}><strong>${p.price.toFixed(2)}</strong></td>
            ))}
          </tr>
          <tr>
            <td><strong>Category & Brand</strong></td>
            {compareList.map((p) => (
              <td key={p.id}>{p.category} • {p.brand}</td>
            ))}
          </tr>
          <tr>
            <td><strong>Customer Rating</strong></td>
            {compareList.map((p) => (
              <td key={p.id}>
                <span className="stars">★★★★★</span> {p.rating.toFixed(1)}
              </td>
            ))}
          </tr>
          <tr>
            <td><strong>Key Specs</strong></td>
            {compareList.map((p) => (
              <td key={p.id}>
                {Object.entries(p.attributes || {}).map(([k, v]) => (
                  <div key={k}>
                    <strong>{k}:</strong> {String(v)}
                  </div>
                ))}
              </td>
            ))}
          </tr>
          <tr>
            <td><strong>Actions</strong></td>
            {compareList.map((p) => (
              <td key={p.id}>
                <button
                  className="btn btn-amz-yellow"
                  onClick={() => onAddToCart(p)}
                  style={{ marginRight: '0.4rem' }}
                >
                  Add to Cart
                </button>
                <button className="btn" onClick={() => onRemoveCompare(p.id)}>
                  Remove
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 2. WISHLIST / SAVED ITEMS PAGE
// ----------------------------------------------------------------------------
export function WishlistPage(props: {
  wishlist: Product[];
  onMoveToCart: (p: Product) => void;
  onRemove: (p: Product) => void;
  onOpenProduct: (p: Product) => void;
  onBack: () => void;
}) {
  const { wishlist, onMoveToCart, onRemove, onOpenProduct, onBack } = props;

  return (
    <div className="panel">
      <h3>Your Saved Wishlist ({wishlist.length} items)</h3>
      {wishlist.length === 0 ? (
        <div>
          <p className="text-muted">You haven&apos;t saved any items to your Wishlist yet.</p>
          <button className="btn btn-amz-yellow" onClick={onBack}>
            Explore Products
          </button>
        </div>
      ) : (
        <div className="amz-product-grid">
          {wishlist.map((item) => (
            <div key={item.id} className="amz-product-card">
              <div className="amz-product-img-wrap" onClick={() => onOpenProduct(item)}>
                <img src={item.images?.[0]} alt={item.name} />
              </div>
              <div className="amz-product-body">
                <h4 className="amz-product-title" onClick={() => onOpenProduct(item)}>
                  {item.name}
                </h4>
                <div className="amz-price-block">
                  <span className="amz-price-symbol">$</span>
                  <span className="amz-price-whole">{item.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="amz-card-actions">
                <button className="btn btn-amz-yellow btn-block" onClick={() => onMoveToCart(item)}>
                  Move to Cart
                </button>
                <button className="btn btn-block" onClick={() => onRemove(item)}>
                  Remove from Wishlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. CUSTOMER PROFILE PAGE: SAVED ADDRESSES BOOK & PAYMENT WALLET
// ----------------------------------------------------------------------------
export function ProfilePage(props: {
  savedAddresses: SavedAddress[];
  activeAddressId: string;
  onSelectAddress: (addr: SavedAddress) => void;
  onAddAddress: (addr: SavedAddress) => void;
  savedCards: SavedCard[];
  activeCardId: string;
  onSelectCard: (id: string) => void;
  onAddCard: (card: SavedCard) => void;
}) {
  const [newAddr, setNewAddr] = useState({
    label: 'Office',
    recipientName: 'Alex Rivera',
    street: '500 Tech Parkway',
    city: 'Austin',
    postalCode: '78701',
  });

  const [newCard, setNewCard] = useState({
    brand: 'Mastercard',
    last4: '5544',
    expiry: '11/28',
    cardholder: 'Alex Rivera',
  });

  return (
    <div className="admin-operations-grid">
      {/* Left: Saved Addresses Book */}
      <div className="panel">
        <h3>📍 Your Saved Addresses Book</h3>
        {props.savedAddresses.map((addr) => {
          const isActive = addr.id === props.activeAddressId;
          return (
            <div
              key={addr.id}
              className={`amz-payment-option ${isActive ? 'selected' : ''}`}
              onClick={() => props.onSelectAddress(addr)}
            >
              <input type="radio" checked={isActive} readOnly />
              <div>
                <strong>
                  {addr.label}: {addr.recipientName}
                </strong>
                <div className="text-muted">
                  {addr.street}, {addr.city} {addr.postalCode}
                </div>
              </div>
            </div>
          );
        })}

        <h4 style={{ marginTop: '1.25rem' }}>Add a New Delivery Address</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onAddAddress({ id: `addr-${Date.now()}`, ...newAddr });
          }}
        >
          <input
            className="input"
            placeholder="Label (Home, Office, Parents)"
            value={newAddr.label}
            onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
          />
          <input
            className="input"
            placeholder="Recipient Name"
            value={newAddr.recipientName}
            onChange={(e) => setNewAddr({ ...newAddr, recipientName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Street Address"
            value={newAddr.street}
            onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="City"
              value={newAddr.city}
              onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
            />
            <input
              className="input"
              placeholder="Postal Code"
              value={newAddr.postalCode}
              onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-amz-yellow btn-block">
            Save Address
          </button>
        </form>
      </div>

      {/* Right: Saved Payment Wallet */}
      <div className="panel">
        <h3>💳 Your Saved Payment Wallet</h3>
        {props.savedCards.map((card) => {
          const isActive = card.id === props.activeCardId;
          return (
            <div
              key={card.id}
              className={`amz-payment-option ${isActive ? 'selected' : ''}`}
              onClick={() => props.onSelectCard(card.id)}
            >
              <input type="radio" checked={isActive} readOnly />
              <div>
                <strong>
                  {card.brand} ending in •••• {card.last4}
                </strong>
                <div className="text-muted">
                  Cardholder: {card.cardholder} • Expires {card.expiry}
                </div>
              </div>
            </div>
          );
        })}

        <h4 style={{ marginTop: '1.25rem' }}>Add a New Payment Card</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onAddCard({ id: `card-${Date.now()}`, ...newCard });
          }}
        >
          <select
            className="select"
            value={newCard.brand}
            onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
          >
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="Amex">American Express</option>
          </select>
          <input
            className="input"
            placeholder="Cardholder Name"
            value={newCard.cardholder}
            onChange={(e) => setNewCard({ ...newCard, cardholder: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="Last 4 Digits (e.g. 9911)"
              maxLength={4}
              value={newCard.last4}
              onChange={(e) => setNewCard({ ...newCard, last4: e.target.value })}
            />
            <input
              className="input"
              placeholder="Expiry (MM/YY)"
              value={newCard.expiry}
              onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-amz-yellow btn-block">
            Add Card to Wallet
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 4. DEDICATED LOGIN & CREATE ACCOUNT PAGE
// ----------------------------------------------------------------------------
export function LoginPage(props: {
  onLoginSuccess: (
    token: string,
    user: { id: string; fullName: string; role: 'customer' | 'admin' }
  ) => void;
  onQuickDemoLogin: (role: 'customer' | 'admin') => void;
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('customer@ecommerce.local');
  const [password, setPassword] = useState('customer123');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Authentication failed');
      return;
    }

    props.onLoginSuccess(data.token, data.user);
  }

  return (
    <div className="panel" style={{ maxWidth: '420px', margin: '1rem auto' }}>
      <h3>{isRegister ? 'Create Your Aetherzon Account' : 'Sign-In to Aetherzon'}</h3>
      {errorMsg && <div className="order-failure-reason">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            className="input"
            placeholder="Your Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-amz-yellow btn-block">
          {isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button className="link-btn" onClick={() => setIsRegister(!isRegister)}>
          {isRegister
            ? 'Already have an account? Sign In'
            : 'New customer? Create an account'}
        </button>
      </div>

      <hr className="amz-pdp-divider" />
      <div className="text-muted" style={{ marginBottom: '0.5rem' }}>
        One-Click Demo Logins:
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-block" onClick={() => props.onQuickDemoLogin('customer')}>
          Customer Demo
        </button>
        <button className="btn btn-block" onClick={() => props.onQuickDemoLogin('admin')}>
          Admin Demo
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 5. ORDERS & LIVE 5-STEP FULFILLMENT TRACKER (UPDATED LIVE BY ADMIN)
// ----------------------------------------------------------------------------
const FULFILLMENT_STAGES: DeliveryStatus[] = [
  'ORDER_CONFIRMED',
  'PACKING_IN_WAREHOUSE',
  'SHIPPED_IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export function OrdersPage(props: {
  orders: Order[];
  onCancelOrder: (orderId: string) => void;
  onViewInvoice: (order: Order) => void;
  onRefreshLive: () => void;
}) {
  const { orders, onCancelOrder, onViewInvoice, onRefreshLive } = props;

  function handleExportOrdersCsv() {
    const rows = [
      ['Order ID', 'Date', 'Payment Status', 'Delivery Stage', 'Total USD'],
      ...orders.map((o) => [
        o.id,
        o.createdAt,
        o.status,
        o.deliveryStatus || o.status,
        o.totalAmount.toFixed(2),
      ]),
    ];
    downloadCsv('my-orders.csv', rows);
  }

  return (
    <div className="panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0 }}>
          Your Orders & Live Fulfillment Tracker (Updated Live by Admin)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={onRefreshLive}>
            🔄 Refresh Live Status
          </button>
          {orders.length > 0 && (
            <button className="btn btn-amz-yellow" onClick={handleExportOrdersCsv}>
              📥 Export Orders CSV
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted">No orders placed yet.</p>
      ) : (
        orders.map((order) => {
          const isCancelled =
            order.status === 'CANCELLED' || order.deliveryStatus === 'CANCELLED';
          const currentStage: DeliveryStatus =
            order.deliveryStatus || (isCancelled ? 'CANCELLED' : 'ORDER_CONFIRMED');
          const stageIndex = FULFILLMENT_STAGES.indexOf(currentStage);

          return (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong>
                  <span className="order-timestamp">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${!isCancelled ? 'badge-success' : 'badge-danger'}`}>
                    Delivery: {currentStage.replace(/_/g, ' ')}
                  </span>
                  <span className="badge">Saga: {order.sagaStatus}</span>
                  <strong>${order.totalAmount.toFixed(2)}</strong>
                  <button className="btn" onClick={() => onViewInvoice(order)}>
                    🧾 Invoice
                  </button>
                  {!isCancelled && currentStage !== 'DELIVERED' && (
                    <button className="btn" onClick={() => onCancelOrder(order.id)}>
                      ↩ Cancel / Return Order
                    </button>
                  )}
                </div>
              </div>

              <div className="order-body">
                {/* 5-Stage Live Fulfillment Bar controlled by Admin */}
                <div className="amz-tracking-bar">
                  {[
                    { key: 'ORDER_CONFIRMED', label: '1. Order Confirmed' },
                    { key: 'PACKING_IN_WAREHOUSE', label: '2. Packing in Warehouse' },
                    { key: 'SHIPPED_IN_TRANSIT', label: '3. Shipped in Transit' },
                    { key: 'OUT_FOR_DELIVERY', label: '4. Out for Delivery' },
                    { key: 'DELIVERED', label: '5. Delivered' },
                  ].map((step, idx) => {
                    const isStepDone = !isCancelled && stageIndex >= idx;
                    return (
                      <div
                        key={step.key}
                        className={`amz-tracking-step ${
                          isCancelled ? 'cancelled' : isStepDone ? 'done' : ''
                        }`}
                      >
                        {isCancelled && idx === 4 ? '❌ Order Cancelled' : step.label}
                      </div>
                    );
                  })}
                </div>

                {order.trackingNote && (
                  <div className="text-stock" style={{ marginBottom: '0.5rem' }}>
                    🚚 Latest Store Update: {order.trackingNote}
                  </div>
                )}

                {order.items.map((item) => (
                  <div key={item.sku}>
                    <strong>{item.productName}</strong> — Qty: {item.quantity} × $
                    {item.unitPrice.toFixed(2)}
                  </div>
                ))}

                {order.failureReason && (
                  <div className="order-failure-reason">{order.failureReason}</div>
                )}

                <div className="saga-trail-section">
                  <div className="saga-trail-heading">Kafka Saga & Admin Fulfillment Trail:</div>
                  {(order.sagaHistory || []).map((step) => (
                    <span key={step.id} className="badge">
                      {step.step} → {step.eventType}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 6. PRINTABLE ORDER INVOICE / RECEIPT PAGE
// ----------------------------------------------------------------------------
export function InvoicePage(props: {
  order: Order | null;
  customerName: string;
  addressText: string;
  onBack: () => void;
}) {
  const { order, customerName, addressText, onBack } = props;
  if (!order) return null;

  return (
    <div className="amz-invoice-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>aetherzon.prime — Official Order Invoice</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-amz-yellow" onClick={() => window.print()}>
            🖨 Print Invoice
          </button>
          <button className="btn" onClick={onBack}>
            Back to Orders
          </button>
        </div>
      </div>
      <hr className="amz-pdp-divider" />
      <p>
        <strong>Order ID:</strong> {order.id}
        <br />
        <strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString()}
        <br />
        <strong>Customer:</strong> {customerName}
        <br />
        <strong>Shipping Address:</strong> {addressText}
        <br />
        <strong>Status:</strong> {order.status} ({order.deliveryStatus || order.sagaStatus})
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.sku}>
              <td>{i.sku}</td>
              <td>{i.productName}</td>
              <td>{i.quantity}</td>
              <td>${i.unitPrice.toFixed(2)}</td>
              <td>${(i.quantity * i.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ textAlign: 'right', marginTop: '1rem' }}>
        Total Paid: ${order.totalAmount.toFixed(2)}
      </h3>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 7. REAL-TIME NOTIFICATION FEED PAGE
// ----------------------------------------------------------------------------
export function NotificationsPage(props: {
  notifications: Array<{ id: string; text: string; time: string }>;
  onClear: () => void;
  onNavigate: (p: PageName) => void;
}) {
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>🔔 Real-Time Store & Saga Notifications ({props.notifications.length})</h3>
        <button className="btn" onClick={props.onClear}>
          Clear Notifications
        </button>
      </div>
      {props.notifications.length === 0 ? (
        <p className="text-muted">No recent notifications.</p>
      ) : (
        props.notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '0.65rem 0',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{n.text}</span>
            <span className="text-muted">{n.time}</span>
          </div>
        ))
      )}
    </div>
  );
}

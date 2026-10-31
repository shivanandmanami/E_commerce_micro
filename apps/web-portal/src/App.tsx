// ============================================================================
// MAIN APPLICATION (Simple, Beginner-Friendly React Code)
// Connects the Amazon-style Storefront, Product Detail Page, Cart Page,
// Payment Page, and the modular Customer & Admin Pages.
// ============================================================================

import React, { useEffect, useState } from 'react';
import './styles/base.css';
import './styles/header.css';
import './styles/storefront.css';
import './styles/product-detail.css';
import './styles/cart.css';
import './styles/payment.css';
import './styles/orders.css';
import './styles/admin.css';

import {
  ALL_DEPARTMENTS,
  Cart,
  DeliveryStatus,
  InventoryItem,
  Order,
  PageName,
  Product,
  SavedAddress,
  SavedCard,
} from './types';
import {
  ComparePage,
  InvoicePage,
  LoginPage,
  NotificationsPage,
  OrdersPage,
  ProfilePage,
  WishlistPage,
} from './components/CustomerPages';
import { AdminPage } from './components/AdminPage';

const ITEMS_PER_PAGE = 20;

export function App() {
  // 1. Page Navigation State
  const [page, setPage] = useState<PageName>('storefront');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [qtyToBuy, setQtyToBuy] = useState(1);

  // 2. Logged-in User State
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [token, setToken] = useState('');
  const [user, setUser] = useState({
    id: '11111111-1111-4111-8111-111111111111',
    fullName: 'Alex Rivera',
  });

  // 3. Search & Filter State
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);

  // 4. Products & Facet Counts
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ key: string; count: number }>>([]);
  const [brands, setBrands] = useState<Array<{ key: string; count: number }>>([]);
  const [priceRanges, setPriceRanges] = useState<
    Array<{ label: string; min: number; max: number | null; count: number }>
  >([]);

  // 5. Wishlist, Compare, Recently Viewed, Notifications & Flash Timer State
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; text: string; time: string }>
  >([
    {
      id: 'init-1',
      text: 'Welcome to Aetherzon! Use coupon SAVE10 or VIP20 at checkout.',
      time: 'Just now',
    },
  ]);
  const [flashSeconds, setFlashSeconds] = useState(3 * 3600 + 42 * 60 + 19);

  // 6. Product Reviews, Cart, Payment, Orders & Inventory State
  const [customReviews, setCustomReviews] = useState<
    Record<string, Array<{ author: string; stars: number; comment: string }>>
  >({});
  const [reviewInput, setReviewInput] = useState({ stars: 5, comment: '' });
  const [cart, setCart] = useState<Cart>({ items: [], discountAmount: 0, subtotal: 0, total: 0 });
  const [couponInput, setCouponInput] = useState('');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [address, setAddress] = useState({
    recipientName: 'Alex Rivera',
    street: '742 Evergreen Terrace',
    city: 'San Francisco',
    postalCode: '94107',
  });
  const [darkMode, setDarkMode] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: 'addr-1',
      label: 'Home (Default)',
      recipientName: 'Alex Rivera',
      street: '742 Evergreen Terrace',
      city: 'San Francisco',
      postalCode: '94107',
    },
    {
      id: 'addr-2',
      label: 'Office HQ',
      recipientName: 'Alex Rivera',
      street: '500 Howard Street, Suite 400',
      city: 'San Francisco',
      postalCode: '94105',
    },
  ]);
  const [activeAddressId, setActiveAddressId] = useState('addr-1');
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    { id: 'card-1', brand: 'Visa', last4: '4242', expiry: '08/28', cardholder: 'Alex Rivera' },
    { id: 'card-2', brand: 'Mastercard', last4: '8899', expiry: '11/27', cardholder: 'Alex Rivera' },
  ]);
  const [activeCardId, setActiveCardId] = useState('card-1');
  const [bannerMessage, setBannerMessage] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Toggle Dark Mode class on <body>
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Helper: Add a notification to the bell feed and show a banner
  function notify(text: string) {
    setBannerMessage(text);
    setNotifications((prev) => [
      { id: String(Date.now()), text, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  }

  // Helper: Attach JWT token to API calls
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // Live Flash Deal Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSeconds((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}h : ${m}m : ${s}s`;
  };

  // Log in as Demo Customer or Admin
  async function loginAs(targetRole: 'customer' | 'admin') {
    const email = targetRole === 'admin' ? 'admin@ecommerce.local' : 'customer@ecommerce.local';
    const password = targetRole === 'admin' ? 'admin123' : 'customer123';

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      setRole(targetRole);
    }
  }

  // Load filtered products from Search Service
  async function loadProducts() {
    const params = new URLSearchParams();
    if (searchText) params.set('q', searchText);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (minPrice !== undefined) params.set('minPrice', String(minPrice));
    if (maxPrice !== undefined) params.set('maxPrice', String(maxPrice));
    if (minRating !== undefined) params.set('minRating', String(minRating));
    if (inStockOnly) params.set('inStock', 'true');
    if (onlyDeals) params.set('onlyDeals', 'true');
    if (sortBy) params.set('sort', sortBy);

    const res = await fetch(`/api/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.hits || []);
      setCategories(data.facets?.categories || []);
      setBrands(data.facets?.brands || []);
      setPriceRanges(data.facets?.priceRanges || []);
      setCurrentPage(1);
    }
  }

  // Load Cart, Orders, and Inventory
  async function loadUserData() {
    const cartRes = await fetch(`/api/cart/${user.id}`, { headers: getHeaders() });
    if (cartRes.ok) setCart(await cartRes.json());

    if (token) {
      const ordersRes = await fetch('/api/orders', { headers: getHeaders() });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.items || []);
      }
    }

    const invRes = await fetch('/api/inventory');
    if (invRes.ok) {
      const data = await invRes.json();
      setInventory(data.items || []);
    }
  }

  useEffect(() => {
    loginAs('customer');
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedBrand, minPrice, maxPrice, minRating, inStockOnly, onlyDeals, sortBy]);

  useEffect(() => {
    loadUserData();
  }, [token, page]);

  // Auto-refresh orders every 4 seconds on the Orders or Admin page so live status updates appear immediately
  useEffect(() => {
    if (page !== 'orders' && page !== 'admin') return;
    const poll = setInterval(() => {
      loadUserData();
    }, 4000);
    return () => clearInterval(poll);
  }, [page, token]);

  // Reset all search filters
  function resetAllFilters() {
    setSearchText('');
    setSelectedCategory('');
    setSelectedBrand('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setInStockOnly(false);
    setOnlyDeals(false);
    setSortBy('relevance');
  }

  // Open Product Detail Page & add to "Recently Viewed"
  function openProductPage(product: Product) {
    setSelectedProduct(product);
    setQtyToBuy(1);
    setRecentlyViewed((prev) => [product, ...prev.filter((p) => p.id !== product.id)].slice(0, 4));
    setPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Toggle product in Wishlist
  function toggleWishlist(product: Product) {
    const exists = wishlist.some((p) => p.id === product.id);
    if (exists) {
      setWishlist(wishlist.filter((p) => p.id !== product.id));
      notify(`Removed "${product.name}" from Wishlist.`);
    } else {
      setWishlist([...wishlist, product]);
      notify(`Saved "${product.name}" to your Wishlist!`);
    }
  }

  // Toggle product in Compare list (up to 4 items)
  function toggleCompare(product: Product) {
    const exists = compareList.some((p) => p.id === product.id);
    if (exists) {
      setCompareList(compareList.filter((p) => p.id !== product.id));
      notify(`Removed "${product.name}" from comparison.`);
    } else {
      if (compareList.length >= 4) {
        notify('You can compare up to 4 products at a time.');
        return;
      }
      setCompareList([...compareList, product]);
      notify(`Added "${product.name}" to Product Comparison!`);
    }
  }

  // Add item to Cart
  async function addToCart(product: Product, quantity = 1, nextPage?: PageName) {
    const res = await fetch(`/api/cart/${user.id}/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.price,
        quantity,
        image: product.images?.[0],
      }),
    });
    if (res.ok) {
      setCart(await res.json());
      notify(`Added ${quantity} × "${product.name}" to your Cart.`);
      if (nextPage) setPage(nextPage);
    }
  }

  // Change item quantity in Cart
  async function changeCartQty(sku: string, newQty: number) {
    const res = await fetch(`/api/cart/${user.id}/items/${sku}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ quantity: newQty }),
    });
    if (res.ok) setCart(await res.json());
  }

  // Clear entire Cart
  async function clearCart() {
    const res = await fetch(`/api/cart/${user.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (res.ok) setCart(await res.json());
  }

  // Apply coupon code
  async function applyCouponCode() {
    const res = await fetch(`/api/cart/${user.id}/coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ couponCode: couponInput }),
    });
    const data = await res.json();
    if (res.ok) {
      setCart(data);
      notify(`Promo coupon ${couponInput.toUpperCase()} applied!`);
    } else {
      notify(data.message || 'Invalid coupon');
    }
  }

  // Place Order & Pay (triggers Kafka Inventory & Stripe Saga)
  async function placeOrderAndPay() {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId: user.id,
        shippingAddress: { ...address, state: 'CA', country: 'US' },
        items: cart.items.map((item) => ({
          sku: item.sku,
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        simulatePaymentFailure: simulateDecline,
      }),
    });

    if (res.ok) {
      const order: Order = await res.json();
      await clearCart();
      await loadUserData();
      setPage('orders');
      notify(
        order.status === 'CONFIRMED'
          ? `Order #${order.id.slice(0, 8)} CONFIRMED! Stock deducted & Stripe payment succeeded.`
          : `Order #${order.id.slice(0, 8)} CANCELLED! Payment failed, so Saga released the locked stock.`
      );
    }
  }

  // Cancel / Return Order & Restore Stock
  async function cancelOrderAndRestoreStock(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (res.ok) {
      await loadUserData();
      notify(`Order #${orderId.slice(0, 8)} returned & stock restored to inventory!`);
    }
  }

  // Admin: Process order & update live delivery status for the customer
  async function updateOrderFulfillmentStatus(orderId: string, deliveryStatus: DeliveryStatus) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ deliveryStatus }),
    });
    if (res.ok) {
      await loadUserData();
      notify(`Order #${orderId.slice(0, 8)} updated to ${deliveryStatus.replace(/_/g, ' ')}!`);
    }
  }

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="page-wrapper">
      {/* ====================================================================
          TOP AMAZON HEADER & SEARCH BAR
      ==================================================================== */}
      <header className="amz-header">
        <div
          className="amz-logo-box"
          onClick={() => {
            resetAllFilters();
            setPage('storefront');
          }}
        >
          <span className="amz-logo-text">aetherzon</span>
          <span className="amz-logo-domain">.prime</span>
        </div>

        <div
          className="amz-deliver-box"
          style={{ cursor: 'pointer' }}
          onClick={() => setPage('profile')}
          title="Click to manage saved addresses & payment wallet"
        >
          <span className="amz-deliver-line1">Deliver to {address.recipientName}</span>
          <span className="amz-deliver-line2">
            📍 {address.city} {address.postalCode}
          </span>
        </div>

        {/* Search Bar */}
        <form
          className="amz-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            loadProducts();
            setPage('storefront');
          }}
        >
          <select
            className="amz-search-category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage('storefront');
            }}
          >
            <option value="">All 10 Departments</option>
            {ALL_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <input
            className="amz-search-input"
            placeholder="Search 250+ products, brands, specs, or SKU..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button type="submit" className="amz-search-submit">
            🔍
          </button>
        </form>

        <button className="amz-nav-item" onClick={() => setPage('login')}>
          <span className="amz-nav-line1">Hello, {user.fullName}</span>
          <span className="amz-nav-line2">Account & Login ({role.toUpperCase()})</span>
        </button>

        <button className="amz-nav-item" onClick={() => setPage('profile')}>
          <span className="amz-nav-line1">Addresses</span>
          <span className="amz-nav-line2">& Wallet</span>
        </button>

        <button className="amz-nav-item" onClick={() => setPage('compare')}>
          <span className="amz-nav-line1">Side-by-Side</span>
          <span className="amz-nav-line2">⚖ Compare ({compareList.length})</span>
        </button>

        <button className="amz-nav-item" onClick={() => setPage('wishlist')}>
          <span className="amz-nav-line1">Saved</span>
          <span className="amz-nav-line2">♡ Wishlist ({wishlist.length})</span>
        </button>

        <button className="amz-nav-item" onClick={() => setPage('notifications')}>
          <span className="amz-nav-line1">Alerts</span>
          <span className="amz-nav-line2">🔔 ({notifications.length})</span>
        </button>

        <button className="amz-nav-item" onClick={() => setPage('orders')}>
          <span className="amz-nav-line1">Returns</span>
          <span className="amz-nav-line2">& Orders ({orders.length})</span>
        </button>

        <button
          className="amz-nav-item"
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle Dark / Light Mode"
        >
          <span className="amz-nav-line1">Theme</span>
          <span className="amz-nav-line2">{darkMode ? '☀️ Light' : '🌙 Dark'}</span>
        </button>

        <button className="amz-cart-button" onClick={() => setPage('cart')}>
          <span className="amz-cart-count">{cartCount}</span>
          <span className="amz-nav-line2">Cart</span>
        </button>
      </header>

      {/* Secondary Category & Page Navigation Bar */}
      <nav className="amz-subnav">
        <button
          className={`amz-subnav-link ${page === 'storefront' && !selectedCategory ? 'active' : ''}`}
          onClick={() => {
            resetAllFilters();
            setPage('storefront');
          }}
        >
          ☰ All 250+ Products
        </button>
        {ALL_DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            className={`amz-subnav-link ${selectedCategory === dept ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(dept);
              setPage('storefront');
            }}
          >
            {dept}
          </button>
        ))}
        <button
          className={`amz-subnav-link ${onlyDeals ? 'active' : ''}`}
          onClick={() => {
            setOnlyDeals(!onlyDeals);
            setPage('storefront');
          }}
        >
          🔥 Flash Deals
        </button>
        <button
          className={`amz-subnav-link ${page === 'profile' ? 'active' : ''}`}
          onClick={() => setPage('profile')}
        >
          📍 Profile & Wallet
        </button>
        <button
          className={`amz-subnav-link ${page === 'admin' ? 'active' : ''}`}
          onClick={() => {
            loginAs('admin');
            setPage('admin');
          }}
        >
          Admin Portal
        </button>
      </nav>

      {/* Results & Sort Bar */}
      {page === 'storefront' && (
        <div className="amz-results-bar">
          <div>
            Showing{' '}
            <strong>
              {products.length === 0
                ? 0
                : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    products.length
                  )}`}
            </strong>{' '}
            of <strong>{products.length}</strong> products
            {selectedCategory ? ` in ${selectedCategory}` : ''}
            {selectedBrand ? ` by ${selectedBrand}` : ''}
          </div>

          <div>
            Sort by:{' '}
            <select
              className="amz-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevance">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Avg. Customer Rating</option>
              <option value="reviews_desc">Most Reviewed</option>
            </select>
          </div>
        </div>
      )}

      <div className="main-container">
        {bannerMessage && (
          <div className="status-banner">
            <span>{bannerMessage}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {cartCount > 0 && page !== 'cart' && (
                <button className="btn btn-amz-yellow" onClick={() => setPage('cart')}>
                  View Cart ({cartCount})
                </button>
              )}
              <button className="btn" onClick={() => setBannerMessage('')}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            PAGE 1: STOREFRONT + FLASH DEAL BANNER + FILTERS + RECENTLY VIEWED
        ==================================================================== */}
        {page === 'storefront' && (
          <>
            {/* Flash Deal Countdown Banner */}
            <div className="amz-flash-banner">
              <div>
                <strong style={{ fontSize: '1.15rem' }}>
                  ⚡ Aetherzon Lightning Flash Deals — Up to 20% Off + Extra Coupon SAVE10
                </strong>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Free next-day Prime shipping on all 10 departments
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="amz-flash-timer">Ends in {formatTimer(flashSeconds)}</span>
                <button
                  className="btn btn-amz-yellow"
                  onClick={() => setOnlyDeals(!onlyDeals)}
                >
                  {onlyDeals ? 'Show All Products' : 'Shop Flash Deals'}
                </button>
              </div>
            </div>

            <div className="amz-catalog-layout">
              {/* Left Filter Sidebar */}
              <aside className="amz-sidebar">
                <div className="amz-facet-group">
                  <button className="btn btn-block" onClick={resetAllFilters}>
                    ↺ Reset All Filters
                  </button>
                </div>

                <div className="amz-facet-group">
                  <div className="amz-facet-title">Deals & Availability</div>
                  <label className="amz-checkbox-row">
                    <input
                      type="checkbox"
                      checked={onlyDeals}
                      onChange={(e) => setOnlyDeals(e.target.checked)}
                    />
                    <span>Flash Deals Only</span>
                  </label>
                  <label className="amz-checkbox-row">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    <span>In Stock Only</span>
                  </label>
                </div>

                <div className="amz-facet-group">
                  <div className="amz-facet-title">Department</div>
                  <button
                    className={`amz-facet-option ${selectedCategory === '' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('')}
                  >
                    <span>All Departments</span>
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      className={`amz-facet-option ${selectedCategory === c.key ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(c.key)}
                    >
                      <span>{c.key}</span>
                      <span className="text-muted">({c.count})</span>
                    </button>
                  ))}
                </div>

                <div className="amz-facet-group">
                  <div className="amz-facet-title">Customer Review</div>
                  <button
                    className={`amz-facet-option ${minRating === undefined ? 'active' : ''}`}
                    onClick={() => setMinRating(undefined)}
                  >
                    <span>Any Rating</span>
                  </button>
                  <button
                    className={`amz-facet-option ${minRating === 4.5 ? 'active' : ''}`}
                    onClick={() => setMinRating(4.5)}
                  >
                    <span className="stars">★★★★★</span>
                    <span>4.5 & Up</span>
                  </button>
                  <button
                    className={`amz-facet-option ${minRating === 4.0 ? 'active' : ''}`}
                    onClick={() => setMinRating(4.0)}
                  >
                    <span className="stars">★★★★☆</span>
                    <span>4.0 & Up</span>
                  </button>
                </div>

                <div className="amz-facet-group">
                  <div className="amz-facet-title">Price Range</div>
                  <button
                    className={`amz-facet-option ${
                      minPrice === undefined && maxPrice === undefined ? 'active' : ''
                    }`}
                    onClick={() => {
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                    }}
                  >
                    <span>Any Price</span>
                  </button>
                  {priceRanges.map((r) => (
                    <button
                      key={r.label}
                      className={`amz-facet-option ${minPrice === r.min ? 'active' : ''}`}
                      onClick={() => {
                        setMinPrice(r.min);
                        setMaxPrice(r.max ?? undefined);
                      }}
                    >
                      <span>{r.label}</span>
                      <span className="text-muted">({r.count})</span>
                    </button>
                  ))}
                </div>

                <div className="amz-facet-group">
                  <div className="amz-facet-title">Brand</div>
                  <button
                    className={`amz-facet-option ${selectedBrand === '' ? 'active' : ''}`}
                    onClick={() => setSelectedBrand('')}
                  >
                    <span>All Brands</span>
                  </button>
                  {brands.slice(0, 12).map((b) => (
                    <button
                      key={b.key}
                      className={`amz-facet-option ${selectedBrand === b.key ? 'active' : ''}`}
                      onClick={() => setSelectedBrand(b.key)}
                    >
                      <span>{b.key}</span>
                      <span className="text-muted">({b.count})</span>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Right Product Grid */}
              <main>
                <div className="amz-product-grid">
                  {paginatedProducts.map((product) => {
                    const isSaved = wishlist.some((w) => w.id === product.id);
                    const isCompared = compareList.some((c) => c.id === product.id);
                    const isDeal = product.tags?.includes('deal');

                    return (
                      <div key={product.id} className="amz-product-card">
                        <div>
                          <div
                            className="amz-product-img-wrap"
                            onClick={() => openProductPage(product)}
                          >
                            <img src={product.images?.[0]} alt={product.name} />
                          </div>
                          <div className="amz-product-body">
                            {isDeal && <span className="amz-deal-badge">Limited Time Deal</span>}
                            <span className="badge badge-prime">✓ prime</span>
                            <span className="badge">{product.category}</span>

                            <h4
                              className="amz-product-title"
                              onClick={() => openProductPage(product)}
                            >
                              {product.name}
                            </h4>

                            <div className="amz-rating-row">
                              <span className="stars">★★★★★</span>
                              <span>
                                {product.rating.toFixed(1)} ({product.reviewCount || 45})
                              </span>
                            </div>

                            <div className="amz-price-block">
                              <span className="amz-price-symbol">$</span>
                              <span className="amz-price-whole">{product.price.toFixed(2)}</span>
                            </div>

                            <div className={product.inStock ? 'text-stock' : 'order-failure-reason'}>
                              {product.inStock
                                ? 'In Stock — FREE Delivery Tomorrow'
                                : 'Out of Stock'}
                            </div>
                          </div>
                        </div>

                        <div className="amz-card-actions">
                          <button
                            className="btn btn-amz-yellow btn-block"
                            disabled={!product.inStock}
                            onClick={() => addToCart(product, 1)}
                          >
                            {product.inStock ? 'Add to Cart' : 'Unavailable'}
                          </button>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-block"
                              onClick={() => openProductPage(product)}
                            >
                              Details
                            </button>
                            <button
                              className="btn"
                              title="Compare Product"
                              onClick={() => toggleCompare(product)}
                            >
                              {isCompared ? '⚖✓' : '⚖'}
                            </button>
                            <button
                              className="btn"
                              title="Save to Wishlist"
                              onClick={() => toggleWishlist(product)}
                            >
                              {isSaved ? '♥' : '♡'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Bar */}
                {totalPages > 1 && (
                  <div className="amz-pagination">
                    <button
                      className="btn"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        setCurrentPage(currentPage - 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ‹ Previous Page
                    </button>
                    <span>
                      Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                      {products.length} products)
                    </span>
                    <button
                      className="btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        setCurrentPage(currentPage + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Next Page ›
                    </button>
                  </div>
                )}

                {/* Recently Viewed Products Strip */}
                {recentlyViewed.length > 0 && (
                  <div className="amz-recently-viewed">
                    <h3>🕒 Your Recently Viewed Items</h3>
                    <div className="amz-product-grid">
                      {recentlyViewed.map((rv) => (
                        <div key={rv.id} className="amz-product-card">
                          <div
                            className="amz-product-img-wrap"
                            onClick={() => openProductPage(rv)}
                          >
                            <img src={rv.images?.[0]} alt={rv.name} />
                          </div>
                          <div className="amz-product-body">
                            <h4
                              className="amz-product-title"
                              onClick={() => openProductPage(rv)}
                            >
                              {rv.name}
                            </h4>
                            <strong>${rv.price.toFixed(2)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </main>
            </div>
          </>
        )}

        {/* ====================================================================
            PAGE 2: SEPARATE PRODUCT DETAIL PAGE (TEMPLATE)
        ==================================================================== */}
        {page === 'product-detail' && selectedProduct && (
          <div>
            <div className="amz-breadcrumb">
              <button className="link-btn" onClick={() => setPage('storefront')}>
                ‹ Back to search results
              </button>
              <span>/</span>
              <span>{selectedProduct.category}</span>
              <span>/</span>
              <strong>{selectedProduct.name}</strong>
            </div>

            <div className="amz-pdp-container">
              <div className="amz-pdp-gallery">
                <img
                  className="amz-pdp-main-img"
                  src={selectedProduct.images?.[0]}
                  alt={selectedProduct.name}
                />
              </div>

              <div>
                <h1 className="amz-pdp-title">{selectedProduct.name}</h1>
                <div className="amz-pdp-brand">
                  Brand: {selectedProduct.brand} • Category: {selectedProduct.category}
                </div>
                <div className="amz-rating-row">
                  <span className="stars">★★★★★</span>
                  <span>
                    {selectedProduct.rating.toFixed(1)} out of 5 ({selectedProduct.reviewCount || 50}{' '}
                    reviews)
                  </span>
                </div>
                <hr className="amz-pdp-divider" />
                <div className="amz-pdp-price-line">${selectedProduct.price.toFixed(2)}</div>
                <p>{selectedProduct.description}</p>

                <h4>Technical Specifications</h4>
                <table className="amz-spec-table">
                  <tbody>
                    <tr>
                      <th>SKU</th>
                      <td>{selectedProduct.sku}</td>
                    </tr>
                    {Object.entries(selectedProduct.attributes || {}).map(([key, value]) => (
                      <tr key={key}>
                        <th>{key}</th>
                        <td>{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className="amz-buy-box">
                <div className="amz-buy-box-price">${selectedProduct.price.toFixed(2)}</div>
                <div className="text-stock">
                  {selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                </div>
                <p className="text-muted">FREE Prime Delivery Tomorrow</p>

                <label className="text-muted">Quantity:</label>
                <select
                  className="select"
                  value={qtyToBuy}
                  onChange={(e) => setQtyToBuy(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Qty: {n}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-amz-yellow btn-block"
                  onClick={() => addToCart(selectedProduct, qtyToBuy, 'cart')}
                >
                  Add to Cart
                </button>
                <br />
                <button
                  className="btn btn-amz-orange btn-block"
                  onClick={() => addToCart(selectedProduct, qtyToBuy, 'payment')}
                >
                  Buy Now (Go to Payment Page)
                </button>
                <br />
                <button className="btn btn-block" onClick={() => toggleCompare(selectedProduct)}>
                  ⚖ Add to Compare
                </button>
                <br />
                <button className="btn btn-block" onClick={() => toggleWishlist(selectedProduct)}>
                  ♡ Save to Wishlist
                </button>
              </aside>
            </div>

            {/* Customer Reviews Section */}
            <div className="panel" style={{ marginTop: '1.5rem' }}>
              <h3>Customer Reviews</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reviewInput.comment.trim()) return;
                  const existing = customReviews[selectedProduct.id] || [];
                  setCustomReviews({
                    ...customReviews,
                    [selectedProduct.id]: [
                      {
                        author: user.fullName,
                        stars: reviewInput.stars,
                        comment: reviewInput.comment,
                      },
                      ...existing,
                    ],
                  });
                  setReviewInput({ stars: 5, comment: '' });
                  notify('Your product review has been posted!');
                }}
                style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
              >
                <select
                  className="select"
                  style={{ width: '130px', marginBottom: 0 }}
                  value={reviewInput.stars}
                  onChange={(e) =>
                    setReviewInput({ ...reviewInput, stars: Number(e.target.value) })
                  }
                >
                  <option value={5}>5 Stars ★★★★★</option>
                  <option value={4}>4 Stars ★★★★☆</option>
                  <option value={3}>3 Stars ★★★☆☆</option>
                </select>
                <input
                  className="input"
                  style={{ marginBottom: 0 }}
                  placeholder="Write a customer review for this product..."
                  value={reviewInput.comment}
                  onChange={(e) => setReviewInput({ ...reviewInput, comment: e.target.value })}
                />
                <button type="submit" className="btn btn-amz-yellow">
                  Post Review
                </button>
              </form>

              {(customReviews[selectedProduct.id] || []).map((rev, idx) => (
                <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                  <strong>{rev.author}</strong>{' '}
                  <span className="stars">{'★'.repeat(rev.stars)}</span>
                  <div>{rev.comment}</div>
                </div>
              ))}
              <div style={{ padding: '0.5rem 0' }}>
                <strong>Verified Prime Buyer</strong> <span className="stars">★★★★★</span>
                <div>Excellent build quality and arrived next day with Prime shipping!</div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            PAGE 3: SEPARATE SHOPPING CART PAGE
        ==================================================================== */}
        {page === 'cart' && (
          <div className="amz-cart-page-grid">
            <div className="amz-cart-main">
              <div className="amz-cart-header">
                <h2>Shopping Cart ({cartCount} items)</h2>
                {cart.items.length > 0 && (
                  <button className="link-btn" onClick={clearCart}>
                    Clear entire cart
                  </button>
                )}
              </div>

              {cart.items.length === 0 ? (
                <div>
                  <p>Your shopping cart is empty.</p>
                  <button className="btn btn-amz-yellow" onClick={() => setPage('storefront')}>
                    Browse 250+ Products
                  </button>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.sku} className="amz-cart-row">
                    <img
                      className="amz-cart-row-img"
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'
                      }
                      alt={item.name}
                    />
                    <div>
                      <div className="amz-cart-item-title">{item.name}</div>
                      <div className="text-stock">In Stock • SKU: {item.sku}</div>
                      <div className="amz-cart-controls">
                        <div className="amz-qty-stepper">
                          <button
                            className="amz-qty-btn"
                            onClick={() => changeCartQty(item.sku, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="amz-qty-val">{item.quantity}</span>
                          <button
                            className="amz-qty-btn"
                            onClick={() => changeCartQty(item.sku, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button className="link-btn" onClick={() => changeCartQty(item.sku, 0)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="amz-cart-item-price">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <aside className="amz-cart-sidebar">
              <div className="amz-free-ship-banner">✓ Eligible for FREE Prime Shipping</div>
              <h3>Subtotal: ${cart.subtotal.toFixed(2)}</h3>
              {cart.discountAmount > 0 && (
                <div className="text-stock">Discount: −${cart.discountAmount.toFixed(2)}</div>
              )}
              <h3>Total: ${cart.total.toFixed(2)}</h3>

              <div className="amz-coupon-box">
                <input
                  className="input"
                  placeholder="Coupon (SAVE10, VIP20)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button className="btn" onClick={applyCouponCode}>
                  Apply
                </button>
              </div>

              <button
                className="btn btn-amz-yellow btn-block"
                disabled={cart.items.length === 0}
                onClick={() => setPage('payment')}
              >
                Proceed to Payment Page
              </button>
            </aside>
          </div>
        )}

        {/* ====================================================================
            PAGE 4: SEPARATE PAYMENT & CHECKOUT PAGE
        ==================================================================== */}
        {page === 'payment' && (
          <div className="amz-checkout-grid">
            <div>
              <div className="amz-checkout-step">
                <h3 className="amz-step-title">
                  <span className="amz-step-num">1</span> Shipping Address
                </h3>
                <div className="amz-address-grid">
                  <input
                    className="input"
                    placeholder="Full Name"
                    value={address.recipientName}
                    onChange={(e) => setAddress({ ...address, recipientName: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Street Address"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Postal Code"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="amz-checkout-step">
                <h3 className="amz-step-title">
                  <span className="amz-step-num">2</span> Payment Method (Stripe & Saga)
                </h3>

                <label
                  className={`amz-payment-option ${!simulateDecline ? 'selected' : ''}`}
                  onClick={() => setSimulateDecline(false)}
                >
                  <input type="radio" checked={!simulateDecline} readOnly />
                  <div>
                    <strong>Stripe Visa •••• 4242 (Approve Payment)</strong>
                    <div className="text-muted">
                      Locks stock → Charges card → Deducts stock & confirms order.
                    </div>
                  </div>
                </label>

                <label
                  className={`amz-payment-option ${simulateDecline ? 'selected' : ''}`}
                  onClick={() => setSimulateDecline(true)}
                >
                  <input type="radio" checked={simulateDecline} readOnly />
                  <div>
                    <strong>Simulate Declined Card •••• 0002 (Test Saga Rollback)</strong>
                    <div className="text-muted">
                      Locks stock → Payment fails → Saga automatically releases locked stock!
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <aside className="amz-order-summary-box">
              <button
                className="btn btn-amz-yellow btn-block"
                disabled={cart.items.length === 0}
                onClick={placeOrderAndPay}
              >
                Place Your Order & Pay
              </button>
              <div className="amz-summary-total">
                <span>Order Total:</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </aside>
          </div>
        )}

        {/* ====================================================================
            MODULAR CUSTOMER & ADMIN PAGES
        ==================================================================== */}
        {page === 'compare' && (
          <ComparePage
            compareList={compareList}
            onAddToCart={(p) => addToCart(p, 1, 'cart')}
            onRemoveCompare={(id) =>
              setCompareList(compareList.filter((item) => item.id !== id))
            }
            onOpenProduct={openProductPage}
            onBack={() => setPage('storefront')}
          />
        )}

        {page === 'wishlist' && (
          <WishlistPage
            wishlist={wishlist}
            onMoveToCart={(p) => addToCart(p, 1, 'cart')}
            onRemove={toggleWishlist}
            onOpenProduct={openProductPage}
            onBack={() => setPage('storefront')}
          />
        )}

        {page === 'login' && (
          <LoginPage
            onLoginSuccess={(newToken, newUser) => {
              setToken(newToken);
              setUser({ id: newUser.id, fullName: newUser.fullName });
              setRole(newUser.role);
              notify(`Signed in as ${newUser.fullName} (${newUser.role})`);
              setPage('storefront');
            }}
            onQuickDemoLogin={(targetRole) => {
              loginAs(targetRole);
              notify(`Switched to ${targetRole.toUpperCase()} demo account`);
              setPage('storefront');
            }}
          />
        )}

        {page === 'profile' && (
          <ProfilePage
            savedAddresses={savedAddresses}
            activeAddressId={activeAddressId}
            onSelectAddress={(addr) => {
              setActiveAddressId(addr.id);
              setAddress({
                recipientName: addr.recipientName,
                street: addr.street,
                city: addr.city,
                postalCode: addr.postalCode,
              });
              notify(`Selected shipping address: ${addr.label} (${addr.city})`);
            }}
            onAddAddress={(newAddr) => {
              setSavedAddresses([...savedAddresses, newAddr]);
              setActiveAddressId(newAddr.id);
              setAddress({
                recipientName: newAddr.recipientName,
                street: newAddr.street,
                city: newAddr.city,
                postalCode: newAddr.postalCode,
              });
              notify(`Saved new address "${newAddr.label}" to your Address Book!`);
            }}
            savedCards={savedCards}
            activeCardId={activeCardId}
            onSelectCard={(id) => {
              setActiveCardId(id);
              notify('Updated default payment card in Wallet.');
            }}
            onAddCard={(newCard) => {
              setSavedCards([...savedCards, newCard]);
              setActiveCardId(newCard.id);
              notify(`Saved ${newCard.brand} ending in •••• ${newCard.last4} to Wallet!`);
            }}
          />
        )}

        {page === 'orders' && (
          <OrdersPage
            orders={orders}
            onCancelOrder={cancelOrderAndRestoreStock}
            onRefreshLive={loadUserData}
            onViewInvoice={(ord) => {
              setSelectedInvoiceOrder(ord);
              setPage('invoice');
            }}
          />
        )}

        {page === 'invoice' && (
          <InvoicePage
            order={selectedInvoiceOrder}
            customerName={address.recipientName}
            addressText={`${address.street}, ${address.city} ${address.postalCode}`}
            onBack={() => setPage('orders')}
          />
        )}

        {page === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onClear={() => setNotifications([])}
            onNavigate={setPage}
          />
        )}

        {page === 'admin' && (
          <AdminPage
            products={products}
            inventory={inventory}
            orders={orders}
            categories={categories}
            onUpdateOrderStatus={updateOrderFulfillmentStatus}
            onRestock={async (sku, currentTotal) => {
              await fetch(`/api/inventory/${sku}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ totalStock: currentTotal + 10 }),
              });
              loadUserData();
              notify(`Restocked ${sku} (+10 units)`);
            }}
            onCreateProduct={async (prod) => {
              const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(prod),
              });
              if (res.ok) {
                notify(`Created new product "${prod.name}"!`);
                loadProducts();
                loadUserData();
              }
            }}
            onEditProductPrice={async (product, newPrice) => {
              const res = await fetch(`/api/products/${product.id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ price: newPrice }),
              });
              if (res.ok) {
                notify(`Updated "${product.name}" price to $${newPrice}`);
                loadProducts();
              }
            }}
            onDeleteProduct={async (productId) => {
              const res = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: getHeaders(),
              });
              if (res.ok) {
                notify(`Deleted product ${productId}`);
                loadProducts();
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

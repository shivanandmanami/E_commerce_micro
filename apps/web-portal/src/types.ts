// ============================================================================
// SIMPLE TYPES & CSV EXPORT HELPER FOR THE FRONTEND
// ============================================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  images: string[];
  tags: string[];
  attributes: Record<string, any>;
  inStock: boolean;
  availableQuantity?: number;
  rating: number;
  reviewCount?: number;
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  total: number;
}

export type DeliveryStatus =
  | 'ORDER_CONFIRMED'
  | 'PACKING_IN_WAREHOUSE'
  | 'SHIPPED_IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  userId?: string;
  status: string;
  deliveryStatus?: DeliveryStatus;
  trackingNote?: string;
  sagaStatus: string;
  totalAmount: number;
  items: Array<{ sku: string; productName: string; quantity: number; unitPrice: number }>;
  failureReason?: string;
  sagaHistory?: Array<{ id: string; step: string; eventType: string }>;
  createdAt: string;
}

export interface InventoryItem {
  sku: string;
  productName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

export interface SavedAddress {
  id: string;
  label: string; // e.g. "Home", "Office", "Parents"
  recipientName: string;
  street: string;
  city: string;
  postalCode: string;
}

export interface SavedCard {
  id: string;
  brand: string; // e.g. "Visa", "Mastercard"
  last4: string;
  expiry: string;
  cardholder: string;
}

export type PageName =
  | 'storefront'
  | 'product-detail'
  | 'compare'
  | 'wishlist'
  | 'cart'
  | 'payment'
  | 'orders'
  | 'invoice'
  | 'profile'
  | 'login'
  | 'notifications'
  | 'admin';

export const ALL_DEPARTMENTS = [
  'Laptops',
  'Smartphones',
  'Audio',
  'Peripherals',
  'Monitors',
  'Gaming',
  'Cameras',
  'Smart Home',
  'Wearables',
  'Accessories',
];

// Simple helper to download any table data as a .csv file
export function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

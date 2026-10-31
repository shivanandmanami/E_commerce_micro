export type UserRole = 'customer' | 'admin';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface ProductAttributeMap {
  [key: string]: string | number | boolean | string[];
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  attributes: ProductAttributeMap;
  inStock: boolean;
  availableQuantity?: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  total: number;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'INVENTORY_LOCKED'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FAILED';

export type DeliveryStatus =
  | 'ORDER_CONFIRMED'
  | 'PACKING_IN_WAREHOUSE'
  | 'SHIPPED_IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type SagaStatus =
  | 'STARTED'
  | 'AWAITING_INVENTORY_LOCK'
  | 'INVENTORY_LOCKED_AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'COMPENSATING_INVENTORY'
  | 'COMPENSATED'
  | 'FAILED_OUT_OF_STOCK';

export interface OrderItemDTO {
  sku: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddress {
  recipientName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SagaStepEvent {
  id: string;
  orderId: string;
  step: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  userId: string;
  status: OrderStatus;
  deliveryStatus?: DeliveryStatus;
  trackingNote?: string;
  sagaStatus: SagaStatus;
  totalAmount: number;
  currency: string;
  items: OrderItemDTO[];
  shippingAddress: ShippingAddress;
  failureReason?: string;
  sagaHistory?: SagaStepEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDTO {
  sku: string;
  productId: string;
  productName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  unitPrice: number;
  updatedAt: string;
}

export enum KafkaTopics {
  PRODUCT_UPSERTED = 'catalog.product.upserted',
  PRODUCT_DELETED = 'catalog.product.deleted',
  ORDER_INVENTORY_LOCKED = 'saga.order.inventory_locked',
  PAYMENT_SUCCEEDED = 'saga.payment.succeeded',
  PAYMENT_FAILED = 'saga.payment.failed',
  ORDER_CONFIRMED = 'saga.order.confirmed',
  ORDER_CANCELLED = 'saga.order.cancelled',
}

export interface ProductUpsertedEvent {
  eventId: string;
  timestamp: string;
  product: ProductDTO;
}

export interface ProductDeletedEvent {
  eventId: string;
  timestamp: string;
  productId: string;
  sku: string;
}

export interface OrderInventoryLockedEvent {
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  totalAmount: number;
  currency: string;
  paymentMethodId?: string;
  simulatePaymentFailure?: boolean;
  items: OrderItemDTO[];
}

export interface PaymentSucceededEvent {
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  paymentId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
}

export interface PaymentFailedEvent {
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  reason: string;
}


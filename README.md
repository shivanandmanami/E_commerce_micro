# Event-Driven E-Commerce Microservices Platform

A TypeScript/Node.js monorepo implementing an event-driven microservice e-commerce platform with **API Gateway**, **Elasticsearch Multi-Faceted Search**, **MongoDB Dynamic Catalog**, **Redis Low-Latency Cart**, **Kafka Order & Inventory Saga Orchestration**, **Stripe Payments**, and **Customer & Admin Portals**.

## Architecture & Service Topology

| Component | Workspace Package | Port | Backing Store / Broker | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `@ecommerce/api-gateway` | `4000` | Redis (rate limiter) | Request routing, Bearer JWT verification, role-based access control (`customer` / `admin`), sliding-window rate limiting |
| **Product Catalog Service** | `@ecommerce/catalog-service` | `4001` | MongoDB + Kafka | Dynamic schema-less product metadata (`attributes`), SKU management, emits `catalog.product.upserted` & `catalog.product.deleted` |
| **Search & Discovery Service** | `@ecommerce/search-service` | `4002` | Elasticsearch + Kafka | Multi-faceted filtering (`category`, `brand`, `priceRanges`, dynamic `attr.*`) & bucket aggregations; auto-indexes catalog events |
| **Cart Service** | `@ecommerce/cart-service` | `4003` | Redis | Low-latency per-customer shopping cart (`cart:{userId}`) with 7-day TTL and coupon engine (`SAVE10`, `WELCOME15`, `VIP20`) |
| **Order & Inventory Service** | `@ecommerce/order-inventory-service` | `4004` | PostgreSQL + Kafka | Implements the **Order Fulfillment Saga Pattern**: locks stock (`LOCKED`), commits stock on payment success (`COMMITTED`), or executes compensating transactions (`RELEASED`) on payment failure |
| **Payment Service** | `@ecommerce/payment-service` | `4005` | Stripe + PostgreSQL + Kafka | Processes `saga.order.inventory_locked` events via Stripe `PaymentIntent` API & webhooks; emits `saga.payment.succeeded` or `saga.payment.failed` |
| **Customer & Admin Service** | `@ecommerce/customer-admin-service` | `4006` | PostgreSQL | JWT authentication, customer order history aggregation, admin analytics dashboard, catalog & inventory operations, store audit logs |
| **Customer & Admin Web Portal** | `@ecommerce/web-portal` | `3000` | React + Vite | Interactive Storefront (faceted search, Redis cart drawer, Saga checkout simulator), Customer Order History & Saga Log viewer, and Admin Store Operations Portal |

---

## Distributed Saga Pattern Flow (Order, Inventory & Payment)

1. **Saga Initiation & Inventory Lock (`order-inventory-service`)**:
   - `POST /api/orders` creates an order (`status: PENDING`, `sagaStatus: AWAITING_INVENTORY_LOCK`).
   - Atomically checks and reserves stock (`reserved_stock += qty`, reservation `status: LOCKED`).
   - Transitions order to `INVENTORY_LOCKED` (`INVENTORY_LOCKED_AWAITING_PAYMENT`) and publishes `saga.order.inventory_locked` to Kafka.
2. **Payment Processing (`payment-service`)**:
   - Consumes `saga.order.inventory_locked` and creates/confirms a Stripe `PaymentIntent`.
   - Emits either `saga.payment.succeeded` or `saga.payment.failed`.
3. **Saga Completion or Compensating Transaction (`order-inventory-service`)**:
   - **On `saga.payment.succeeded`**: Permanently deducts stock (`total_stock -= qty`, `reserved_stock -= qty`, reservation `COMMITTED`) and marks Order `CONFIRMED` (`sagaStatus: COMPLETED`).
   - **On `saga.payment.failed` (Compensating Rollback)**: Releases locked stock (`reserved_stock -= qty`, reservation `RELEASED`) restoring available inventory, and marks Order `CANCELLED` (`sagaStatus: COMPENSATED`).

---

## Quick Start

### 1. Start Local Infrastructure (Docker Compose)
```bash
npm run infra:up
```
Starts PostgreSQL (`5432`), MongoDB (`27017`), Redis (`6379`), Elasticsearch (`9200`), Apache Kafka KRaft (`9092`), and Kafka UI (`8080`).

> **Note:** Every microservice also includes automatic resilient fallbacks (in-memory storage + HTTP event relay) if Docker containers are not running locally, allowing immediate local development and testing without Docker.

### 2. Install & Build All Workspaces
```bash
npm install
npm run build
```

### 3. Run End-to-End Verification Suite
```bash
npm run verify
```

### 4. Start All Backend Microservices & Web Portal
```bash
# Terminal 1: Start all 6 microservices + API Gateway (ports 4000-4006)
npm run dev

# Terminal 2: Start the React Customer & Admin Web Portal (port 3000)
npm run dev:portal
```


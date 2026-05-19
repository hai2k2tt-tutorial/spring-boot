#  DB & Feature Update Plan (Admin + User + Payment)

This document describes the **new database structure**, **service responsibilities**, and **implementation roadmap** for upcoming features:

- Admin account + Admin FE
- Product service on **Postgres** with hierarchical categories
- Inventory service with **EAV attributes** and SKU per attribute combination
- Orders with **multiple items** and shop ownership
- Separate Shop auth + Customer auth tables
- Payment Service
- Shop FE (manage products/inventory/orders/balance)
- Customer FE (profile, cart, orders, payment history)

---

## ✅ Target Architecture (Services)

| Service | Responsibility |
|--------|----------------|
| **Product Service (Postgres)** | Product catalog + hierarchical categories (NO SKU) |
| **Inventory Service** | EAV attributes + SKU + stock (links to product) |
| **Order Service** | Order + order_items (multi-SKU, per shop) |
| **Shop Auth Service** | Shop auth + shop profile + shop balance |
| **Customer Auth Service** | Customer auth + customer profile + customer balance |
| **Payment Service** | Payments, history, order status |
| **Admin FE** | Manage shops/customers/products/orders/inventory |
| **Shop FE** | Create products, manage inventory, view orders, view balance |
| **Customer FE** | Product list, cart, order, payment |

---

# ️ Updated DB Schema (Proposed)

##  Product Service (Postgres)
**Products + hierarchical categories** (no SKU here)

```
t_category
- id (UUID)
- name
- parent_id (nullable, FK to t_category)
- created_at
- updated_at
```

```
t_product
- id (UUID)
- shop_id (FK to shop profile)
- name
- description
- price
- image_url
- category_id (FK to t_category)
- status (DRAFT / ACTIVE / ARCHIVED)
- created_at
- updated_at
```

---

##  Inventory Service (EAV)
Each SKU is a **unique combination** of attribute values for a product.

```
t_attribute
- id (UUID)
- product_id (FK to product service)
- code (e.g. "size")
- name (e.g. "Size")
- input_type (SELECT / TEXT)
- created_at
- updated_at
```

```
t_attribute_value
- id (UUID)
- attribute_id (FK to t_attribute)
- value (e.g. "XL", "Red")
- sort_order
```

```
t_sku
- id (UUID)
- product_id (FK to product service)
- sku_code (unique)
- price_override (nullable)
- created_at
- updated_at
```

```
t_sku_attribute_value
- id (UUID)
- sku_id (FK to t_sku)
- attribute_value_id (FK to t_attribute_value)
```

```
t_inventory
- id (UUID)
- sku_id (FK to t_sku)
- quantity
- created_at
- updated_at
```

---

##  Order Service
Now 1 order has **many items** and each item belongs to a shop.

```
t_order
- id (UUID)
- order_number
- customer_id (FK to customer profile)
- status (PENDING / PAID / CANCELED)
- total_amount
- created_at
- updated_at
```

```
t_order_item
- id (UUID)
- order_id (FK)
- sku_id (FK)
- product_id (FK)
- shop_id (FK to shop profile)
- price
- quantity
```

---

##  Shop Auth Service
Separate auth + profile + balance for shops.

```
t_shop_auth
- id (UUID)
- email
- password_hash
- status (ACTIVE / LOCKED)
- created_at
- updated_at
```

```
t_shop_profile
- id (UUID)
- auth_id (FK to t_shop_auth)
- shop_name
- owner_name
- phone
- created_at
- updated_at
```

```
t_shop_wallet
- shop_id (FK to t_shop_profile)
- balance
- currency
- updated_at
```

---

##  Customer Auth Service
Separate auth + profile + balance for customers.

```
t_customer_auth
- id (UUID)
- email
- password_hash
- status (ACTIVE / LOCKED)
- created_at
- updated_at
```

```
t_customer_profile
- id (UUID)
- auth_id (FK to t_customer_auth)
- first_name
- last_name
- phone
- created_at
- updated_at
```

```
t_customer_wallet
- customer_id (FK to t_customer_profile)
- balance
- currency
- updated_at
```

---

##  Payment Service

```
t_payment
- id (UUID)
- customer_id (FK to t_customer_profile)
- order_id (FK)
- amount
- method (BALANCE / CARD / MANUAL)
- status (PENDING / SUCCESS / FAILED)
- created_at
- updated_at
```

```
t_payment_history (optional)
- id
- customer_id
- payment_id
- type (TOPUP / PURCHASE / REFUND)
- amount
- created_at
```

---

#  Admin Features (FE)

Admin can:

✅ Manage shops and customers (view, lock, balance)  
✅ Manage products and categories  
✅ Manage inventory attributes + SKUs  
✅ View orders with pagination + filters  
✅ View order detail (items, customer, payment)

---

#  Admin Reports

- All timestamps in CSV reports will use **ISO-8601 format** in **UTC** (e.g., `2023-10-25T12:34:56Z`).
- CSV reports will have **fixed columns** as defined per report type (e.g., orders, payments, inventory, etc.).
- Reports are **on-demand only** and generated in **CSV format**.

---

#  Shop Features (FE)

Shop can:

✅ Create products and assign categories  
✅ Define inventory attributes and SKU combinations  
✅ View orders that include their inventory  
✅ View shop balance and payouts

---

#  Customer Features (FE)

Customer can:

✅ View profile + balance  
✅ Browse products + variants  
✅ Add to cart  
✅ Place order  
✅ Make payment  
✅ View payment history  
✅ View order list + detail

---

# ✅ Implementation Roadmap (Recommended Order)

### **Phase 1 – DB & Service Update**
1. **Migrate Product Service to Postgres**: create tables + update data access
2. **Add Category schema**: hierarchical `t_category` with `parent_id`
3. **Update Inventory schema to EAV**: attributes, values, SKU mapping, stock
4. **Update Order schema**: multi-item, `sku_id`, `shop_id`, `customer_id`

---

### **Phase 2 – Auth + Profile Split**
1. Create **Shop Auth Service** tables + profile + wallet
2. Create **Customer Auth Service** tables + profile + wallet
3. Seed admin + shop + customer (dev seed)

---

### **Phase 3 – Payment Service**
1. Payment table + history
2. Link payment to order + wallet updates
3. Update Order status after payment

---

### **Phase 4 – Admin FE**
1. Admin login + dashboard
2. Shop + customer list + balance update
3. Product/category + SKU management
4. Orders list + filter + detail

---

### **Phase 5 – Shop FE**
1. Shop profile + balance
2. Product CRUD + category select
3. Attribute + SKU management
4. Order list + detail

---

### **Phase 6 – Customer FE**
1. Customer profile + balance
2. Product list + variant select
3. Cart + checkout
4. Order list + detail
5. Payment history

---

#  Next Steps

- [ ] Decide authentication method (Keycloak or internal)
- [ ] Finalize EAV attribute dictionary rules
- [ ] Finalize API contracts for Order + Payment
- [ ] Write migrations for all services
- [ ] Update FE API calls

---

If you want, I can generate **SQL migration files** or **DTO/API designs** next.
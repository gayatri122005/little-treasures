-- One-time migration for Razorpay checkout and order management.
-- Back up the database before running this against a production database.
ALTER TABLE products
  ADD COLUMN stock_reserved INT UNSIGNED NOT NULL DEFAULT 0 AFTER stock_quantity,
  ADD KEY idx_products_available_stock (status, stock_quantity, stock_reserved);

ALTER TABLE orders
  ADD COLUMN order_type ENUM('online','cod') NOT NULL DEFAULT 'online' AFTER status,
  ADD COLUMN payment_status ENUM('pending','authorized','paid','failed','refunded','cod_pending','cod_paid') NOT NULL DEFAULT 'pending' AFTER order_type,
  ADD COLUMN subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
  ADD COLUMN shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER subtotal_amount,
  ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER shipping_amount,
  ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER discount_amount,
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'INR' AFTER tax_amount,
  ADD COLUMN shipping_address_json JSON DEFAULT NULL AFTER shipping_address_id,
  ADD COLUMN reservation_expires_at TIMESTAMP NULL DEFAULT NULL AFTER shipping_address_json,
  ADD COLUMN stock_committed TINYINT(1) NOT NULL DEFAULT 0 AFTER reservation_expires_at,
  ADD KEY idx_orders_payment_status_created (payment_status, created_at),
  ADD KEY idx_orders_reservation_expires (reservation_expires_at);

ALTER TABLE order_items
  ADD COLUMN product_name VARCHAR(160) DEFAULT NULL AFTER product_id,
  ADD COLUMN product_image VARCHAR(255) DEFAULT NULL AFTER product_name;

ALTER TABLE payments
  MODIFY COLUMN payment_status ENUM('pending','authorized','paid','captured','failed','refunded') NOT NULL DEFAULT 'pending',
  ADD COLUMN gateway VARCHAR(32) NOT NULL DEFAULT 'razorpay' AFTER payment_method,
  ADD COLUMN gateway_order_id VARCHAR(80) DEFAULT NULL AFTER gateway,
  ADD COLUMN gateway_payment_id VARCHAR(80) DEFAULT NULL AFTER gateway_order_id,
  ADD COLUMN attempt_number SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER gateway_payment_id,
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'INR' AFTER amount,
  ADD COLUMN failure_code VARCHAR(120) DEFAULT NULL AFTER payment_status,
  ADD COLUMN failure_description VARCHAR(500) DEFAULT NULL AFTER failure_code,
  ADD COLUMN paid_at TIMESTAMP NULL DEFAULT NULL AFTER failure_description,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD UNIQUE KEY uq_payments_gateway_order (gateway_order_id),
  ADD UNIQUE KEY uq_payments_gateway_payment (gateway_payment_id),
  ADD UNIQUE KEY uq_payments_order_attempt (order_id, attempt_number),
  ADD KEY idx_payments_status_created (payment_status, created_at);

-- Preserve the semantics of pre-migration transactions and order fulfillment.
UPDATE payments
SET gateway = CASE
  WHEN LOWER(payment_method) LIKE '%cash%delivery%' OR LOWER(payment_method) = 'cod' THEN 'cod'
  ELSE 'razorpay'
END;

UPDATE orders o
LEFT JOIN (
  SELECT order_id,
         MAX(payment_status = 'paid' OR payment_status = 'captured') AS has_paid,
         MAX(payment_status = 'refunded') AS has_refund,
         MAX(payment_status = 'failed') AS has_failure,
         MAX(gateway = 'cod') AS is_cod
  FROM payments
  GROUP BY order_id
) p ON p.order_id = o.id
SET o.order_type = IF(COALESCE(p.is_cod, 0) = 1, 'cod', 'online'),
    o.payment_status = CASE
      WHEN COALESCE(p.has_refund, 0) = 1 THEN 'refunded'
      WHEN COALESCE(p.has_paid, 0) = 1 THEN IF(COALESCE(p.is_cod, 0) = 1, 'cod_paid', 'paid')
      WHEN COALESCE(p.has_failure, 0) = 1 THEN 'failed'
      ELSE 'pending'
    END,
    o.stock_committed = IF(o.status IN ('processing','shipped','delivered'), 1, 0);

CREATE TABLE payment_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  gateway_payment_id VARCHAR(80) NOT NULL,
  payment_status ENUM('authorized','captured','failed') NOT NULL,
  method VARCHAR(80) DEFAULT NULL,
  failure_code VARCHAR(120) DEFAULT NULL,
  failure_description VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_attempt_gateway_id (gateway_payment_id),
  KEY idx_payment_attempt_payment (payment_id, created_at),
  CONSTRAINT fk_payment_attempt_parent FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  gateway_refund_id VARCHAR(80) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
  reason VARCHAR(255) DEFAULT NULL,
  idempotency_key VARCHAR(80) NOT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refunds_gateway_id (gateway_refund_id),
  UNIQUE KEY uq_refunds_idempotency (idempotency_key),
  KEY idx_refunds_order_status (order_id, status, created_at),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refunds_admin FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payment_webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload_sha256 CHAR(64) NOT NULL,
  payload_json JSON NOT NULL,
  processing_status ENUM('received','processing','processed','ignored','failed') NOT NULL DEFAULT 'received',
  processing_error VARCHAR(500) DEFAULT NULL,
  processing_started_at TIMESTAMP NULL DEFAULT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_webhook_event_id (event_id),
  KEY idx_payment_webhook_type_received (event_type, received_at),
  KEY idx_payment_webhook_status_received (processing_status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

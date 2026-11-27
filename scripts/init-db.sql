CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(32) DEFAULT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 1,
  account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255) DEFAULT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_email_token_hash (token_hash),
  KEY idx_auth_email_token_user (user_id, used_at, expires_at),
  CONSTRAINT fk_auth_email_token_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_password_token_hash (token_hash),
  KEY idx_auth_password_token_user (user_id, used_at, expires_at),
  CONSTRAINT fk_auth_password_token_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  action VARCHAR(32) NOT NULL,
  subject_hash CHAR(64) NOT NULL,
  window_started_at DATETIME(3) NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  blocked_until DATETIME(3) DEFAULT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (action, subject_hash),
  KEY idx_auth_rate_limit_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_session_token_hash (token_hash),
  KEY idx_auth_session_user (user_id, revoked_at, expires_at),
  CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  image_path VARCHAR(255) DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (category_name),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_status_order (status, category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  product_type VARCHAR(80) DEFAULT NULL,
  product_name VARCHAR(160) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_quantity INT NOT NULL DEFAULT 0,
  stock_reserved INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','draft','out_of_stock') NOT NULL DEFAULT 'active',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_new_arrival TINYINT(1) NOT NULL DEFAULT 0,
  show_on_homepage TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category_id (category_id),
  KEY idx_products_available_stock (status, stock_quantity, stock_reserved),
  KEY idx_products_homepage_flags (show_on_homepage, is_featured, is_new_arrival, created_at),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  mime_type VARCHAR(32) NOT NULL DEFAULT 'image/jpeg',
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  width INT UNSIGNED DEFAULT NULL,
  height INT UNSIGNED DEFAULT NULL,
  aspect_ratio DECIMAL(12,6) DEFAULT NULL,
  fit ENUM('cover','contain') NOT NULL DEFAULT 'cover',
  position_x DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  position_y DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_images_product_id (product_id),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  video_path VARCHAR(255) NOT NULL,
  thumbnail_path VARCHAR(255) DEFAULT NULL,
  mime_type VARCHAR(32) NOT NULL DEFAULT 'video/mp4',
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_videos_product_id (product_id),
  CONSTRAINT fk_product_videos_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (category_name, slug, description, image_path)
VALUES
  ('Home & Decor', 'home-decor', 'Toran and decorative doormats', '/categories/home-decor.svg'),
  ('Kids Wear', 'kids-wear', 'Ghagra, frocks and palazzo', '/categories/kids-wear.svg'),
  ('Fashion & Hair Accessories', 'fashion-hair-accessories', 'Potli bags and hair clips', '/categories/fashion-accessories.svg')
ON DUPLICATE KEY UPDATE
  description = VALUES(description), slug = VALUES(slug);

CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) DEFAULT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) DEFAULT NULL,
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT NULL,
  postal_code VARCHAR(25) DEFAULT NULL,
  country VARCHAR(100) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_addresses_user_id (user_id),
  CONSTRAINT fk_user_addresses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  order_number VARCHAR(80) NOT NULL,
  status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  order_type ENUM('online','cod') NOT NULL DEFAULT 'online',
  payment_status ENUM('pending','authorized','paid','failed','refunded','cod_pending','cod_paid') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  shipping_address_id BIGINT UNSIGNED DEFAULT NULL,
  shipping_address_json JSON DEFAULT NULL,
  reservation_expires_at TIMESTAMP NULL DEFAULT NULL,
  stock_committed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_payment_status_created (payment_status, created_at),
  KEY idx_orders_reservation_expires (reservation_expires_at),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(160) DEFAULT NULL,
  product_image VARCHAR(255) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  payment_method VARCHAR(80) NOT NULL,
  gateway VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  gateway_order_id VARCHAR(80) DEFAULT NULL,
  gateway_payment_id VARCHAR(80) DEFAULT NULL,
  attempt_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  payment_status ENUM('pending','authorized','paid','captured','failed','refunded') NOT NULL DEFAULT 'pending',
  failure_code VARCHAR(120) DEFAULT NULL,
  failure_description VARCHAR(500) DEFAULT NULL,
  paid_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order_id (order_id),
  KEY idx_payments_user_id (user_id),
  UNIQUE KEY uq_payments_gateway_order (gateway_order_id),
  UNIQUE KEY uq_payments_gateway_payment (gateway_payment_id),
  UNIQUE KEY uq_payments_order_attempt (order_id, attempt_number),
  KEY idx_payments_status_created (payment_status, created_at),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_attempts (
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

CREATE TABLE IF NOT EXISTS refunds (
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

CREATE TABLE IF NOT EXISTS payment_webhook_events (
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

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_subscribers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

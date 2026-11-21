-- Run once on an existing database after scripts/product-media-migration.sql.
-- Homepage tags are metadata; product content and prices remain unchanged.
ALTER TABLE products
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN is_new_arrival TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN show_on_homepage TINYINT(1) NOT NULL DEFAULT 1 AFTER is_new_arrival,
  ADD KEY idx_products_homepage_flags
    (show_on_homepage, is_featured, is_new_arrival, created_at);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_subscribers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

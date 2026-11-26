-- Run once against the existing database before using category management.
ALTER TABLE categories
  ADD COLUMN slug VARCHAR(140) NULL AFTER category_name,
  ADD COLUMN image_path VARCHAR(255) NULL AFTER description,
  ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active' AFTER image_path;

UPDATE categories SET slug = LOWER(REGEXP_REPLACE(category_name, '[^a-zA-Z0-9]+', '-')) WHERE slug IS NULL;
UPDATE categories SET slug = TRIM(BOTH '-' FROM slug) WHERE slug IS NOT NULL;
UPDATE categories SET image_path = '/categories/home-decor.svg' WHERE category_name = 'Home & Decor' AND image_path IS NULL;
UPDATE categories SET image_path = '/categories/kids-wear.svg' WHERE category_name = 'Kids Wear' AND image_path IS NULL;
UPDATE categories SET image_path = '/categories/fashion-accessories.svg' WHERE category_name = 'Fashion & Hair Accessories' AND image_path IS NULL;
UPDATE products p JOIN categories c ON c.category_name = 'Home & Decor'
  SET p.category_id = c.id
  WHERE p.category_id IS NULL AND LOWER(p.product_name) REGEXP 'pooja|thali|toran|doormat|door mat';
UPDATE products p JOIN categories c ON c.category_name = 'Kids Wear'
  SET p.category_id = c.id
  WHERE p.category_id IS NULL AND LOWER(p.product_name) REGEXP 'frock|frog|ghagra|palazzo|plazo';
-- Confirm all existing products are assigned before applying the constraint.
ALTER TABLE products DROP FOREIGN KEY fk_products_category;
ALTER TABLE products MODIFY COLUMN category_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE products ADD CONSTRAINT fk_products_category
  FOREIGN KEY (category_id) REFERENCES categories(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE categories MODIFY COLUMN slug VARCHAR(140) NOT NULL;
ALTER TABLE categories ADD UNIQUE KEY uq_categories_slug (slug);
ALTER TABLE categories ADD KEY idx_categories_status_order (status, category_name);

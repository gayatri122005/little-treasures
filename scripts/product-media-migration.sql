-- Run once against an existing database after scripts/init-db.sql.
-- Product files are stored under storage/product-media; only metadata and paths
-- are stored in MySQL.
ALTER TABLE product_images
  ADD COLUMN mime_type VARCHAR(32) NOT NULL DEFAULT 'image/jpeg' AFTER is_primary,
  ADD COLUMN file_size BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER mime_type,
  ADD COLUMN width INT UNSIGNED DEFAULT NULL AFTER file_size,
  ADD COLUMN height INT UNSIGNED DEFAULT NULL AFTER width,
  ADD COLUMN aspect_ratio DECIMAL(12,6) DEFAULT NULL AFTER height,
  ADD COLUMN fit ENUM('cover','contain') NOT NULL DEFAULT 'cover' AFTER aspect_ratio,
  ADD COLUMN position_x DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER fit,
  ADD COLUMN position_y DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER position_x,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE product_videos
  ADD COLUMN mime_type VARCHAR(32) NOT NULL DEFAULT 'video/mp4' AFTER thumbnail_path,
  ADD COLUMN file_size BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER mime_type,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

INSERT INTO categories (category_name, description)
VALUES
  ('Apparel', 'Clothing and everyday layers'),
  ('Bags', 'Bags and accessories'),
  ('Jewellery', 'Jewellery and keepsakes'),
  ('Home & Gifts', 'Home accents and thoughtful gifts')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

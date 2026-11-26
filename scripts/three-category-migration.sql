-- Back up categories and products before running this migration.
-- This keeps product IDs, media relations, order items, customers, and payments intact.
ALTER TABLE products ADD COLUMN product_type VARCHAR(80) DEFAULT NULL AFTER category_id;

-- Rename the existing categories in place to retain their IDs.
UPDATE categories SET category_name = 'Kids Wear', description = 'Ghagra, frocks and palazzo'
WHERE category_name = 'Apparel';
UPDATE categories SET category_name = 'Fashion & Hair Accessories', description = 'Potli bags and hair clips'
WHERE category_name = 'Bags';
UPDATE categories SET category_name = 'Home & Decor', description = 'Toran and decorative doormats'
WHERE category_name = 'Home & Gifts';
INSERT INTO categories (category_name, slug, description)
VALUES ('Home & Decor', 'home-decor', 'Toran and decorative doormats'),
       ('Kids Wear', 'kids-wear', 'Ghagra, frocks and palazzo'),
       ('Fashion & Hair Accessories', 'fashion-hair-accessories', 'Potli bags and hair clips')
ON DUPLICATE KEY UPDATE description = VALUES(description);

START TRANSACTION;

UPDATE products
SET category_id = CASE
      WHEN LOWER(product_name) REGEXP 'toran' THEN (SELECT id FROM categories WHERE category_name = 'Home & Decor')
      WHEN LOWER(product_name) REGEXP 'doormat|door mat' THEN (SELECT id FROM categories WHERE category_name = 'Home & Decor')
      WHEN LOWER(product_name) REGEXP 'ghagra' THEN (SELECT id FROM categories WHERE category_name = 'Kids Wear')
      WHEN LOWER(product_name) REGEXP 'frock' THEN (SELECT id FROM categories WHERE category_name = 'Kids Wear')
      WHEN LOWER(product_name) REGEXP 'palazzo|plazo' THEN (SELECT id FROM categories WHERE category_name = 'Kids Wear')
      WHEN LOWER(product_name) REGEXP 'potli|pouch' THEN (SELECT id FROM categories WHERE category_name = 'Fashion & Hair Accessories')
      WHEN LOWER(product_name) REGEXP 'hair clip' THEN (SELECT id FROM categories WHERE category_name = 'Fashion & Hair Accessories')
      WHEN LOWER(product_name) REGEXP 'pooja|thali|toran|doormat|door mat' THEN (SELECT id FROM categories WHERE category_name = 'Home & Decor')
      WHEN LOWER(product_name) REGEXP 'frock|frog|ghagra|palazzo|plazo' THEN (SELECT id FROM categories WHERE category_name = 'Kids Wear')
      ELSE NULL
    END,
    product_type = CASE
      WHEN LOWER(product_name) REGEXP 'toran' THEN 'Toran'
      WHEN LOWER(product_name) REGEXP 'doormat|door mat' THEN 'Doormats'
      WHEN LOWER(product_name) REGEXP 'ghagra' THEN 'Ghagra'
      WHEN LOWER(product_name) REGEXP 'frock' THEN 'Frocks'
      WHEN LOWER(product_name) REGEXP 'palazzo|plazo' THEN 'Palazzo'
      WHEN LOWER(product_name) REGEXP 'potli|pouch' THEN 'Potli Bags'
      WHEN LOWER(product_name) REGEXP 'hair clip' THEN 'Hair Clips'
      ELSE NULL
    END;

UPDATE products
SET status = 'draft', show_on_homepage = 0, is_featured = 0, is_new_arrival = 0
WHERE category_id IS NULL AND status <> 'draft';

DELETE FROM categories
WHERE category_name NOT IN ('Home & Decor', 'Kids Wear', 'Fashion & Hair Accessories');

COMMIT;

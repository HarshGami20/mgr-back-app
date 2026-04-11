-- Idempotent: drop legacy `Product` columns if they still exist (MySQL 5.7+).
-- Avoids DROP COLUMN IF EXISTS (requires MySQL 8.0.29+). Uses dynamic SQL when column is present.

SET @db = DATABASE();

-- sku
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'sku');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `sku`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- imageUris
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'imageUris');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `imageUris`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- size
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'size');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `size`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- material
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'material');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `material`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- color
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'color');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `color`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- model
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'model');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `model`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- unitPrice
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'unitPrice');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `unitPrice`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- stockQuantity
SET @exists = (SELECT COUNT(*) FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'stockQuantity');
SET @q = IF(@exists > 0, 'ALTER TABLE `Product` DROP COLUMN `stockQuantity`', 'SELECT 1');
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

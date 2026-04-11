-- Add non-sequential public reference for orders (UUID string).
ALTER TABLE `Order` ADD COLUMN `orderCode` VARCHAR(36) NULL;

UPDATE `Order` SET `orderCode` = UUID() WHERE `orderCode` IS NULL;

ALTER TABLE `Order` MODIFY `orderCode` VARCHAR(36) NOT NULL;

CREATE UNIQUE INDEX `Order_orderCode_key` ON `Order`(`orderCode`);

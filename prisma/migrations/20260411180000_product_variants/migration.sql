-- Variant model: move SKU/stock/images from Product to ProductVariant; OrderLine -> ProductVariant

CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `size` VARCHAR(191) NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `unitPrice` DOUBLE NULL,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `imageUris` JSON NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariant_sku_key`(`sku`),
    INDEX `ProductVariant_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ProductVariant` (
    `id`, `productId`, `sku`, `label`, `size`, `material`, `color`, `model`,
    `unitPrice`, `stockQuantity`, `imageUris`, `isDefault`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
    CONCAT('pv_', `id`),
    `id`,
    `sku`,
    NULL,
    `size`,
    `material`,
    `color`,
    `model`,
    `unitPrice`,
    `stockQuantity`,
    `imageUris`,
    true,
    0,
    `createdAt`,
    `updatedAt`
FROM `Product`;

ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OrderLine` ADD COLUMN `productVariantId` VARCHAR(191) NULL;

UPDATE `OrderLine` SET `productVariantId` = CONCAT('pv_', `productId`);

ALTER TABLE `OrderLine` DROP FOREIGN KEY `OrderLine_productId_fkey`;

ALTER TABLE `OrderLine` DROP COLUMN `productId`;

ALTER TABLE `OrderLine` MODIFY `productVariantId` VARCHAR(191) NOT NULL;

ALTER TABLE `OrderLine` ADD CONSTRAINT `OrderLine_productVariantId_fkey` FOREIGN KEY (`productVariantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Product` DROP INDEX `Product_sku_key`;

ALTER TABLE `Product` DROP COLUMN `sku`,
    DROP COLUMN `imageUris`,
    DROP COLUMN `size`,
    DROP COLUMN `material`,
    DROP COLUMN `color`,
    DROP COLUMN `model`,
    DROP COLUMN `unitPrice`,
    DROP COLUMN `stockQuantity`;

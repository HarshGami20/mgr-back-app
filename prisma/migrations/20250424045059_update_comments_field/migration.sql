/*
  Warnings:

  - You are about to alter the column `commentsFromStaff` on the `order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `commentsFromStaff` JSON NOT NULL;

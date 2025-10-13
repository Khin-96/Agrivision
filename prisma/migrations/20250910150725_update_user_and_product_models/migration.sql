/*
  Warnings:

  - You are about to drop the column `farmerName` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "farmLocation" TEXT;
ALTER TABLE "User" ADD COLUMN "farmName" TEXT;
ALTER TABLE "User" ADD COLUMN "farmSize" TEXT;
ALTER TABLE "User" ADD COLUMN "farmType" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "farmerId" TEXT NOT NULL,
    CONSTRAINT "Product_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("available", "category", "createdAt", "description", "farmerId", "id", "images", "name", "price", "quantity", "unit", "updatedAt") SELECT "available", "category", "createdAt", "description", "farmerId", "id", "images", "name", "price", "quantity", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

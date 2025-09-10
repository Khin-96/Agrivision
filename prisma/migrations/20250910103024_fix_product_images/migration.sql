/*
  Warnings:

  - You are about to alter the column `image` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Made the column `image` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmerName" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" JSONB NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "idFrontUrl" TEXT,
    "idBackUrl" TEXT,
    "authProvider" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("authProvider", "createdAt", "email", "emailVerified", "id", "idVerified", "image", "name", "password", "role", "updatedAt") SELECT "authProvider", "createdAt", "email", "emailVerified", "id", "idVerified", "image", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

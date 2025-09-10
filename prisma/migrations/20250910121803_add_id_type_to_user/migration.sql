-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "idFrontUrl" TEXT,
    "idBackUrl" TEXT,
    "idType" TEXT,
    "authProvider" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("authProvider", "createdAt", "email", "emailVerified", "id", "idBackUrl", "idFrontUrl", "idVerified", "image", "name", "password", "role", "updatedAt") SELECT "authProvider", "createdAt", "email", "emailVerified", "id", "idBackUrl", "idFrontUrl", "idVerified", "image", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

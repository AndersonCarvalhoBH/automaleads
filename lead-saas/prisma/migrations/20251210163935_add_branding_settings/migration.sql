/*
  Warnings:

  - You are about to drop the column `accentColor` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `brandName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColor` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryColor` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sidebarBg` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sidebarText` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `themeMode` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `cnpj` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Lead` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Branding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "sidebarColor" TEXT,
    "logoUrl" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Branding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScraperLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScraperLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Account" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_Lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "nome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "origem" TEXT,
    "categoria" TEXT,
    "tags" TEXT,
    "endereco" TEXT,
    "dadosExtras" TEXT,
    "stage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("accountId", "categoria", "createdAt", "dadosExtras", "email", "endereco", "id", "stage", "tags") SELECT "accountId", "categoria", "createdAt", "dadosExtras", "email", "endereco", "id", "stage", "tags" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("accountId", "email", "id", "name", "password", "role") SELECT "accountId", "email", "id", "name", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Branding_accountId_key" ON "Branding"("accountId");

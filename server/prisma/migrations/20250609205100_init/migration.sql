-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'WEB_APPLICATION',
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "dataClassification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "systems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "csf_baselines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subcategoryId" TEXT NOT NULL,
    "applicable" BOOLEAN NOT NULL DEFAULT false,
    "categoryLevel" TEXT NOT NULL DEFAULT 'SHOULD_HAVE',
    "justification" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "csf_baselines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compliance_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subcategoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_ASSESSED',
    "details" TEXT,
    "assessor" TEXT,
    "assessedDate" DATETIME,
    "evidence" TEXT,
    "remediationPlan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "systemId" TEXT NOT NULL,
    CONSTRAINT "compliance_assessments_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "csf_controls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "functionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "implementationExamples" TEXT,
    "informativeReferences" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "nist_80053_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "csfControlId" TEXT NOT NULL,
    "nist80053Id" TEXT NOT NULL,
    "controlFamily" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "csf_baselines_productId_subcategoryId_key" ON "csf_baselines"("productId", "subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_assessments_systemId_subcategoryId_key" ON "compliance_assessments"("systemId", "subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "nist_80053_mappings_csfControlId_nist80053Id_key" ON "nist_80053_mappings"("csfControlId", "nist80053Id");

CREATE TABLE "product_access" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_access_userId_product_key" ON "product_access"("userId", "product");
CREATE INDEX "product_access_product_role_idx" ON "product_access"("product", "role");

ALTER TABLE "product_access"
ADD CONSTRAINT "product_access_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

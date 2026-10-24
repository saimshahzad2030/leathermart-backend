-- AlterTable
ALTER TABLE "products" ADD COLUMN "is_in_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "products_is_in_stock_idx" ON "products"("is_in_stock");

/*
  Warnings:

  - You are about to drop the column `stock` on the `product_variants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "stock",
ADD COLUMN     "in_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "product_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_size_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(10) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_color_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_color_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "region_code" VARCHAR(10) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "bullet_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_policy_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_name_key" ON "product_sizes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_slug_key" ON "product_sizes"("slug");

-- CreateIndex
CREATE INDEX "product_size_assignments_product_id_idx" ON "product_size_assignments"("product_id");

-- CreateIndex
CREATE INDEX "product_size_assignments_size_id_idx" ON "product_size_assignments"("size_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_assignments_product_id_size_id_key" ON "product_size_assignments"("product_id", "size_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_name_key" ON "product_colors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_slug_key" ON "product_colors"("slug");

-- CreateIndex
CREATE INDEX "product_color_assignments_product_id_idx" ON "product_color_assignments"("product_id");

-- CreateIndex
CREATE INDEX "product_color_assignments_color_id_idx" ON "product_color_assignments"("color_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_assignments_product_id_color_id_key" ON "product_color_assignments"("product_id", "color_id");

-- CreateIndex
CREATE INDEX "product_prices_product_id_idx" ON "product_prices"("product_id");

-- CreateIndex
CREATE INDEX "product_prices_region_code_idx" ON "product_prices"("region_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_product_id_region_code_key" ON "product_prices"("product_id", "region_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_policies_slug_key" ON "product_policies"("slug");

-- CreateIndex
CREATE INDEX "product_policy_assignments_product_id_idx" ON "product_policy_assignments"("product_id");

-- CreateIndex
CREATE INDEX "product_policy_assignments_policy_id_idx" ON "product_policy_assignments"("policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_policy_assignments_product_id_policy_id_key" ON "product_policy_assignments"("product_id", "policy_id");

-- AddForeignKey
ALTER TABLE "product_size_assignments" ADD CONSTRAINT "product_size_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_assignments" ADD CONSTRAINT "product_size_assignments_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "product_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_assignments" ADD CONSTRAINT "product_color_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_assignments" ADD CONSTRAINT "product_color_assignments_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_policy_assignments" ADD CONSTRAINT "product_policy_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_policy_assignments" ADD CONSTRAINT "product_policy_assignments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "product_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

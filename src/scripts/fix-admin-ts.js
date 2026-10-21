import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('../leathermart-admin');
const MODALS_DIR = path.join(ADMIN_DIR, 'src/components/modals');

// Fix ManageSizesModal.tsx
let sizesModal = fs.readFileSync(path.join(MODALS_DIR, 'ManageSizesModal.tsx'), 'utf8');
sizesModal = sizesModal.replaceAll("toast.show('success',", "toast.success(");
sizesModal = sizesModal.replaceAll("toast.show('error',", "toast.error(");
sizesModal = sizesModal.replace(
  'variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? \'warning\' : \'danger\'}',
  'isDestructive={!(deleteTarget?.productCount && deleteTarget.productCount > 0)}'
);
fs.writeFileSync(path.join(MODALS_DIR, 'ManageSizesModal.tsx'), sizesModal, 'utf8');

// Fix ManageColorsModal.tsx
let colorsModal = fs.readFileSync(path.join(MODALS_DIR, 'ManageColorsModal.tsx'), 'utf8');
colorsModal = colorsModal.replaceAll("toast.show('success',", "toast.success(");
colorsModal = colorsModal.replaceAll("toast.show('error',", "toast.error(");
colorsModal = colorsModal.replace(
  'variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? \'warning\' : \'danger\'}',
  'isDestructive={!(deleteTarget?.productCount && deleteTarget.productCount > 0)}'
);
fs.writeFileSync(path.join(MODALS_DIR, 'ManageColorsModal.tsx'), colorsModal, 'utf8');

// Fix ManagePoliciesModal.tsx
let policiesModal = fs.readFileSync(path.join(MODALS_DIR, 'ManagePoliciesModal.tsx'), 'utf8');
policiesModal = policiesModal.replaceAll("toast.show('success',", "toast.success(");
policiesModal = policiesModal.replaceAll("toast.show('error',", "toast.error(");
policiesModal = policiesModal.replace(
  'variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? \'warning\' : \'danger\'}',
  'isDestructive={!(deleteTarget?.productCount && deleteTarget.productCount > 0)}'
);
fs.writeFileSync(path.join(MODALS_DIR, 'ManagePoliciesModal.tsx'), policiesModal, 'utf8');

// Fix ProductForm.tsx
let productForm = fs.readFileSync(path.join(ADMIN_DIR, 'src/pages/products/ProductForm.tsx'), 'utf8');
productForm = productForm.replaceAll("toast.show('success',", "toast.success(");
productForm = productForm.replaceAll("toast.show('error',", "toast.error(");

// Fix RefreshButton
productForm = productForm.replace(
  `onClick={() => {
                  refetchProduct();
                  refetchCategories();
                  refetchSizes();
                  refetchColors();
                  refetchPolicies();
                }}
                isFetching={isProductLoading}`,
  `onRefresh={() => {
                  refetchProduct();
                  refetchCategories();
                  refetchSizes();
                  refetchColors();
                  refetchPolicies();
                }}
                isRefreshing={isProductLoading}`
);

// Fix ProductRegionalPrice typing on regionalPricesPayload
productForm = productForm.replace(
  `const regionalPricesPayload = [`,
  `const regionalPricesPayload: Array<{
      regionCode: 'GLOBAL' | 'PK' | 'IT';
      currency: 'EUR' | 'PKR';
      price: number;
      salePrice: number | null;
      isActive: boolean;
    }> = [`
);

// Fix ImageUploader usage with multiple photography gallery
const oldImgUploader = `<ImageUploader images={images} onChange={setImages} />`;
const newImgUploader = `<div className="space-y-3">
                <span className="text-xs font-semibold text-secondary block">
                  Add Photography (Upload to Media Storage):
                </span>
                <ImageUploader
                  folder="products"
                  onChange={(newUrl) => {
                    if (newUrl) {
                      setImages((prev) => [
                        ...prev,
                        {
                          url: newUrl,
                          alt: name ? \`\${name} view\` : 'Garment detail',
                          isPrimary: prev.length === 0,
                          isHover: prev.length === 1,
                          sortOrder: prev.length + 1,
                        },
                      ]);
                    }
                  }}
                />

                <div className="space-y-2.5 pt-2">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-theme bg-surface-subtle/50 flex items-center gap-3 text-xs"
                    >
                      <img
                        src={img.url}
                        alt={img.alt || 'Garment preview'}
                        className="w-12 h-14 rounded-lg object-cover border border-theme shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Alt description"
                          value={img.alt || ''}
                          onChange={(e) => {
                            const copy = [...images];
                            copy[i].alt = e.target.value;
                            setImages(copy);
                          }}
                          className="text-xs h-7 mb-1"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-muted">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="primaryImage"
                              checked={img.isPrimary}
                              onChange={() => {
                                setImages(
                                  images.map((im, idx) => ({ ...im, isPrimary: idx === i }))
                                );
                              }}
                            />
                            Primary
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.isHover}
                              onChange={(e) => {
                                const copy = [...images];
                                copy[i].isHover = e.target.checked;
                                setImages(copy);
                              }}
                            />
                            Hover View
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>`;

productForm = productForm.replace(oldImgUploader, newImgUploader);

fs.writeFileSync(path.join(ADMIN_DIR, 'src/pages/products/ProductForm.tsx'), productForm, 'utf8');

console.log('✓ Applied TypeScript fixes to Modals and ProductForm');

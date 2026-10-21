import fs from 'fs';
import path from 'path';

// 1. Fix ProductForm.tsx
const formPath = path.resolve('../leathermart-admin/src/pages/products/ProductForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

formContent = formContent.replace(
  /const \[isPublished,[\s\S]*?setIsPublished\] = useState\(true\);\s*const \[isInStock, setIsInStock\] = useState\(true\);/,
  'const [isPublished, setIsPublished] = useState(true);\n  const [isInStock, setIsInStock] = useState(true);'
);

if (!formContent.includes('isPublished,\n      isInStock,')) {
  formContent = formContent.replace(
    'isPublished,\n      isFeatured,',
    'isPublished,\n      isInStock,\n      isFeatured,'
  );
}
fs.writeFileSync(formPath, formContent, 'utf8');
console.log('Fixed ProductForm.tsx');

// 2. Fix admin lib/api/products.ts ProductQueryParams
const apiPath = path.resolve('../leathermart-admin/src/lib/api/products.ts');
let apiContent = fs.readFileSync(apiPath, 'utf8');
if (!apiContent.includes('in_stock?: boolean')) {
  apiContent = apiContent.replace(
    "status?: 'published' | 'draft' | 'all';",
    "status?: 'published' | 'draft' | 'all';\n  in_stock?: boolean | string;\n  isInStock?: boolean | string;\n  is_in_stock?: boolean | string;"
  );
  fs.writeFileSync(apiPath, apiContent, 'utf8');
  console.log('Fixed admin ProductQueryParams');
}

// 3. Fix storefront types/product.ts
const sfTypesPath = path.resolve('../leathermart/src/types/product.ts');
let sfTypesContent = fs.readFileSync(sfTypesPath, 'utf8');

if (!sfTypesContent.includes('isPublished: boolean;\n  isInStock?: boolean;')) {
  sfTypesContent = sfTypesContent.replace(
    'isPublished: boolean;',
    'isPublished: boolean;\n  isInStock?: boolean;'
  );
  fs.writeFileSync(sfTypesPath, sfTypesContent, 'utf8');
  console.log('Fixed storefront Product interface with isInStock');
}

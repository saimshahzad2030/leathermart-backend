import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('../leathermart-admin');

console.log('Targeting admin directory:', ADMIN_DIR);

if (!fs.existsSync(ADMIN_DIR)) {
  console.error('Admin directory does not exist:', ADMIN_DIR);
  process.exit(1);
}

// 1. Update src/types/index.ts
const typesFile = path.join(ADMIN_DIR, 'src/types/index.ts');
let typesContent = fs.readFileSync(typesFile, 'utf8');

// Replace ProductVariant stock: number with inStock: boolean
if (!typesContent.includes('inStock: boolean;')) {
  typesContent = typesContent.replace(
    /export interface ProductVariant \{[\s\S]*?\}/,
    `export interface ProductVariant {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  inStock: boolean;
  stock?: number;
  priceOverride?: number | null;
}`
  );
}

// Add ProductSize, ProductColor, ProductPolicy, ProductRegionalPrice if missing
if (!typesContent.includes('export interface ProductSize')) {
  const newTypes = `
// Reusable Sizing
export interface ProductSize {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Reusable Colors
export interface ProductColor {
  id: string;
  name: string;
  slug: string;
  hex: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Reusable Policies
export interface ProductPolicy {
  id: string;
  name: string;
  slug: string;
  description: string;
  bulletPoints?: string[];
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Regional Product Pricing
export interface ProductRegionalPrice {
  id?: string;
  productId?: string;
  regionCode: 'GLOBAL' | 'PK' | 'IT';
  currency: 'EUR' | 'PKR';
  price: number;
  salePrice?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
`;
  typesContent = typesContent.replace(
    '// Product Catalogue Models',
    `// Product Catalogue Models${newTypes}`
  );
}

// Add relational fields to Product interface
if (!typesContent.includes('regionalPrices?: ProductRegionalPrice[];')) {
  typesContent = typesContent.replace(
    'availableSizes?: string[];',
    `availableSizes?: string[];
  inStock?: boolean;
  sizes?: ProductSize[];
  colors?: ProductColor[];
  policies?: ProductPolicy[];
  regionalPrices?: ProductRegionalPrice[];
  resolvedPrice?: {
    market: 'GLOBAL' | 'PK' | 'IT';
    currency: 'EUR' | 'PKR';
    currencySymbol: string;
    price: number;
    salePrice: number | null;
    isDiscounted: boolean;
    formattedPrice: string;
    formattedSalePrice: string | null;
  };`
  );
}

fs.writeFileSync(typesFile, typesContent, 'utf8');
console.log('✓ Updated src/types/index.ts');

// 2. Create API client files in src/lib/api/
const sizesApiFile = path.join(ADMIN_DIR, 'src/lib/api/sizes.ts');
const sizesApiContent = `import { apiClient } from './client';
import { ApiResponse, ProductSize } from '@/types';

export interface SizeQueryParams {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}

export const sizesApi = {
  listSizes: async (params: SizeQueryParams = {}): Promise<ProductSize[]> => {
    const res = await apiClient.get<ApiResponse<ProductSize[]>>('/admin/sizes', { params });
    return res.data.data || [];
  },

  getSize: async (id: string): Promise<ProductSize> => {
    const res = await apiClient.get<ApiResponse<ProductSize>>(\`/admin/sizes/\${id}\`);
    return res.data.data;
  },

  createSize: async (payload: {
    name: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<ProductSize> => {
    const res = await apiClient.post<ApiResponse<ProductSize>>('/admin/sizes', payload);
    return res.data.data;
  },

  updateSize: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<ProductSize> => {
    const res = await apiClient.put<ApiResponse<ProductSize>>(\`/admin/sizes/\${id}\`, payload);
    return res.data.data;
  },

  toggleActive: async (id: string): Promise<ProductSize> => {
    const res = await apiClient.patch<ApiResponse<ProductSize>>(\`/admin/sizes/\${id}/toggle-active\`);
    return res.data.data;
  },

  deleteSize: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(\`/admin/sizes/\${id}\`);
  },
};
`;
fs.writeFileSync(sizesApiFile, sizesApiContent, 'utf8');
console.log('✓ Created src/lib/api/sizes.ts');

const colorsApiFile = path.join(ADMIN_DIR, 'src/lib/api/colors.ts');
const colorsApiContent = `import { apiClient } from './client';
import { ApiResponse, ProductColor } from '@/types';

export interface ColorQueryParams {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}

export const colorsApi = {
  listColors: async (params: ColorQueryParams = {}): Promise<ProductColor[]> => {
    const res = await apiClient.get<ApiResponse<ProductColor[]>>('/admin/colors', { params });
    return res.data.data || [];
  },

  getColor: async (id: string): Promise<ProductColor> => {
    const res = await apiClient.get<ApiResponse<ProductColor>>(\`/admin/colors/\${id}\`);
    return res.data.data;
  },

  createColor: async (payload: {
    name: string;
    slug?: string;
    hex: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<ProductColor> => {
    const res = await apiClient.post<ApiResponse<ProductColor>>('/admin/colors', payload);
    return res.data.data;
  },

  updateColor: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      hex?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<ProductColor> => {
    const res = await apiClient.put<ApiResponse<ProductColor>>(\`/admin/colors/\${id}\`, payload);
    return res.data.data;
  },

  toggleActive: async (id: string): Promise<ProductColor> => {
    const res = await apiClient.patch<ApiResponse<ProductColor>>(\`/admin/colors/\${id}/toggle-active\`);
    return res.data.data;
  },

  deleteColor: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(\`/admin/colors/\${id}\`);
  },
};
`;
fs.writeFileSync(colorsApiFile, colorsApiContent, 'utf8');
console.log('✓ Created src/lib/api/colors.ts');

const policiesApiFile = path.join(ADMIN_DIR, 'src/lib/api/policies.ts');
const policiesApiContent = `import { apiClient } from './client';
import { ApiResponse, ProductPolicy } from '@/types';

export interface PolicyQueryParams {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}

export const policiesApi = {
  listPolicies: async (params: PolicyQueryParams = {}): Promise<ProductPolicy[]> => {
    const res = await apiClient.get<ApiResponse<ProductPolicy[]>>('/admin/policies', { params });
    return res.data.data || [];
  },

  getPolicy: async (id: string): Promise<ProductPolicy> => {
    const res = await apiClient.get<ApiResponse<ProductPolicy>>(\`/admin/policies/\${id}\`);
    return res.data.data;
  },

  createPolicy: async (payload: {
    name: string;
    slug?: string;
    description: string;
    bulletPoints?: string[];
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<ProductPolicy> => {
    const res = await apiClient.post<ApiResponse<ProductPolicy>>('/admin/policies', payload);
    return res.data.data;
  },

  updatePolicy: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      description?: string;
      bulletPoints?: string[];
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<ProductPolicy> => {
    const res = await apiClient.put<ApiResponse<ProductPolicy>>(\`/admin/policies/\${id}\`, payload);
    return res.data.data;
  },

  toggleActive: async (id: string): Promise<ProductPolicy> => {
    const res = await apiClient.patch<ApiResponse<ProductPolicy>>(\`/admin/policies/\${id}/toggle-active\`);
    return res.data.data;
  },

  deletePolicy: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(\`/admin/policies/\${id}\`);
  },
};
`;
fs.writeFileSync(policiesApiFile, policiesApiContent, 'utf8');
console.log('✓ Created src/lib/api/policies.ts');

console.log('API clients created successfully.');

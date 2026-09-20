export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STORE_MANAGER: 'store_manager',
  CONTENT_EDITOR: 'content_editor',
  CONCIERGE: 'concierge',
};

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  CONTACTED: 'contacted',
  IN_TAILORING: 'in_tailoring',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const GENDERS = {
  MEN: 'men',
  WOMEN: 'women',
  UNISEX: 'unisex',
};

export const PRODUCT_STYLES = [
  'classic',
  'vintage',
  'biker',
  'minimal',
  'luxury',
  'shearling',
];

export const SORT_OPTIONS = {
  FEATURED: 'featured',
  NEWEST: 'newest',
  PRICE_ASC: 'price-asc',
  PRICE_DESC: 'price-desc',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 48;

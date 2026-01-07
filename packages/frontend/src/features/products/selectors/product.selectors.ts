// features/products/selectors/product.selectors.ts

import type { Product } from '@/features/products/types/product.types';
import type { ProductMini } from '@/features/products/types/product.mini';

// Маппер Product → ProductMini (для AI, UI select)
export const toProductMini = (p: Product): ProductMini => ({
  id: p.id,
  name: p.name,
  type: p.type === 'membership' ? 'subscription' : 'one-time', // можна кастомізувати
  price: p.price,
  format: p.format,
  integration: p.integration,
  includesMentorship: p.includesMentorship,
});

// Селектор: отримати всі продукти як ProductMini
export const selectAllProductMini = (products: Product[]): ProductMini[] =>
  products.map(toProductMini);

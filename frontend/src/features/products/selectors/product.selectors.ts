// features/products/selectors/product.selectors.ts

import type { ProductMini } from '@/features/products/types/product.mini';
import { toProductMini } from '@/features/products/types/product.types';
import type { Product } from '@/shared/types/product.types';

export const selectAllProductMini = (products: Product[]): ProductMini[] =>
  products.map(toProductMini);

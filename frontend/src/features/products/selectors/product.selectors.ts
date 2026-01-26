// features/products/selectors/product.selectors.ts

import { toProductMini } from '@/features/products/types/product.mappers';
import type { ProductMini } from '@/features/products/types/product.mini';
import type { Product } from '@/shared/types/product.types';

export const selectAllProductMini = (products: Product[]): ProductMini[] =>
  products.map(toProductMini);

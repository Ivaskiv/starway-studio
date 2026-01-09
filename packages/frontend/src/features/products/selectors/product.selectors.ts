// features/products/selectors/product.selectors.ts

import type { Product } from '@/features/products/types/product.types'
import type { ProductMini } from '@/features/products/types/product.mini'
import { toProductMini } from '@/features/products/types/product.mappers'

export const selectAllProductMini = (products: Product[]): ProductMini[] =>
  products.map(toProductMini)

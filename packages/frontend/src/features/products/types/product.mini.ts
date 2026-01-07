// frontend/src/features/products/types/product.mini.ts

import { ProductBase } from "@/features/products/types/product.base"

export interface ProductMini extends ProductBase {
  type: 'subscription' | 'one-time'
  format: 'web' | 'mini-app' | 'telegram-task'
  integration: 'telegram' | 'other'
  includesMentorship: boolean
}
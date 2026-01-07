// frontend/src/features/products/types/product.ai.ts

import { ProductMini } from "@/features/products/types/product.mini";

export interface ProductForAI extends ProductMini {
  goal: 'lead' | 'sale'
}
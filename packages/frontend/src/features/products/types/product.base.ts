// features/products/types/product.base.ts

// product.base.ts        ← базові enum / спільні типи
// product.types.ts       ← ПОВНИЙ продукт (API, БД)
// product.form.ts        ← ProductFormInputs
// product.mini.ts        ← ProductMini (UI / select)
// product.ai.ts          ← ProductForAI (AI-контекст)
// product.labels.ts      ← лейбли, валюти
// product.education.ts   ← Module / Lesson / Quiz / Task


export type Currency = 'UAH' | 'USD' | 'EUR'
export type ProductStatus = 'draft' | 'published' | 'archived'

export type ProductType =
  | 'course'
  | 'membership'
  | 'coaching'
  | 'digital_product'
  | 'webinar'
  | 'ebook'
  | 'mini_app'
  | 'telegram_bot'
  | 'service'
  | 'physical_product'
  | 'other'

export type ProductFormat =
  | 'web'
  | 'mini_app'
  | 'telegram_task'
  | 'mixed'

export type ProductIntegration =
  | 'telegram'
  | 'web'
  | 'future'

  export interface ProductBase {
  id: string
  name: string
  price: number
}
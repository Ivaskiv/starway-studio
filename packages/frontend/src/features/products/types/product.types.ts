// packages/frontend/src/features/products/types/product.types.ts

import type { Module } from '@/features/modules/module.types'

/* ───── CORE TYPES ───── */
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

export type ProductFormat = 'web' | 'mini_app' | 'telegram_task' | 'mixed'
export type ProductIntegration = 'telegram' | 'web' | 'future'

/* ───── MAIN ENTITY ───── */
export interface Product {
  id: string
  name: string
  description?: string
  type?: ProductType
  price: number
  currency: Currency
  status: ProductStatus
  includesTrial: boolean
  trialDays: number
  includesMentorship: boolean
  format?: ProductFormat
  integration?: ProductIntegration
  thumbnailUrl?: string
  modules: Module[]
  funnelId: string
  goals: string[]
  created_at: string
  updated_at?: string
  publishedAt?: string
}

/* ───── FORM INPUTS ───── */
export interface ProductFormInputs {
  name: string
  description?: string
  type: ProductType
  price: number
  currency: Currency
  includesTrial: boolean
  trialDays: number
  includesMentorship: boolean
  format: ProductFormat
  integration: ProductIntegration
  status: ProductStatus
  thumbnailUrl?: string
  modules: string[] // тільки ID модулів
  resolvedModules: Module[]
}

/* ───── MINI PRODUCT ───── */
export interface ProductMini {
  id: string
  name: string
  price: number
  type: 'subscription' | 'one-time'
  format: 'web' | 'mini-app' | 'telegram-task'
  integration: 'telegram' | 'other'
  includesMentorship: boolean
}

/* ───── MAPS & MAPPERS ───── */
const TYPE_MAP: Record<NonNullable<Product['type']>, ProductMini['type']> = {
  membership: 'subscription',
  coaching: 'subscription',
  course: 'one-time',
  ebook: 'one-time',
  webinar: 'one-time',
  digital_product: 'one-time',
  service: 'one-time',
  physical_product: 'one-time',
  mini_app: 'one-time',
  telegram_bot: 'one-time',
  other: 'one-time',
}

export const FORMAT_MAP: Record<NonNullable<Product['format']>, ProductMini['format']> = {
  web: 'web',
  mini_app: 'mini-app',
  telegram_task: 'telegram-task',
  mixed: 'web',
}

export const INTEGRATION_MAP: Record<NonNullable<Product['integration']>, ProductMini['integration']> = {
  telegram: 'telegram',
  web: 'other',
  future: 'other',
}

export const toProductMini = (p: Product): ProductMini => ({
  id: p.id,
  name: p.name,
  price: p.price,
  type: p.type ? TYPE_MAP[p.type] : 'one-time',
  format: p.format ? FORMAT_MAP[p.format] : 'web',
  integration: p.integration ? INTEGRATION_MAP[p.integration] : 'other',
  includesMentorship: p.includesMentorship,
})

/* ───── FORM ↔ API PAYLOAD ───── */
export const productToForm = (product?: Partial<Product>): ProductFormInputs => ({
  name: product?.name ?? '',
  description: product?.description ?? '',
  type: product?.type ?? 'membership',
  price: product?.price ?? 0,
  currency: product?.currency ?? 'EUR',
  includesTrial: product?.includesTrial ?? false,
  trialDays: product?.trialDays ?? 7,
  includesMentorship: product?.includesMentorship ?? false,
  format: product?.format ?? 'mini_app',
  integration: product?.integration ?? 'telegram',
  status: product?.status ?? 'draft',
  thumbnailUrl: product?.thumbnailUrl ?? '',
  modules: product?.modules?.map(m => m.id) ?? [],
  resolvedModules: product?.modules ?? [],
})

export const formToCreatePayload = (
  form: ProductFormInputs,
  funnelId = ''
): Omit<Product, 'id' | 'created_at' | 'updated_at'> => ({
  name: form.name,
  description: form.description,
  type: form.type,
  price: form.price,
  currency: form.currency,
  includesTrial: form.includesTrial,
  trialDays: form.trialDays,
  includesMentorship: form.includesMentorship,
  format: form.format,
  integration: form.integration,
  status: form.status,
  thumbnailUrl: form.thumbnailUrl,
  modules: form.modules.map(id => ({ id }) as Module),
  funnelId,
  goals: [],
})

export const formToUpdatePayload = (form: ProductFormInputs): Partial<Product> => ({
  name: form.name,
  description: form.description,
  type: form.type,
  price: form.price,
  currency: form.currency,
  includesTrial: form.includesTrial,
  trialDays: form.trialDays,
  includesMentorship: form.includesMentorship,
  format: form.format,
  integration: form.integration,
  status: form.status,
  thumbnailUrl: form.thumbnailUrl,
  modules: form.modules.map(id => ({ id }) as Module),
})

// features/products/types/product.mappers.ts
import { Module } from '@/features/modules/module.types'
import type { ProductForAI } from './product.ai'
import type { ProductMini } from './product.mini'
import type { Product, ProductFormInputs } from './product.types'

/* ───── MAPS ───── */

const TYPE_MAP: Record<Product['type'], ProductMini['type']> = {
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

const FORMAT_MAP: Record<Product['format'], ProductMini['format']> = {
  web: 'web',
  mini_app: 'mini-app',
  telegram_task: 'telegram-task',
  mixed: 'web',
}

const INTEGRATION_MAP: Record<Product['integration'], ProductMini['integration']> = {
  telegram: 'telegram',
  web: 'other',
  future: 'other',
}

/* ───── MAPPERS ───── */

export const toProductMini = (p: Product): ProductMini => ({
  id: p.id,
  name: p.name,
  price: p.price,

  type: TYPE_MAP[p.type],
  format: FORMAT_MAP[p.format],
  integration: INTEGRATION_MAP[p.integration],

  includesMentorship: p.includesMentorship,
})

export const toProductForAI = (p: Product): ProductForAI => ({
  id: p.id,
  format: FORMAT_MAP[p.format],
  integration: INTEGRATION_MAP[p.integration],
  includesMentorship: p.includesMentorship,
  name: p.name,
  price: p.price,
  type: TYPE_MAP[p.type],

  goal: p.includesTrial ? 'lead' : 'sale',
  purpose: p.includesMentorship
    ? 'Глибока трансформація з супроводом'
    : 'Швидкий результат без супроводу',
})

export const productToForm = (product?: Partial<Product>): ProductFormInputs => {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',

    type: (product?.type ?? 'membership') as ProductFormInputs['type'],
    price: product?.price ?? 0,
    currency: product?.currency ?? 'EUR',

    includesTrial: product?.includesTrial ?? false,
    trialDays: product?.trialDays ?? 7,
    includesMentorship: product?.includesMentorship ?? false,

    format: (product?.format ?? 'mini_app') as ProductFormInputs['format'],
    integration: (product?.integration ?? 'telegram') as ProductFormInputs['integration'],

    status: (product?.status ?? 'draft') as ProductFormInputs['status'],
    thumbnailUrl: product?.thumbnailUrl ?? '',

    modules: product?.modules?.map((m: Module) => m.id) ?? [],
    resolvedModules: product?.modules ?? [], 
  }
}


/* ───── FORM → API PAYLOAD ───── */


export const formToCreatePayload = (form: ProductFormInputs): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> => ({
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
  modules: form.modules.map(id => ({ id } as Module)),
  funnelId: '', // можна додати у формі
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
  modules: form.modules.map(id => ({ id } as Module)),
})

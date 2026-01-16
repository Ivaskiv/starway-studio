// // packages/frontend/src/features/products/types/product.mappers.ts

// import type { Module } from '@/features/modules/module.types'
// import type { ProductMini } from './product.mini'
// import type { Product, ProductFormInputs } from './product.types'

// // ============ CONST MAPS ============
// const TYPE_MAP: Record<NonNullable<Product['type']>, ProductMini['type']> = {
//   membership: 'subscription',
//   coaching: 'subscription',
//   course: 'one-time',
//   ebook: 'one-time',
//   webinar: 'one-time',
//   digital_product: 'one-time',
//   service: 'one-time',
//   physical_product: 'one-time',
//   mini_app: 'one-time',
//   telegram_bot: 'one-time',
//   other: 'one-time',
//   type: 'one-time',
// }

// export const FORMAT_MAP: Record<NonNullable<Product['format']>, ProductMini['format']> = {
//   web: 'web',
//   mini_app: 'mini-app',
//   telegram_task: 'telegram-task',
//   mixed: 'web',
// }

// export const INTEGRATION_MAP: Record<NonNullable<Product['integration']>, ProductMini['integration']> = {
//   telegram: 'telegram',
//   web: 'other',
//   future: 'other',
// }

// // ============ MAPPERS ============
// export const toProductMini = (p: Product): ProductMini => ({
//   id: p.id,
//   name: p.name,
//   price: p.price,
//   type: p.type ? TYPE_MAP[p.type] : 'one-time',
//   format: p.format ? FORMAT_MAP[p.format] : 'web',
//   integration: p.integration ? INTEGRATION_MAP[p.integration] : 'other',
//   includesMentorship: p.includesMentorship,
// })

// export interface ProductForAI {
//   id: string
//   format: ProductMini['format']
//   integration: ProductMini['integration']
//   type: ProductMini['type']
//   includesMentorship: boolean
//   name: string
//   price: number
//   goal: 'lead' | 'sale'
//   purpose: string
// }

// export const toProductForAI = (p: Product): ProductForAI => ({
//   id: p.id,
//   format: p.format ? FORMAT_MAP[p.format] : 'web',
//   integration: p.integration ? INTEGRATION_MAP[p.integration] : 'other',
//   type: p.type ? TYPE_MAP[p.type] : 'one-time',
//   includesMentorship: p.includesMentorship,
//   name: p.name,
//   price: p.price,
//   goal: p.includesTrial ? 'lead' : 'sale',
//   purpose: p.includesMentorship
//     ? 'Глибока трансформація з супроводом'
//     : 'Швидкий результат без супроводу',
// })

// export const productToForm = (product?: Partial<Product>): ProductFormInputs => ({
//   name: product?.name ?? '',
//   description: product?.description ?? '',
//   type: product?.type ?? 'membership',
//   price: product?.price ?? 0,
//   currency: product?.currency ?? 'EUR',
//   includesTrial: product?.includesTrial ?? false,
//   trialDays: product?.trialDays ?? 7,
//   includesMentorship: product?.includesMentorship ?? false,
//   format: product?.format ?? 'mini_app',
//   integration: product?.integration ?? 'telegram',
//   status: product?.status ?? 'draft',
//   thumbnailUrl: product?.thumbnailUrl ?? '',
//   modules: product?.modules?.map((m) => m.id) ?? [],
//   resolvedModules: product?.modules ?? [],
// })

// // ============ FORM → API PAYLOAD ============
// export const formToCreatePayload = (
//   form: ProductFormInputs,
//   funnelId = ''
// ): Omit<Product, 'id' | 'created_at' | 'updated_at'> => ({
//   name: form.name,
//   description: form.description,
//   type: form.type,
//   price: form.price,
//   currency: form.currency,
//   includesTrial: form.includesTrial,
//   trialDays: form.trialDays,
//   includesMentorship: form.includesMentorship,
//   format: form.format,
//   integration: form.integration,
//   status: form.status,
//   thumbnailUrl: form.thumbnailUrl,
//   modules: form.modules.map((id) => ({ id }) as Module),
//   funnelId,
//   goals: [],
// })

// export const formToUpdatePayload = (form: ProductFormInputs): Partial<Product> => ({
//   name: form.name,
//   description: form.description,
//   type: form.type,
//   price: form.price,
//   currency: form.currency,
//   includesTrial: form.includesTrial,
//   trialDays: form.trialDays,
//   includesMentorship: form.includesMentorship,
//   format: form.format,
//   integration: form.integration,
//   status: form.status,
//   thumbnailUrl: form.thumbnailUrl,
//   modules: form.modules.map((id) => ({ id }) as Module),
// })
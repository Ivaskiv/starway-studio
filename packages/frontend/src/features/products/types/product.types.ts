// features/products/types/product.types.ts

import { Module } from "@/features/modules/module.types"



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
  | 'type'

export type ProductFormat =
  | 'web'
  | 'mini_app'
  | 'telegram_task'
  | 'mixed'

export type ProductIntegration =
  | 'telegram'
  | 'web'
  | 'future'

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

  modules: string[] 

  resolvedModules: Module[]
}
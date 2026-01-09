// features/products/types/product.labels.ts

import type { ProductType, Currency } from './product.types'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  course: 'Онлайн-курс',
  membership: 'Підписка',
  coaching: 'Коучинг',
  digital_product: 'Цифровий продукт',
  webinar: 'Вебінар',
  ebook: 'Електронна книга',
  mini_app: 'Telegram Mini App',
  telegram_bot: 'Telegram-бот',
  service: 'Послуга',
  physical_product: 'Фізичний товар',
  other: 'Інше',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  UAH: 'Гривня',
  USD: 'Долар',
  EUR: 'Євро',
}

export const CURRENCY_SYMBOL_LABELS: Record<Currency, string> = {
  UAH: '₴ (Гривня)',
  USD: '$ (Долар)',
  EUR: '€ (Євро)',
}

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_LABELS).map(
  ([value, label]) => ({
    value,
    label,  
  })
)
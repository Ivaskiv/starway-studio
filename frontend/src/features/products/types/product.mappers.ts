// /features/products/types/product.mappers.ts
import type { Product } from '@/shared/types/product.types';

// ⚠️ НЕ ІМПОРТУЄМО ProductForAI звідси, щоб уникнути циклічної залежності
// ProductForAI оголошено в @/features/ai-generator/types/generator.types.ts

/**
 * Конвертує повний Product в спрощений об'єкт для AI generator
 * Повертає тип, сумісний з ProductForAI
 */
export function toProductForAI(product: Product) {
  return {
    id: product.id,
    name: product.name,
    title: product.title,
    type: product.type,
    price: product.price,
    format: product.format,
    includesMentorship: product.includesMentorship,
  };
}

/**
 * Конвертує масив продуктів для AI
 */
export function toProductsForAI(products: Product[]) {
  return products.map(toProductForAI);
}

// Тип для TypeScript inference
export type ProductForAIShape = ReturnType<typeof toProductForAI>;

// backend/src/modules/ai-mentor/services/index.ts

/**
 * Services Index
 * Збираємо всі сервіси для імпорту в інших модулях
 */

// Експортуємо все окремо, але без дублювань
export * from './ai.js';
export * from './session.js';
export * from './setup.js';
export * from './daily.js';
export * from './context.js';

// Для chat робимо **лише явний експорт**, без export * 
// щоб уникнути конфліктів з getSession / getChatHistory
export { sendMessage, getSession, getChatHistory } from './chat.js';
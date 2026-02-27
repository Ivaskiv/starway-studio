// backend/src/utils/serverError.ts

import { Response } from 'express'; // імпорт Response для типізації res

// структура відповіді на помилку
export interface ErrorPayload {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * 500 – внутрішня помилка сервера
 * @param res – Express Response
 * @param context – контекст логування
 * @param error – об’єкт помилки
 */
export function serverError(
  res: Response,
  context: string,
  error: unknown
): Response {
  console.error(`❌ ${context}`, error);

  const payload: ErrorPayload = {
    error: 'server_error',
    message: 'Внутрішня помилка сервера',
  };

  // додаємо деталі помилки тільки у development
  if (process.env.NODE_ENV === 'development') {
    payload.details = error instanceof Error ? error.message : String(error);
  }

  return res.status(500).json(payload);
}

/**
 * Кастомна помилка з будь-яким статусом
 * @param res – Express Response
 * @param status – HTTP статус
 * @param errorCode – код помилки
 * @param message – повідомлення
 * @param details – додаткові дані (optional)
 */
export function sendError(
  res: Response,
  status: number,
  errorCode: string,
  message: string,
  details?: unknown
): Response {
  const payload: ErrorPayload = {
    error: errorCode,
    message,
  };

  if (details && process.env.NODE_ENV === 'development') {
    payload.details = details;
  }

  return res.status(status).json(payload);
}

/**
 * Перетворення значення на число без помилок типізації
 * @param value – рядок або число
 */
export function toNumber(value: unknown): number {
  // якщо рядок, парсимо як int, інакше просто Number(value)
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number(value);
}
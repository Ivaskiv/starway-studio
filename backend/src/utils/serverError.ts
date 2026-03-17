import type { Response } from 'express';

export interface ErrorPayload {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * 500 – внутрішня помилка сервера
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

  if (process.env.NODE_ENV === 'development') {
    payload.details = error instanceof Error ? error.message : String(error);
  }

  return res.status(500).send(payload); // ✅ send() повністю сумісний з Response
}

/**
 * Кастомна помилка з будь-яким статусом
 */
export function sendError(
  res: Response,
  status: number,
  errorCode: string,
  message: string,
  details?: unknown
): Response {
  const payload: ErrorPayload = { error: errorCode, message };

  if (details && process.env.NODE_ENV === 'development') {
    payload.details = details;
  }

  return res.status(status).send(payload); // ✅ замість json()
}

/**
 * Перетворення значення на число
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number(value);
}
// starway-studio/backend/src/utils/serverError.ts
import type { Response } from 'express';

export function serverError(
  res: Response,
  scope: string, //scope — щоб в логах одразу було видно, де впало
  err: unknown //unknown, а не any → чистий TS
): Response {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`❌ [${scope}]`, err);
  
  return res.status(500).json({
    error: 'server_error',
    scope,
    message,
  });
}

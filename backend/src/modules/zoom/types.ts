// backend/src/modules/zoom/types.ts

import type { ZoomSession, ZoomSessionAttendee, User } from '@/db/generated/prisma/client.js';

// Re-export Prisma типів як є — не дублюємо вручну
export type { ZoomSession, ZoomSessionAttendee };

// Розширений тип для запиту з include: { user }
export type ZoomAttendeeWithUser = ZoomSessionAttendee & {
  user: Pick<User, 'id' | 'name' | 'email'>;
};

// DTO для створення сесії (те що приходить з body)
export interface CreateZoomSessionDto {
  scheduledAt: string | Date;
  requests:    unknown;   // Json у схемі — масив тем/запитів від attendees
}
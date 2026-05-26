// backend/src/modules/zoom/types.ts

import type { ZoomSession, ZoomSessionAttendee, User } from '@starway/db/prisma-client';

// Re-export Prisma типів як є — не дублюємо вручну
export type { ZoomSession, ZoomSessionAttendee };

// Розширений тип для запиту з include: { user }
export type ZoomAttendeeWithUser = ZoomSessionAttendee & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

// DTO для створення сесії (те що приходить з body)
export interface CreateZoomSessionDto {
  scheduledAt: string | Date;
  requests:    unknown;   // Json у схемі — масив тем/запитів від attendees
}

export interface ZoomSessionWithAttendance {
  id:                string;
  expertId:          string | null;
  scheduledAt:       string;
  topic:             string;
  status:            string;
  requests:          unknown[];
  postSessionReport: unknown | null;
  createdAt:         string;
  updatedAt:         string;
  isRegistered:      boolean;
  attendeeId?:       string;
}

// frontend/src/features/zoom/types/zoom.types.ts
// Типи Zoom-сесій — синхронізовано з Prisma ZoomSession/ZoomSessionAttendee
// Використовується в: zoom.api.ts, useZoom.ts, компонентах

export type ZoomStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/** Запит юзера на сесію (ZoomSession.requests: Json[]) */
export interface SessionRequest {
  userId:    string;
  topic:     string;
  question?: string;
  time?:     string;
  createdAt: string;
}

/** Звіт після сесії (ZoomSession.postSessionReport: Json) */
export interface PostSessionReport {
  summary:      string;
  actionItems:  string[];
  nextFocus?:   string;
  mentorNotes?: string;
}

/** Prisma ZoomSession → DTO (scheduledAt як ISO string) */
export interface ZoomSessionDTO {
  id:                string;
  expertId:          string | null;
  scheduledAt:       string;
  topic:             string;
  status:            ZoomStatus;
  requests:          SessionRequest[];
  postSessionReport: PostSessionReport | null;
  createdAt:         string;
  updatedAt:         string;
}

/** ZoomSessionAttendee DTO */
export interface ZoomAttendeeDTO {
  id:        string;
  sessionId: string;
  userId:    string;
  attended:  boolean;
  createdAt: string;
}

/** Розширена сесія з attendance-статусом для поточного юзера */
export interface ZoomSessionWithAttendance extends ZoomSessionDTO {
  isRegistered: boolean;
  attendeeId?:  string;
}

export interface RegisterAttendeeDto   { sessionId: string }
export interface SubmitSessionRequestDto {
  sessionId: string;
  topic:     string;
  question?: string;
  time?:     string;
}
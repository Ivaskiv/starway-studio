// backend/src/modules/zoom/types.ts
/**
 * Zoom Types
 */

export interface ZoomSession {
  id: string;
  scheduledAt: Date;
  topic: string;
  meetingUrl?: string;
  createdAt: Date;
}

export interface ZoomAttendee {
  id: string;
  userId: string;
  sessionId: string;
  requestTopic?: string;
  decisionMade?: string;
  createdAt: Date;
}
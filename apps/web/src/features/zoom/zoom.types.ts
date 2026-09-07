// apps/web/src/features/zoom/zoom.types.ts

export const COACH_ZOOM_SESSION_TYPES = ['group_practice', 'individual', 'intensive', 'battle_review'] as const

export type CoachZoomSessionType = typeof COACH_ZOOM_SESSION_TYPES[number]

export type ZoomSessionType = CoachZoomSessionType | 'PRIVATE' | 'GROUP' | string;

export type ZoomStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ZoomCalendarMode = 'coach' | 'user';

export type CalendarView = 'week' | 'month';

export interface ZoomSessionRequests {
  type: ZoomSessionType;
  productId?: string;
  zoomLink: string;
  maxAttendees?: number;
  battleId?: string | null;
  challengerId?: string;
  opponentId?: string;
  winnerId?: string | null;
  battleStatus?: 'pending' | 'active' | 'completed' | 'cancelled';
  entryFee?: number;
  notify24h: boolean;
  notify2h: boolean;
  notifiedAt24h: string | null;
  notifiedAt2h: string | null;
}

export type SlotStatus = 'available' | 'booked';

export interface ZoomCalendarSession {
  id: string;
  scheduledAt: string;
  topic: string;
  status: ZoomStatus;
  type: ZoomSessionType;
  zoomLink: string;
  audioFileId?: string | null;
  attendeesCount?: number;
  questionPreviews?: string[];
  questionsCount?: number;
  remainingQuestionsCount?: number;
  notifiedAt24h?: string | null;
  notifiedAt2h?: string | null;
  goalText?: string | null;
  goalA?: string | null;
  goalB?: string | null;
  battleProgress?: BattleProgressEntry[];
  progressA?: number;
  progressB?: number;
  battleStatus?: 'pending' | 'active' | 'completed' | 'cancelled' | null;
  challengerId?: string | null;
  opponentId?: string | null;
  attended?: boolean;
  canEdit: boolean;
  slotStatus?: SlotStatus;
  remainingSlots?: number;
  isMyBooking?: boolean;
  priceCents?: number;
  durationMinutes?: number;
}

export interface ZoomWeekAudio {
  sessionId: string;
  scheduledAt: string;
  topic: string;
  status: ZoomStatus;
  type: ZoomSessionType;
  audioFileId: string;
}

export interface ZoomWeekOverview {
  week: {
    from: string;
    to: string;
    timezone: string;
  };
  sessions: ZoomCalendarSession[];
  audios: ZoomWeekAudio[];
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
  timezone: string;
  sessionType: ZoomSessionType;
  maxSlots: number;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  defaultTopic?: string;
}

export interface CreateSessionPayload {
  scheduledAt: string;
  topic: string;
  type: ZoomSessionType;
  zoomLink?: string;
  productId?: string;
  participantUserId?: string;
  participantUserIds?: string[];
  maxAttendees?: number;
}

export interface LeaderboardEntry {
  userId: string;
  battleWins: number;
  bestStreak: number;
  mindXP: number;
  level: number;
}

export interface BattleProgressEntry {
  day: number;
  text: string;
  createdAt: string;
}

export interface ZoomSwapRequest {
  id: string;
  requesterId: string;
  targetUserId?: string | null;
  sessionIdFrom: string;
  sessionIdTo?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string | null;
}

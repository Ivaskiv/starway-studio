// apps/web/src/features/zoom/zoom.types.ts

export type ZoomSessionType = 'group_practice' | 'individual' | 'intensive' | 'battle_review' | 'PRIVATE' | 'GROUP' | string;

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
  goalA?: string | null;
  goalB?: string | null;
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
  attendeesCount?: number;
  notifiedAt24h?: string | null;
  notifiedAt2h?: string | null;
  goalText?: string | null;
  attended?: boolean;
  canEdit: boolean;
  slotStatus?: SlotStatus;
  remainingSlots?: number;
  isMyBooking?: boolean;
  priceCents?: number;
  durationMinutes?: number;
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

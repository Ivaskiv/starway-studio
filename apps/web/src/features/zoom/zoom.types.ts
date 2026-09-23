// apps/web/src/features/zoom/zoom.types.ts

export const COACH_ZOOM_SESSION_TYPES = ['group_practice', 'individual', 'intensive', 'battle_review'] as const

export type CoachZoomSessionType = typeof COACH_ZOOM_SESSION_TYPES[number]

export type ZoomSessionType = CoachZoomSessionType | 'PRIVATE' | 'GROUP' | string;

export type ZoomStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ZoomPaymentModel = 'paid_required' | 'result_based' | 'included_in_subscription' | 'free' | 'unknown';
export type ZoomCommerceStatus = 'REQUESTED' | 'APPROVED_PENDING_PAYMENT' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

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

export interface ZoomSessionAttendeeSummary {
  userId: string;
  name: string | null;
  attended: boolean;
}

export interface ZoomCompletionPayload {
  actualParticipantUserIds?: string[];
  attendeeCount?: number;
  topic?: string;
  summary?: string;
  recordingRef?: string;
  startedAt?: string;
  endedAt?: string;
}


export type ZoomCompletionDraft =
  | {
      available: true;
      topic: string | null;
      summary: string | null;
      keyPoints: string[];
      recordingUrl: string | null;
    }
  | {
      available: false;
      reason: 'session_not_found' | 'forbidden' | 'recording_missing' | 'transcript_missing';
    };

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
  myQuestion?: { text: string; position: number } | null;
  notifiedAt24h?: string | null;
  notifiedAt2h?: string | null;
  goalText?: string | null;
  goalA?: string | null;
  goalB?: string | null;
  participantNames?: string[];
  attendees?: ZoomSessionAttendeeSummary[];
  actualAttendeeCount?: number;
  completedAt?: string | null;
  completionSource?: 'manual' | 'zoom' | null;
  actualStartedAt?: string | null;
  actualEndedAt?: string | null;
  outcomeTopic?: string | null;
  summary?: string | null;
  recordingUrl?: string | null;
  recordingAvailable?: boolean;
  canViewRecording?: boolean;
  challengerName?: string | null;
  opponentName?: string | null;
  battleProgress?: BattleProgressEntry[];
  progressA?: number;
  progressB?: number;
  battleStatus?: 'pending' | 'active' | 'completed' | 'cancelled' | null;
  challengerId?: string | null;
  opponentId?: string | null;
  winnerId?: string | null;
  attended?: boolean;
  canEdit: boolean;
  slotStatus?: SlotStatus;
  remainingSlots?: number;
  isMyBooking?: boolean;
  isMyPendingPayment?: boolean;
  checkoutUrl?: string | null;
  paymentDeadline?: string | null;
  commerceRequestId?: string | null;
  commerceStatus?: ZoomCommerceStatus | null;
  commerceLabel?: string | null;
  priceCents?: number;
  currency?: string;
  paymentModel?: ZoomPaymentModel;
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
  endHour?: number;
  endMinute?: number;
  active: boolean;
  defaultTopic?: string;
}

export interface AvailabilityWeekDay {
  date: string;
  source: 'recurring' | 'override';
  hasOverride: boolean;
  windows: AvailabilitySlot[];
}

export interface AvailabilityWeekChange {
  date: string;
  windows?: AvailabilitySlot[];
  reset?: boolean;
}

export interface IndividualAvailabilityCandidate {
  scheduledAt: string;
  available: boolean;
  reason: string | null;
}

export interface IndividualAvailabilitySummaryDay {
  date: string;
  hasIndividualWindow: boolean;
  availableCount: number;
  hasAvailableIndividual: boolean;
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

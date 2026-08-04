// frontend/src/features/zoom/types/zoom.types.ts
// Типи Zoom-сесій — синхронізовано з Prisma ZoomSession/ZoomSessionAttendee
// Використовується в: zoom.api.ts, useZoom.ts, компонентах

export type ZoomStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ZoomSessionType = 'GROUP' | 'INDIVIDUAL' | 'group_practice' | 'individual' | 'intensive' | 'battle_review' | 'PRIVATE';

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

export interface ZoomPreviousSessionRecap {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  summary: string | null;
  recordingUrl: string | null;
  materialsUrl: string | null;
  attendanceStatus: string | null;
  attendanceCount?: number;
  nextStep?: string | null;
}

export interface ZoomWeeklyReportSummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: string | null;
  progress: string | null;
  achievement: string | null;
  blocker: string | null;
  nextStep: string | null;
  detailsAvailable: boolean;
}

export interface ZoomMySessionsResponse {
  sessions: ZoomSessionWithAttendance[];
  previousSessionRecap: ZoomPreviousSessionRecap | null;
  latestWeeklyReport: ZoomWeeklyReportSummary | null;
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
  sessions: Array<ZoomSessionDTO & {
    type: ZoomSessionType;
    attendeesCount: number;
    questionPreviews?: string[];
    questionsCount?: number;
    remainingQuestionsCount?: number;
    isMyBooking: boolean;
    audioFileId: string | null;
    hasAudio: boolean;
    zoomLink: string;
  }>;
  audios: ZoomWeekAudio[];
}

export interface RegisterAttendeeDto   { sessionId: string }
export interface SubmitSessionRequestDto {
  sessionId: string;
  topic:     string;
  question?: string;
  time?:     string;
}

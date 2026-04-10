// backend/src/modules/ai-mentor/types.ts

export interface WeeklyRawData {
  userId:    string
  weekStart: Date
  weekEnd:   Date
  trialStartedAt?: Date | null
  trialEndsAt?: Date | null
  userGoal?: string | null
  accessState: 'trial' | 'active' | 'paused'
  reflectionCount: number
  sessionCount: number
  wheelCheckins: number
  morningReflections: string[]
  eveningReflections: string[]
  dailyCycles: {
    date:    Date
    state:   string        // настрій/стан
    choices: string[]      // вибори дня
    drains:  string[]      // дренажі
    facts:   string        // факт дня
  }[]
  wheelScores: {
    sphere: string
    score:  number
    prev?:  number         // оцінка попереднього тижня для delta
  }[]
  microTasks: {
    title:     string
    completed: boolean
    skipped:   boolean
    progressPercent?: number | null
    daysToComplete?: number
  }[]
  mentorMessages: {
    role:    'user' | 'assistant'
    content: string
    date:    Date
  }[]
  streakDays:      number
  subscriptionPlan: string
}

// ── Для користувача (іде в PDF + Telegram) ──────────────────
export interface UserWeeklyReport {
  userId:    string
  weekStart: Date
  weekEnd:   Date

  overallScore:    number   // 1-10 загальний прогрес
  topInsights:     string[] // 3 головних інсайти
  growthAreas:     string[] // де виросла
  struggleAreas:   string[] // де просіла
  completionRate:  number   // % виконаних мікрозадач
  partialTaskCount?: number
  averageTaskProgress?: number | null
  slowProgressTaskCount?: number
  streakDays:      number
  wheelDelta:      { sphere: string; delta: number }[] // зміни у сферах

  summaryText:     string   // AI-текст для PDF (2-3 абзаци)
  motivationText:  string   // персональне мотивуюче повідомлення
  nextWeekFocus:   string   // фокус наступного тижня
  nextWeekTasks:   string[] // 3 конкретних мікро-кроки
}

// ── Для ментора/системи (прихований профіль) ─────────────────
export interface MentorWeeklyProfile {
  userId:    string
  weekStart: Date
  createdAt: Date

  // Поведінковий аналіз
  behaviorPattern:   string   // "зникає після стресу", "активна вранці"
  engagementRhythm:  string   // "регулярна", "хаотична", "спадає"
  mainPainThisWeek:  string   // головний біль тижня
  emotionalTone:     string   // "тривожна", "мотивована", "виснажена"

  // Retention
  retentionRisk:     number   // 1-10 (10 = точно залишиться)
  retentionFactors:  string[] // що тримає
  churnSignals:      string[] // тривожні сигнали відходу

  // Монетизація
  upsellReady:       boolean
  upsellProduct:     string   // який продукт показати
  upsellTiming:      string   // "вівторок вранці", "одразу після звіту"
  upsellReasoning:   string   // чому саме зараз

  // Рекомендації системі
  nextMessageTone:   string   // "підтримуючий", "спонукальний", "святкуючий"
  triggerForContact: string   // що має статись щоб написати
  recommendedOffer:  string   // конкретна пропозиція
  systemNotes:       string   // нотатки для AI-ментора на наступний тиждень
  offerShownAt?:     Date | null
}

export interface WeeklyAnalysisResult {
  userReport:    UserWeeklyReport
  mentorProfile: MentorWeeklyProfile
  metrics: {
    sessions: number
    reflections: number
    tasksDone: number
    tasksTotal: number
    wheels: number
  }
}

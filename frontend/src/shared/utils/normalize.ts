// frontend/src/shared/utils/normalize.ts
// ===========================
// Нормалізація даних з backend (snake_case) у frontend (camelCase)
// ===========================

// ---------------------------
// USER
// ---------------------------
export function normalizeUser(api: any) {
  return {
    id: String(api.id),
    email: api.email,
    firstName: api.first_name,
    lastName: api.last_name,
    role: api.role,
    telegramId: api.telegram_id,
    telegramUsername: api.telegram_username,
    subscriptionStatus: api.subscription_status,
    subscriptionEndsAt: api.subscription_ends_at,
    trialEndsAt: api.trial_ends_at,
    settings: api.settings ? normalizeUserSettings(api.settings) : undefined,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    lastLoginAt: api.last_login_at,
  }
}

export function normalizeUserSettings(api: any) {
  return {
    theme: api.theme || 'dark',
    language: api.language || 'uk',
    notifications: api.notifications !== undefined ? api.notifications : true,
    emailNotifications: api.email_notifications !== undefined ? api.email_notifications : true,
    telegramNotifications: api.telegram_notifications !== undefined ? api.telegram_notifications : false,
  }
}

// ---------------------------
// NOTIFICATION
// ---------------------------
export function normalizeNotification(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    title: api.title,
    message: api.message,
    type: api.type,
    isRead: api.is_read,
    isImportant: api.is_important,
    isSpam: api.is_spam,
    ability: api.ability,
    externalId: api.external_id,
    metadata: api.metadata,
    createdAt: api.created_at,
    readAt: api.read_at,
    updatedAt: api.updated_at,
  }
}

// ---------------------------
// WHEEL SCORE / ASSESSMENT
// ---------------------------
export interface WheelScore {
  categoryId: string
  score: number
  notes?: string
}

export interface WheelAssessment {
  id: string
  userId: string
  scores: WheelScore[]
  totalScore: number
  averageScore: number
  strengths?: string[]
  gaps?: string[]
  createdAt: string
  completedAt: string
  notes?: string
}

export function normalizeWheelScore(api: any): WheelScore {
  return {
    categoryId: String(api.category_id),
    score: Number(api.score),
    notes: typeof api.notes === 'string' ? api.notes : undefined,
  }
}
export function normalizeWheelAssessment(api: any): WheelAssessment {
  const scores: WheelScore[] = Array.isArray(api.scores)
    ? api.scores.map(normalizeWheelScore)
    : []

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
  const averageScore = api.average_score ?? (scores.length ? totalScore / scores.length : 0)

  const sortedScores = [...scores].sort((a, b) => b.score - a.score)
  const strengths = sortedScores.slice(0, 3).map(s => s.categoryId)
  const gaps = sortedScores.slice(-3).reverse().map(s => s.categoryId)

  return {
    id: api.id,
    userId: api.user_id,
    scores,
    totalScore,
    averageScore,
    strengths,
    gaps,
    createdAt: api.created_at,
    completedAt: api.completed_at,
    notes: typeof api.notes === 'string' ? api.notes : undefined,
  }
}


export function normalizeWheelAssessments(apiList: any[]): WheelAssessment[] {
  return apiList?.map(normalizeWheelAssessment) || []
}

export function denormalizeWheelScores(frontend: Record<string, number>) {
  return Object.entries(frontend).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {} as Record<string, number>)
}

// ---------------------------
// COURSES / LESSONS
// ---------------------------
export function normalizeCourse(api: any) {
  return {
    id: String(api.id),
    title: api.title,
    description: api.description,
    image: api.image,
    duration: api.duration,
    lessonsCount: api.lessons_count,
    completedLessonsCount: api.completed_lessons_count,
    status: api.status,
    category: api.category,
    freeAccessDays: api.free_access_days,
    freeAccessEndsAt: api.free_access_ends_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    progress: api.progress,
    isPremium: api.is_premium,
    isPublished: api.is_published,
  }
}

export function normalizeLesson(api: any) {
  return {
    id: String(api.id),
    courseId: String(api.course_id),
    title: api.title,
    description: api.description,
    content: api.content,
    videoUrl: api.video_url,
    duration: api.duration,
    order: api.order,
    isCompleted: api.is_completed,
    completedAt: api.completed_at,
    isLocked: api.is_locked,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

// ---------------------------
// ACHIEVEMENT / DAILY SESSION
// ---------------------------
export function normalizeAchievement(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    type: api.type,
    title: api.title,
    description: api.description,
    icon: api.icon,
    progress: api.progress,
    maxProgress: api.max_progress,
    isUnlocked: api.is_unlocked,
    unlockedAt: api.unlocked_at,
    createdAt: api.created_at,
  }
}

export function normalizeDailySession(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    type: api.type,
    date: api.date,
    completedAt: api.completed_at,
    answers: api.answers,
    moodScore: api.mood_score,
    energyScore: api.energy_score,
    productivityScore: api.productivity_score,
    notes: typeof api.notes === 'string' ? api.notes : undefined,
    createdAt: api.created_at,
  }
}

// ---------------------------
// STREAK / SUBSCRIPTION / PLAN
// ---------------------------
export function normalizeStreak(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    currentStreak: api.current_streak,
    longestStreak: api.longest_streak,
    lastActivityDate: api.last_activity_date,
    totalDays: api.total_days,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

export function normalizeSubscription(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    planId: api.plan_id,
    status: api.status,
    startDate: api.start_date,
    endDate: api.end_date,
    autoRenew: api.auto_renew,
    paymentMethod: api.payment_method,
    amount: api.amount,
    currency: api.currency,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    cancelledAt: api.cancelled_at,
  }
}

export function normalizePlan(api: any) {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    price: api.price,
    currency: api.currency,
    duration: api.duration,
    features: api.features,
    isPopular: api.is_popular,
    isActive: api.is_active,
    createdAt: api.created_at,
  }
}

// ---------------------------
// CHAT / PRODUCT / FUNNEL / ANALYTICS
// ---------------------------
export function normalizeChatMessage(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    role: api.role,
    content: api.content,
    type: api.type,
    metadata: api.metadata,
    createdAt: api.created_at,
  }
}

export function normalizeProduct(api: any) {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    price: api.price,
    currency: api.currency,
    type: api.type,
    isActive: api.is_active,
    metadata: api.metadata,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

export function normalizeFunnel(api: any) {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    steps: api.steps,
    isActive: api.is_active,
    conversionRate: api.conversion_rate,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

export function normalizeAnalytics(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    eventType: api.event_type,
    eventName: api.event_name,
    properties: api.properties,
    timestamp: api.timestamp,
    sessionId: api.session_id,
    deviceInfo: api.device_info,
  }
}

// ---------------------------
// GOAL / HABIT / TAG
// ---------------------------
export function normalizeGoal(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    title: api.title,
    description: api.description,
    category: api.category,
    targetDate: api.target_date,
    isCompleted: api.is_completed,
    completedAt: api.completed_at,
    progress: api.progress,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

export function normalizeHabit(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    title: api.title,
    description: api.description,
    frequency: api.frequency,
    streak: api.streak,
    longestStreak: api.longest_streak,
    isActive: api.is_active,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    lastCompletedAt: api.last_completed_at,
  }
}

export function normalizeTag(api: any) {
  return {
    id: String(api.id),
    name: api.name,
    color: api.color,
    description: api.description,
    createdAt: api.created_at,
  }
}

// ---------------------------
// ADMIN SETTINGS
// ---------------------------
export function normalizeAdminSettings(api: any) {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    telegramBotToken: api.telegram_bot_token,
    openaiApiKey: api.openai_api_key,
    stripeApiKey: api.stripe_api_key,
    smtpSettings: api.smtp_settings,
    features: api.features,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

// ---------------------------
// BATCH NORMALIZERS
// ---------------------------
export function normalizeUsers(apiList: any[]) {
  return apiList?.map(normalizeUser) || []
}

export function normalizeNotifications(apiList: any[]) {
  return apiList?.map(normalizeNotification) || []
}

export function normalizeCourses(apiList: any[]) {
  return apiList?.map(normalizeCourse) || []
}

export function normalizeLessons(apiList: any[]) {
  return apiList?.map(normalizeLesson) || []
}

export function normalizeAchievements(apiList: any[]) {
  return apiList?.map(normalizeAchievement) || []
}

export function normalizeDailySessions(apiList: any[]) {
  return apiList?.map(normalizeDailySession) || []
}

export function normalizeChatMessages(apiList: any[]) {
  return apiList?.map(normalizeChatMessage) || []
}

export function normalizeGoals(apiList: any[]) {
  return apiList?.map(normalizeGoal) || []
}

export function normalizeHabits(apiList: any[]) {
  return apiList?.map(normalizeHabit) || []
}

export function normalizeTags(apiList: any[]) {
  return apiList?.map(normalizeTag) || []
}

// ---------------------------
// DENORMALIZE
// ---------------------------
export function denormalizeUser(frontend: any) {
  return {
    id: frontend.id,
    email: frontend.email,
    first_name: frontend.firstName,
    last_name: frontend.lastName,
    telegram_id: frontend.telegramId,
    telegram_username: frontend.telegramUsername,
    settings: frontend.settings ? denormalizeUserSettings(frontend.settings) : undefined,
  }
}

export function denormalizeUserSettings(frontend: any) {
  return {
    theme: frontend.theme,
    language: frontend.language,
    notifications: frontend.notifications,
    email_notifications: frontend.emailNotifications,
    telegram_notifications: frontend.telegramNotifications,
  }
}

export function denormalizeNotification(frontend: any) {
  return {
    title: frontend.title,
    message: frontend.message,
    type: frontend.type,
    is_important: frontend.isImportant,
    metadata: frontend.metadata,
  }
}

export function denormalizeGoal(frontend: any) {
  return {
    title: frontend.title,
    description: frontend.description,
    category: frontend.category,
    target_date: frontend.targetDate,
    progress: frontend.progress,
  }
}

export function denormalizeHabit(frontend: any) {
  return {
    title: frontend.title,
    description: frontend.description,
    frequency: frontend.frequency,
    is_active: frontend.isActive,
  }
}

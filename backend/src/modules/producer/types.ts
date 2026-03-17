// backend/src/modules/producer/types.ts

export interface SEOInput {
  productId: string;
  pageType:  'landing' | 'product' | 'blog' | 'funnel';
  keyword?:  string;
}

export interface SEOResult {
  title:       string;
  description: string;
  h1:          string;
  h2:          string[];
  keywords:    string[];
  faq:         Array<{ q: string; a: string }>;
}

export interface TargetingAudience {
  name:                   string;
  age:                    string;
  interests:              string[];
  pain:                   string;
  desire:                 string;
  adText:                 string;
  budgetRecommendation:   string;
}

export interface TargetingResult {
  audiences:        TargetingAudience[];
  bestPostingTime:  string;
  topAngle:         string;
}

export interface FunnelAnalysisResult {
  funnelHealth:       'good' | 'needs_attention' | 'critical';
  bottleneck:         string;
  currentConversion:  number;
  benchmark:          number;
  recommendations:    string[];
  readyTexts: {
    day3Email?:  string;
    day7Push?:   string;
    retarget?:   string;
  };
}

// ════════════════════════════════════════════════════════════
// Типи для AI-продюсера: конструктор AI-ментора
// Повний цикл: Trial 7 днів → Колесо → 2×/день → Аналіз →
//              Мікрозавдання → Афірмації → Тижневий → Місячний звіт
// ════════════════════════════════════════════════════════════

// ─── Wizard input — 8 кроків конструктора ────────────────────
export interface MentorWizardInput {
  // Крок 1 — Основа
  name:           string   // назва AI-ментора
  transformation: string   // X → Y за N днів
  audience:       string   // хто, вік, біль

  // Крок 2 — Колесо балансу
  wheelSpheres:   string   // 8 сфер через кому
  wheelIntro:     string   // текст до першої оцінки

  // Крок 3 — Trial 7 днів
  trialDay1:      string   // тема дня 1 (Колесо)
  trialDay4:      string   // дзеркало прогресу
  trialDay7:      string   // підсумок + оффер
  trialMorningTime: string // '08:00'
  trialEveningTime: string // '20:00'

  // Крок 4 — 2×/день питання
  morningQ1: string
  morningQ2: string
  morningQ3: string
  eveningQ1: string
  eveningQ2: string
  eveningQ3: string

  // Крок 5 — AI-аналіз
  analysisDepth:   string  // фокус аналізу
  analysisSignals: string  // коли ескалювати
  analysisUpsell:  string  // сигнал до апселу

  // Крок 6 — Мікрозавдання
  microTaskLogic:  string  // логіка генерації
  microTaskTypes:  string  // типи завдань
  microTaskTime:   string  // максимальний час хв

  // Крок 7 — Афірмації
  affirmStyle:   string
  affirmTrigger: string
  affirmExample: string

  // Крок 8 — Звіти
  weeklyReportSections:  string
  monthlyReportSections: string
  reportTone:            string
}

// ─── Згенерований план (відповідь OpenAI) ────────────────────
export interface MentorPlanResult {
  // секції — OpenAI повертає structured JSON
  concept:         string   // 🎯 Концепція (2-3 речення)
  wheelSetup:      string   // ☯️ Налаштування колеса
  trialSchedule:   string   // 📅 7-денний розклад
  dailyQuestions:  DailyQSet // 🌅🌙 Ранок + вечір
  analysisLogic:   string   // 🧠 Логіка AI-аналізу
  microTaskSystem: string   // ✅ Система мікрозавдань
  affirmations:    string   // 💫 Афірмації
  weeklyReport:    string   // 📊 Тижневий звіт
  monthlyReport:   string   // 📈 Місячний звіт
  telegramBot:     string   // 📱 Telegram команди
  monetization:    string   // 💎 Монетизація + тарифи
  launchPost:      string   // 📣 Перший пост для Telegram
  raw: string               // повна відповідь для чату
}

export interface DailyQSet {
  morning: string[]  // 3 питання
  evening: string[]  // 3 питання
}

// ─── Chat ─────────────────────────────────────────────────────
export interface ProducerChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface ProducerChatInput {
  messages:       ProducerChatMessage[]
  mentorContext?: Partial<MentorWizardInput>
  stepFocus?:     string
}

// ─── API body ─────────────────────────────────────────────────
export interface GenerateMentorBody {
  wizardData: MentorWizardInput
}

export interface ProducerChatBody {
  message:        string
  history:        ProducerChatMessage[]
  mentorContext?: Partial<MentorWizardInput>
  stepFocus?:     string
}

export type FunnelStage = 'not_started' | 'draft' | 'ready'
export type MentorStage = 'locked' | 'active'
export type ProductStage = 'none' | 'draft' | 'published'
export type DistributionStage = 'none' | 'planned' | 'active'

export interface AssistantProgressDTO {
  funnelStage:        FunnelStage
  mentorStage:        MentorStage
  productStage:       ProductStage
  funnelAttached:     boolean
  distributionStage:  DistributionStage
  nextRecommendedAction: string
}

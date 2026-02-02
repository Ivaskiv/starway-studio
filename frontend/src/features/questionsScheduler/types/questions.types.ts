export interface Question {
  id: string;
  title: string;
  description?: string;
  type: 'text' | 'choice';
  choices?: string[];
  frequency: 'once' | 'daily' | 'weekly';
  time: string; // HH:mm
  requiresVerification: boolean; // Telegram / miniapp
  createdBy: string; // user admin id
  createdAt: string;
  answerText?: string;


}

export interface UserAnswer {
  questionId: string;
  userId: string;
  answer: string;
  answeredAt: string;
}

export interface QuestionResponse {
  questions: Question[];
}

export interface AnswerResponse {
  success: boolean;
  message?: string;
}


export interface Answer {
  questionId: string;
  userId: string;
  answer: string;
  createdAt: string;
}

export interface MicroTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  linkedQuestionId?: string;
  userId: string;
  source: string
}

export const MICRO_TASK_SOURCES = [
  'questionsScheduler',
  'aiMentor',
  'course',
  'challenge',
  'manual',
] as const;

export type MicroTaskSource = typeof MICRO_TASK_SOURCES[number];

export interface MicroTaskContext {
  source: MicroTaskSource;
  feature: string;        // questionsScheduler
  module?: string;        // morning | evening | weekly
  productId?: string;
  funnelId?: string;
  aiScenario?: string;    // reflection | push | support
}
// ==========================================
// MODULE B: ЩОДЕННИЙ ЦИКЛ
// ==========================================

export const STATES = [
  'tension', // напруга
  'fear', // страх
  'stability', // стабільність
  'inner_support', // внутрішня опора
] as const;

export type DailyState = (typeof STATES)[number];

export const DRAINS = [
  'doubt', // сумнів
  'procrastination', // прокрастинація
  'emotional_drain', // емоційний злив
  'external_pressure', // зовнішній тиск
] as const;

export type DailyDrain = (typeof DRAINS)[number];

export const CHOICES = [
  'confirmed_old', // підтверджувала старе
  'chose_new', // обрала нове
] as const;

export interface MicroSupport {
  id: string;
  action: string; // 2-5 хв дія
  isDone: boolean;
  createdAt: string;
}
export type DailyChoice = (typeof CHOICES)[number];

export interface DailyQuestion {
  id: string;
  text: string;
  type: 'scale' | 'text' | 'boolean' | 'enum';
  options?: string[];
  userId: string;
  date: string;

  // Обов'язкові поля
  state: DailyState;
  drain: DailyDrain;
  choice: DailyChoice;
  factOfDay: string; // 1-2 речення

  // Мікро-опора
  microSupport: MicroSupport;

  // Метадані
  completedAt?: string;
  createdAt: string;
}

export interface DailySessions {
  id: string;
  type: 'morning' | 'evening';
  status: 'pending' | 'in_progress' | 'completed';
  answers: Record<string, string>;
  aiFeedback?: string;
  xpEarned?: number;
  created_at: string;
  completed_at?: string;
}

export interface TodaySessions {
  morning: DailySessions | null;
  evening: DailySessions | null;
}

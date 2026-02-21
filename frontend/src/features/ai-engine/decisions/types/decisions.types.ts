// /features/aiDecisionEngine/types.ts

// =======================================
// CORE ENUMS / TYPES
// =======================================
//DecisionSource — "Звідки прийшов запит?"
export type DecisionSource =
  | 'questionsScheduler' // 🕐 Щоденні питання (як будильник)
  | 'aiMentor' // 🤖 AI-помічник
  | 'course' // 📚 Курс
  | 'challenge' // 🏆 Челендж
  | 'wheel' // ⚙️ Колесо життєвого балансу
  | 'manual'; // ✋ Ручне додавання

export type SubscriptionPlan =
  | 'free' // 🆓 Безкоштовно (обмежений функціонал)
  | 'trial' // 🎁 Пробний період (14 днів повний доступ)
  | 'paid' // 💳 Платна підписка
  | 'mentor'; // 👨‍🏫 Преміум з AI-ментором
// Наприклад, пробне заняття, базовий абонемент, VIP з тренером

// =======================================
// WHEEL
// =======================================

export type WheelArea =
  | 'health' // 🏃 Здоров'я
  | 'career' // 💼 Кар'єра
  | 'finance' // 💰 Фінанси
  | 'relationships' // ❤️ Стосунки
  | 'personal_growth' // 🌱 Особистісний розвиток
  | 'fun' // 🎉 Розваги
  | 'environment' // 🏡 Оточення
  | 'innerSupport' // 🧘 Внутрішня підтримка
  | 'spirituality'; // 🕉️ Духовність

// =======================================
// DECISION CONTEXT (вхід для AI)
// =======================================

export interface DecisionContext {
  userId: string; // 🆔 Хто це?

  feature: string; // 📌 Яка фіча? ('daily-question')
  module?: string; // 🧩 Модуль, наприклад: 'wheel', 'mentor'

  source: DecisionSource; // 📍 Звідки прийшло?
  subscriptionTier: SubscriptionPlan; // 🎟️ Який тариф?

  streakDays: number; // 🔥 Скільки днів підряд користується?
  trialDay?: number; // 📅 Який день пробного періоду?

  metrics: {
    stability: number; // ⚖️ Стабільність (0-10)
    drains: number; // 🔋 Виснаження (0-10)
    consistency: number; // 📊 Регулярність (0-10)
  };
}

// =======================================
// MICRO TASK — КЛЮЧОВА СУТНІСТЬ
// =======================================

export type MicroTaskReason = 'low_score' | 'instability' | 'growth' | 'wheel_gap' | 'stagnation';

export interface MicroTask {
  id?: string; // 🔑 Унікальний номер
  title: string; // 📝 "Випий склянку води"
  description?: string; // 📄 "Це допоможе покращити енергію"

  type: 'actionable' | 'reflection'; // 🎯 Дія vs Роздуми
  // 🔑 якщо true → зберігаємо в БД
  persist: boolean; // 💾 Зберігати в БД? (true/false)

  source: DecisionSource;
  reason: MicroTaskReason;

  // прямий вплив на колесо
  wheelImpact?: {
    // 🎯 Вплив на колесо життя
    area: WheelArea; // Яка сфера?
    delta: number; // Зміна балів (+1, -0.5)
  };

  relatedEntity?: {
    type: 'question' | 'wheel' | 'mentor' | 'manual';
    id?: string;
  };

  status?: 'pending' | 'completed' | 'skipped';
  completedAt?: string;
}

// =======================================
// DECISION RESULT (вихід AI)
// =======================================

export interface DecisionResult {
  supportMessage?: string; // 💬 "Чудова робота! Продовжуй!"
  microTasks?: MicroTask[]; // ✅ Список завдань

  recommendations?: {
    // 💡 Рекомендації
    enabled: boolean;
    reason?: string;
  };

  upsell?: {
    // 💸 Пропозиція апгрейду
    productIds: string[];
    reason?: string;
  };

  pdf?: {
    // 📄 Генерувати звіт?
    type: 'weekly' | 'trial' | 'custom';
  };

  generateReport?: boolean; // 📊 Створити повний звіт?
}

// =======================================
// AI ANALYSIS (низькорівневий результат)
// =======================================

export interface AiAnalysisResult {
  supportMessage?: string;

  microTasks?: Array<{
    title: string;
    description?: string;
  }>;

  stats?: Record<string, string | number>;
}

// =======================================
// UPSELL (як окремий результат)
// =======================================

export interface UpsellResult {
  upsell?: {
    productIds: string[];
    reason?: string;
  };
}

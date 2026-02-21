// frontend/src/features/questions/types/questions.types.ts

import { withNormalizer } from '@/shared/utils/apiNormalizer';

// Типи для Questions → Answers → Decisions
// DB: questions.id, answers.question_id, decisions.type

/* =========================
QUESTION
========================= */
export type QuestionContext = 'wheel' | 'product' | 'mentor' | 'questions';
export type QuestionType = 'text' | 'scale' | 'choice';

// DB: questions
export interface Question {
  id: string; // questions.id
  text: string; // questions.text
  context: QuestionContext; // questions.context
  contextId?: string; // questions.context_id
  type: QuestionType; // questions.type
  order: number; // questions.order
  isActive: boolean; // questions.isActive

  // decision-related (використовується engine)
  priority: number; // questions.priority
  triggerType?: QuestionContext; // questions.trigger_type
  triggerMeta?: Record<string, any>; // questions.trigger_meta
}

export interface UseQuestionsOptions {
  userId: string;
  context: QuestionContext;
  contextId?: string;
  telegramChatId?: string;
}

/* =========================
   ANSWERS
========================= */

// input з UI → API
export interface AnswerInput {
  questionId: string; // answers.question_id (UUID)
  value: string | number | boolean; // answers.value (text / scale / choice)
  answers?: AnswerInput[]; // answers.answers (nested)
}
// приклад: { questionId: 'q_health_energy', value: 6 }
// const answers: AnswerInput[] = [
//   { questionId: 'q_health_energy', value: 6 },
//   { questionId: 'q_focus_today', value: 'Не виспався' },
// ]

// DB: answers.question_id, answers.value
export interface Answer {
  id: string;
  userId: string;
  questionId: string;
  value: string | number | boolean;
  createdAt: string;
}
// Тип відповіді користувача на питання
// Вхід: questionId + value
// Використовується в submitAnswers (RTK Query, Decision Engine)
// DB table: answers (question_id, value)

/* =========================
   DECISIONS
========================= */

// Decision
export type DecisionType = 'support' | 'upsell' | 'task' | 'redirect' | 'block';

// DB: decisions
export interface Decision {
  id: string;
  userId: string;
  context: QuestionContext;
  contextId?: string;

  answers?: Answer[];

  type: DecisionType;
  priority: number; // 0..100 (більше = важливіше)

  // анти-конфлікти
  conflictsWith?: string[]; // decisions.conflicts_with

  // Telegram
  supportMessage?: string; // decisions.support_message

  // Upsell / task
  productIds?: string[]; // decisions.productIds
  taskTemplateId?: string; // decisions.task_template_id

  // звʼязки
  questionId: string; // decisions.question_id
  answerId: string; // decisions.answer_id

  createdAt: string;
}
// Нормалізатор для масиву рішень (використовуємо з withNormalizer)
// 🔹 нормалізатор ОДНОГО рішення
export const normalizeDecision = withNormalizer<any, Decision>(api => ({
  id: api.id ?? '',
  userId: api.userId ?? api.userId ?? '',
  context: api.context,
  contextId: api.context_id ?? api.contextId,
  type: api.type,
  priority: api.priority ?? 0,
  conflictsWith: api.conflicts_with ?? api.conflictsWith ?? [],
  supportMessage: api.support_message ?? api.supportMessage,
  productIds: api.productIds ?? api.productIds ?? [],
  taskTemplateId: api.task_template_id ?? api.taskTemplateId,
  questionId: api.question_id ?? api.questionId ?? '',
  answerId: api.answer_id ?? api.answerId ?? '',
  createdAt: api.createdAt ?? api.createdAt ?? '',
}));

// 🔹 нормалізатор МАСИВУ
export const normalizeDecisionsArray = (apiDecisions: any[]): Decision[] =>
  Array.isArray(apiDecisions)
    ? apiDecisions.flatMap(d => {
        const normalized = normalizeDecision(d);
        // якщо normalizeDecision повернув масив — розпаковуємо, якщо обʼєкт — обгортаємо в масив
        return Array.isArray(normalized) ? normalized : [normalized];
      })
    : [];

/* =========================
   API CONTRACTS
========================= */

// submit answers → decisions
export interface SubmitAnswersRequest {
  userId: string;
  context: QuestionContext;
  contextId?: string;
  answers: AnswerInput[];
}

// API response
export interface SubmitAnswersResponse {
  decisions: Decision[];
}

//Альтернативний варіант (якщо бекенд повертає більше даних):
export interface SubmitAnswersResponseExtended {
  decisions: Decision[];
  totalProcessed: number; // скільки відповідей оброблено
  timestamp: string; // коли оброблено
}

/* =========================
   HOOK OPTIONS
========================= */

export interface UseQuestionsOptions {
  userId: string;
  context: QuestionContext;
  contextId?: string;
  telegramChatId?: string;
}

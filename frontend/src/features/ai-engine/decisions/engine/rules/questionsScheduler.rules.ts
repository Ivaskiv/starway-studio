// frontend/src/features/aiDecisionEngine/engine/rules/questionsScheduler.rules.ts
import {
  DecisionContext,
  DecisionResult,
} from '@/features/ai-engine/decisions/types/decisions.types';

export const questionsSchedulerRule = async (ctx: DecisionContext): Promise<DecisionResult> => {
  const result: DecisionResult = {};

  // MicroTask
  let questionId: string | undefined;

  if (ctx.metrics.consistency < 50) {
    result.microTasks = [
      {
        title: 'Маленький крок',
        description: 'Зроби 1 дію сьогодні без ідеалу',
        type: 'actionable', // 🔑 обов'язково
        persist: true, // 🔑 зберігаємо в БД
        source: ctx.source, // 🔑 зв'язуємо з джерелом
        reason: 'stagnation', // 🔑 причина microTask
        wheelImpact: {
          area: 'innerSupport', // 🔑 сфера колеса
          delta: +5,
        },
        relatedEntity: {
          type: 'question', // можна 'wheel' або інше
          id: (ctx.payload as { questionId?: string })?.questionId,
          // якщо є
        },
        status: 'PENDING',
      },
    ];

    result.supportMessage = 'Ти рухаєшся. Навіть якщо здається, що повільно.';
  }

  return result;
};

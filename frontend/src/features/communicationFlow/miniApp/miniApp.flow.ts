// /features/communicationFlow/miniApp/miniApp.flow.ts
import { useMiniAppDuplicator } from './miniApp.wrapper';
import { FlowDecision } from '../types';

export const sendMiniAppFlow = async (decision: FlowDecision, userId: string) => {
  if (!decision || !userId) return;

  const { duplicate } = useMiniAppDuplicator(userId);

  // MicroTasks
  if (decision.microTasks?.length) {
    for (const task of decision.microTasks) {
      await duplicate(task, 'microTask');
    }
  }

  // Інші елементи
  if (decision.otherItems?.length) {
    for (const item of decision.otherItems) {
      await duplicate(item, item.type || 'custom');
    }
  }
};

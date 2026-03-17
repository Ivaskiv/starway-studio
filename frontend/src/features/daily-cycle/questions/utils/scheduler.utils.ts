// /features/questionsScheduler/utils/scheduler.utils.ts
import { Question } from '../types/questions.types';

export const isQuestionDue = (question: Question, lastAnsweredAt?: string) => {
  const now = new Date();
  const [hours = 0, minutes = 0] = (question.time?.split(':') ?? ['0', '0']).map(Number);
  const questionTime = new Date();
  questionTime.setHours(hours, minutes, 0, 0);

  const frequency = question.frequency ?? 'daily';
  if (frequency === 'once') return !lastAnsweredAt;
  if (frequency === 'daily') return !lastAnsweredAt || new Date(lastAnsweredAt).toDateString() !== now.toDateString();
  if (frequency === 'weekly') {
    if (!lastAnsweredAt) return true;
    const last = new Date(lastAnsweredAt);
    const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 7;
  }
  return false;
};

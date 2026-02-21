// /features/questionsScheduler/utils/scheduler.utils.ts
import { Question } from '../types/questions.types';

export const isQuestionDue = (question: Question, lastAnsweredAt?: string) => {
  const now = new Date();
  const [hours, minutes] = question.time.split(':').map(Number);
  const questionTime = new Date();
  questionTime.setHours(hours, minutes, 0, 0);

  if (question.frequency === 'once') return !lastAnsweredAt;
  if (question.frequency === 'daily') return !lastAnsweredAt || new Date(lastAnsweredAt).toDateString() !== now.toDateString();
  if (question.frequency === 'weekly') {
    if (!lastAnsweredAt) return true;
    const last = new Date(lastAnsweredAt);
    const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 7;
  }
  return false;
};

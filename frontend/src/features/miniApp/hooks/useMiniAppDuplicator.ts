import { Question } from '@/features/daily-cycle/questions/types/questions.types';
import { MicroTask } from '@/features/microTask/types/types';
import { microTaskService } from '@/features/microTask/services/service';

export const useMiniAppDuplicator = (userId: string) => {

  /**
   * duplicate — дублює питання або мікрозадачу у MiniApp
   * @param item об'єкт question або microTask
   * @param type 'question' | 'microTask'
   */
  const duplicate = async (
    item: Partial<Question> & Partial<MicroTask>,
    type: 'question' | 'microTask',
  ) => {
    try {
      if (type === 'microTask') {
        const payload = microTaskService.create({
          userId,
          linkedQuestionId: item.id ?? '',
          title: item.title ?? item.text ?? 'Mini-task',
          description: item.description ?? '',
          reason: 'growth',
          source: 'manual',
          meta: { origin: 'miniAppDuplicator' },
        });
        console.log('// fix etap7: created microtask for mini-app', payload);
        return payload;
      }

      if (type === 'question') {
        console.log('// fix etap7: question preview logged for duplicator', { userId, item });
      }

      return item;
    } catch (err) {
      console.error('[MiniAppDuplicator]', err);
      throw err;
    }
  };

  return { duplicate };
};

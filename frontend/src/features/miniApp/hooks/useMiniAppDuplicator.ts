// frontend/src/features/miniApp/hooks/useMiniAppDuplicator.ts
import { useCreateMicroTaskMutation } from '@/features/daily-cycle/questions/services/questions.api';
import { Question } from '@/features/daily-cycle/questions/types/questions.types';
import { MicroTask } from '@/features/microTask/types/types';

export const useMiniAppDuplicator = (userId: string) => {
  const [createMicroTask] = useCreateMicroTaskMutation();

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
        await createMicroTask({
          userId,
          linkedQuestionId: item.questionId,
          title: item.title ?? item.questionTitle,
          description: item.description ?? '',
          completed: false,
          source: 'miniAppDuplicator',
        }).unwrap();
      }

      if (type === 'question') {
        console.log(`[MiniApp] Duplicating question for user ${userId}:`, item);
      }

      return item;
    } catch (err) {
      console.error('[MiniAppDuplicator]', err);
      throw err;
    }
  };

  return { duplicate };
};

// /features/questionsScheduler/pages/SchedulerPage.tsx
import { Button, GlassCard } from '@/ui';
import { QuestionList } from '../components/QuestionList';
import { useQuestionsScheduler } from '../hooks/useQuestionsScheduler';

export const SchedulerPage = ({
  userId,
  telegramChatId,
}: {
  userId: string;
  telegramChatId?: string;
}) => {
  const { questions, submit, readyToAsk } = useQuestionsScheduler({
    userId,
    context: 'questions',
    telegramChatId,
    schedule: 'once',
  });

  const handleAnswer = (question: typeof questions[number], answer: string) => {
    submit([{ questionId: question.id, value: answer }]);
  };

  if (!questions.length) return <p className="text-white/50">Немає запланованих питань</p>;

  return (
    <div className="p-6 grid gap-6">
      <GlassCard className="p-6 flex justify-end">
        <Button onClick={() => alert('PDF-генерація тут')}>Завантажити PDF-звіт</Button>
      </GlassCard>
      <QuestionList questions={questions} onAnswer={handleAnswer} />
    </div>
  );
};

// frontend/src/features/questionsScheduler/components/MentorStats.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/ui';
import { FC } from 'react';
import { useQuestionsScheduler } from '../hooks/useQuestionsScheduler';

const MentorStats: FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { questions, isLoading, exportPDF } = useQuestionsScheduler({
    userId,
    context: 'questions',
    schedule: 'once',
  });

  if (!user) return null;
  if (isLoading) return <p>Завантаження статистики ментора...</p>;

  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(q => q.answerText).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;

  const handleExportPDF = () => {
    const doc = exportPDF();
    doc.save(`mentor_stats_${userId}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow space-y-4">
      <h2 className="text-xl font-semibold">Статистика ментора</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-100 rounded p-4 text-center">
          <p className="text-sm text-gray-500">Всього питань</p>
          <p className="text-lg font-bold">{totalQuestions}</p>
        </div>

        <div className="bg-green-100 rounded p-4 text-center">
          <p className="text-sm text-gray-500">Відповіли</p>
          <p className="text-lg font-bold">{answeredQuestions}</p>
        </div>

        <div className="bg-red-100 rounded p-4 text-center">
          <p className="text-sm text-gray-500">Не відповіли</p>
          <p className="text-lg font-bold">{unansweredQuestions}</p>
        </div>
      </div>

      <div>
        <h3 className="text-md font-medium">Список питань</h3>
        <ul className="mt-2 max-h-60 overflow-y-auto divide-y">
          {questions.map(q => (
            <li key={q.id} className="py-2 flex justify-between">
              <span>{q.title}</span>
              <span className={`font-semibold ${q.answerText ? 'text-green-600' : 'text-red-600'}`}>
                {q.answerText ? 'Відповіли' : 'Не відповіли'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={handleExportPDF}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Експортувати PDF
      </Button>
    </div>
  );
};

export default MentorStats;

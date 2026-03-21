// /features/questionsScheduler/components/QuestionList.tsx
import { QuestionCard } from './QuestionCard';
import { Question } from '../types/questions.types';

interface Props {
  questions: Question[];
  onAnswer: (question: Question, answer: string) => void;
}

export const QuestionList = ({ questions, onAnswer }: Props) => (
  <div>
    {questions.map((q) => (
      <QuestionCard
        key={q.id}
        question={q}
        onAnswer={(answer) => onAnswer(q, answer)}
      />
    ))}
  </div>
);

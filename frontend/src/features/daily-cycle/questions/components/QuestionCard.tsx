// /features/questionsScheduler/components/QuestionCard.tsx
import { useState } from 'react';
import { Button, GlassCard, Input } from '@/ui';
import { Question } from '../types/questions.types';

interface Props {
  question: Question;
  onAnswer: (answer: string) => void;
}

export const QuestionCard = ({ question, onAnswer }: Props) => {
  const [answerText, setAnswerText] = useState('');

  return (
    <GlassCard className="p-4 mb-4">
      <h4 className="text-white font-semibold mb-2">{question.title}</h4>
      {question.description && <p className="text-gray-400 mb-2">{question.description}</p>}
      <div className="flex gap-2 items-center">
        <Input
          className="flex-1 p-2 rounded bg-slate-800 text-white"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Введіть відповідь..."
        />
        <Button onClick={() => { onAnswer(answerText); setAnswerText(''); }}>Відповісти</Button>
      </div>
    </GlassCard>
  );
};

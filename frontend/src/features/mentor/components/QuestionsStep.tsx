// frontend/src/features/admin/components/QuestionsStep.tsx
// import { MentorQuestion } from '@/frontend/src/shared/types/aiMentor.types';
// import { Button, GlassCard, Input, Select } from '@/frontend/src/ui';
import { MentorQuestion } from '@/features/mentor/types/mentor.types';
import { Button, GlassCard, Input, Select } from '@/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  title: string;
  data: MentorQuestion[];
  onUpdate: (data: MentorQuestion[]) => void;
}

export const QuestionsStep = ({ title, data, onUpdate }: Props) => {
  const [questions, setQuestions] = useState<MentorQuestion[]>(data);

  const addQuestion = () => {
    const newQ: MentorQuestion = {
      id: crypto.randomUUID(),
      text: '',
      type: 'text',
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    onUpdate(updated);
  };

  const removeQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    onUpdate(updated);
  };

  const updateQuestion = (id: string, field: keyof MentorQuestion, value: any) => {
    const updated = questions.map(q => (q.id === id ? { ...q, [field]: value } : q));
    setQuestions(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-white/60">Додайте питання, які ментор буде задавати користувачам</p>

      <div className="space-y-3">
        {questions.map(q => (
          <GlassCard key={q.id} className="p-4">
            <div className="flex gap-3 mb-3">
              <Input
                placeholder="Текст питання"
                value={q.text}
                onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                className="flex-1"
              />
              <Select
                value={q.type}
                onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                className="w-32"
              >
                <option value="text">Текст</option>
                <option value="choice">Вибір</option>
                <option value="scale">Шкала</option>
              </Select>
              <Button
                onClick={() => removeQuestion(q.id)}
                className="bg-red-500/20 hover:bg-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {q.type === 'choice' && (
              <Input
                placeholder="Варіанти через кому: Так, Ні, Не знаю"
                value={q.options?.join(', ') || ''}
                onChange={e =>
                  updateQuestion(
                    q.id,
                    'options',
                    e.target.value.split(',').map(s => s.trim()),
                  )
                }
              />
            )}
          </GlassCard>
        ))}
      </div>

      <Button onClick={addQuestion} className="w-full bg-white/10 hover:bg-white/20">
        <Plus className="w-4 h-4 mr-2" />
        Додати питання
      </Button>
    </div>
  );
};

// /features/questionsScheduler/components/SchedulerAdminPanel.tsx
import { Button, GlassCard, Input, Label, Select } from '@/ui';
import { useState } from 'react';
import { useQuestionsScheduler } from '../hooks/useQuestionsScheduler';
import { Question } from '../types/questions.types';

export interface SchedulerAdminPanelProps {
  userId: string;
  telegramChatId?: string;
}

export const SchedulerAdminPanel = ({ userId, telegramChatId }: SchedulerAdminPanelProps) => {
  const { create } = useQuestionsScheduler({
    userId,
    context: 'questions',
    telegramChatId,
    schedule: 'once',
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly'>('daily');
  const [time, setTime] = useState('09:00');
  const [requiresVerification, setRequiresVerification] = useState(true);

  const handleCreate = async () => {
    if (!title) return;

    await create({
      title,
      description,
      frequency,
      time,
      requiresVerification,
      type: 'text',
      createdBy: userId,
    } as Partial<Question>);

    setTitle('');
    setDescription('');
  };

  return (
    <GlassCard className="p-6 mb-6">
      <h3 className="text-white font-bold mb-3">Створити питання</h3>

      <Input
        className="w-full mb-2 p-2 rounded bg-slate-800 text-white"
        placeholder="Тема питання"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <Input
        className="w-full mb-2 p-2 rounded bg-slate-800 text-white"
        placeholder="Опис (опціонально)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <div className="flex gap-2 mb-2">
        <Select
          className="bg-slate-800 text-white p-2 rounded"
          value={frequency}
          onChange={e => setFrequency(e.target.value as any)}
        >
          <option value="once">Раз</option>
          <option value="daily">Щодня</option>
          <option value="weekly">Щотижня</option>
        </Select>

        <Input
          type="time"
          className="bg-slate-800 text-white p-2 rounded"
          value={time}
          onChange={e => setTime(e.target.value)}
        />

        <Label className="flex items-center gap-1 text-white">
          <Input
            type="checkbox"
            checked={requiresVerification}
            onChange={e => setRequiresVerification(e.target.checked)}
          />
          Telegram / MiniApp
        </Label>
      </div>

      <Button onClick={handleCreate}>Створити питання</Button>
    </GlassCard>
  );
};
export default SchedulerAdminPanel;

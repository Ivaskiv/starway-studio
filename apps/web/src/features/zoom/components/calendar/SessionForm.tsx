import { useState } from 'react'

import type {
  CreateSessionPayload,
  ZoomSessionType,
} from '../../zoom.types'

export function SessionForm({
  defaultDate,
  initialValues,
  onSubmit,
  onClose,
  isLoading,
  title = 'Нова сесія',
  submitLabel = 'Створити',
  loadingLabel = 'Створення...',
}: {
  defaultDate: Date;
  initialValues?: Partial<CreateSessionPayload>;
  onSubmit: (p: CreateSessionPayload) => void | Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  title?: string;
  submitLabel?: string;
  loadingLabel?: string;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const resolvedDate = initialValues?.scheduledAt ? new Date(initialValues.scheduledAt) : defaultDate
  const [date, setDate] = useState(
    `${pad(resolvedDate.getDate())}.${pad(resolvedDate.getMonth() + 1)}.${resolvedDate.getFullYear()}`,
  );
  const [time, setTime] = useState(
    `${pad(resolvedDate.getHours())}:${pad(resolvedDate.getMinutes())}`,
  );
  const [topic, setTopic] = useState(initialValues?.topic ?? '');
  const [type, setType] = useState<ZoomSessionType>(initialValues?.type ?? 'group_practice');
  const [zoomLink, setZoomLink] = useState(initialValues?.zoomLink ?? '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [d, m, y] = date.split('.').map(Number);
    const [h, min] = time.split(':').map(Number);
    const dt = new Date(y, m - 1, d, h, min, 0);
    onSubmit({
      scheduledAt: dt.toISOString(),
      topic,
      type,
      zoomLink: zoomLink || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3 flex flex-col gap-3"
    >
      <p className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Дата (ДД.ММ.РРРР)</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={date}
            onChange={e => setDate(e.target.value)}
            placeholder="29.05.2026"
            required
          />
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Час (ГГ:ХХ)</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={time}
            onChange={e => setTime(e.target.value)}
            placeholder="19:00"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тема</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Щотижнева сесія балансу"
          required
        />
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тип</label>
        <select
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
          value={type}
          onChange={e => setType(e.target.value as ZoomSessionType)}
        >
          <option value="group_practice">Групова практика</option>
          <option value="individual">Індивідуальна</option>
          <option value="intensive">Інтенсив</option>
          <option value="battle_review">Battle</option>
        </select>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Zoom-посилання (опційно)</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={zoomLink}
          onChange={e => setZoomLink(e.target.value)}
          placeholder="https://zoom.us/j/..."
          type="url"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 rounded-lg bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all disabled:opacity-50"
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-white/10 text-[13px] text-white/50 hover:text-white/80 transition-all"
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}

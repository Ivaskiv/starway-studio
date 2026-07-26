// apps/web/src/features/zoom/ZoomAvailabilityEditor.tsx

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useGetAvailabilityQuery,
  useSaveAvailabilityMutation,
  useGenerateSessionsMutation,
} from './zoom.api';
import type { AvailabilitySlot, ZoomSessionType } from './zoom.types';
import { getSessionBadgeClass, getSessionMeta } from './zoom.utils';

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order

const TYPE_OPTIONS: { value: ZoomSessionType; label: string }[] = [
  { value: 'group_practice', label: 'Групова практика' },
  { value: 'individual',     label: 'Індивідуальна' },
  { value: 'intensive',      label: 'Інтенсив' },
  { value: 'battle_review',  label: 'Battle Review' },
];

const DURATION_OPTIONS = [30, 60, 90, 120];
const HOUR_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 8); // 08..22
const MINUTE_OPTIONS = [0, 30];

function defaultMaxSlots(type: ZoomSessionType): number {
  return type === 'individual' ? 1 : 50;
}

function newSlot(day: number): AvailabilitySlot {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    dayOfWeek: day,
    hour: 19,
    minute: 0,
    timezone: 'Europe/Kyiv',
    sessionType: 'group_practice',
    maxSlots: 50,
    priceCents: 0,
    durationMinutes: 60,
    active: true,
    defaultTopic: '',
  };
}

// ── SlotForm ─────────────────────────────────────────────────────────────────

function SlotForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: AvailabilitySlot;
  onSave: (slot: AvailabilitySlot) => void;
  onCancel: () => void;
}) {
  const [slot, setSlot] = useState<AvailabilitySlot>(initial);

  const set = <K extends keyof AvailabilitySlot>(key: K, value: AvailabilitySlot[K]) =>
    setSlot(prev => ({ ...prev, [key]: value }));

  const handleTypeChange = (type: ZoomSessionType) => {
    setSlot(prev => ({
      ...prev,
      sessionType: type,
      maxSlots: prev.maxSlots === defaultMaxSlots(prev.sessionType)
        ? defaultMaxSlots(type)
        : prev.maxSlots,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(slot);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">День тижня</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.dayOfWeek}
            onChange={e => set('dayOfWeek', Number(e.target.value))}
          >
            {DAY_ORDER.map(d => (
              <option key={d} value={d}>{DAY_NAMES[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Тип сесії</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.sessionType}
            onChange={e => handleTypeChange(e.target.value as ZoomSessionType)}
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Година</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.hour}
            onChange={e => set('hour', Number(e.target.value))}
          >
            {HOUR_OPTIONS.map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Хвилини</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.minute}
            onChange={e => set('minute', Number(e.target.value))}
          >
            {MINUTE_OPTIONS.map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Тривалість (хв)</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.durationMinutes}
            onChange={e => set('durationMinutes', Number(e.target.value))}
          >
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Макс. місць</label>
          <input
            type="number"
            min={1}
            max={500}
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.maxSlots}
            onChange={e => set('maxSlots', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Ціна (грн)</label>
          <input
            type="number"
            min={0}
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={slot.priceCents / 100}
            onChange={e => set('priceCents', Math.round(Number(e.target.value) * 100))}
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тема (опційно)</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={slot.defaultTopic ?? ''}
          onChange={e => set('defaultTopic', e.target.value)}
          placeholder="ФОКУС · Zoom-практика"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 py-2 rounded-lg bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all"
        >
          Зберегти
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-[13px] text-white/50 hover:text-white/80 transition-all"
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}

// ── SlotRow ───────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  onEdit,
  onDelete,
}: {
  slot: AvailabilitySlot;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const time = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
  const sessionLike = {
    type: slot.sessionType,
    maxParticipants: slot.maxSlots,
    participantsCount: 0,
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[13px] font-semibold text-white/80 w-8 flex-shrink-0">{time}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getSessionBadgeClass(sessionLike)}`}>
          {getSessionMeta(sessionLike)}
        </span>
        <span className="text-[12px] text-white/40 flex-shrink-0">{slot.durationMinutes} хв</span>
        <span className="text-[12px] text-white/40 flex-shrink-0">{slot.maxSlots} місць</span>
        {slot.priceCents > 0 && (
          <span className="text-[12px] text-teal-400 flex-shrink-0">{slot.priceCents / 100} грн</span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all"
        >
          Ред.
        </button>
        <button
          onClick={onDelete}
          className="px-2.5 py-1 rounded-lg border border-red-500/20 text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.07] transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── ZoomAvailabilityEditor ─────────────────────────────────────────────────────

export function ZoomAvailabilityEditor() {
  const { data: slots = [] } = useGetAvailabilityQuery();
  const [saveAvailability, { isLoading: saving }] = useSaveAvailabilityMutation();
  const [generateSessions, { isLoading: generating }] = useGenerateSessionsMutation();

  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [addingDay, setAddingDay] = useState<number | null>(null);

  const generateRef = useRef<HTMLButtonElement>(null);

  const slotsForDay = (day: number) => slots.filter(s => s.dayOfWeek === day);

  const handleSaveSlot = async (updated: AvailabilitySlot) => {
    const idx = slots.findIndex(s => s.id === updated.id);
    const next = idx >= 0
      ? slots.map(s => s.id === updated.id ? updated : s)
      : [...slots, updated];
    await saveAvailability(next).unwrap();
    setEditingSlot(null);
    setAddingDay(null);
  };

  const handleDelete = async (id: string) => {
    await saveAvailability(slots.filter(s => s.id !== id)).unwrap();
  };

  const handleGenerate = async () => {
    const result = await generateSessions().unwrap();
    toast.success(`Створено ${result.created} сесій, пропущено ${result.skipped}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {DAY_ORDER.map(day => {
        const daySessions = slotsForDay(day);
        const isAddingThis = addingDay === day;

        return (
          <div key={day}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                {DAY_NAMES[day]}
              </span>
              {!isAddingThis && (
                <button
                  onClick={() => { setAddingDay(day); setEditingSlot(null); }}
                  className="text-[11px] text-white/30 hover:text-white/60 transition-all"
                >
                  + Додати слот
                </button>
              )}
            </div>

            {daySessions.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {daySessions.map(slot => (
                  editingSlot?.id === slot.id ? (
                    <SlotForm
                      key={slot.id}
                      initial={editingSlot}
                      onSave={handleSaveSlot}
                      onCancel={() => setEditingSlot(null)}
                    />
                  ) : (
                    <SlotRow
                      key={slot.id}
                      slot={slot}
                      onEdit={() => { setEditingSlot(slot); setAddingDay(null); }}
                      onDelete={() => handleDelete(slot.id)}
                    />
                  )
                ))}
              </div>
            )}

            {daySessions.length === 0 && !isAddingThis && (
              <p className="text-[12px] text-white/20 py-1">—</p>
            )}

            {isAddingThis && (
              <SlotForm
                initial={newSlot(day)}
                onSave={handleSaveSlot}
                onCancel={() => setAddingDay(null)}
              />
            )}
          </div>
        );
      })}

      <div className="pt-2 border-t border-white/[0.06]">
        <button
          ref={generateRef}
          onClick={handleGenerate}
          disabled={generating || saving}
          className="w-full py-2.5 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.07)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.14)] transition-all disabled:opacity-50"
        >
          {generating ? 'Генерація...' : 'Згенерувати сесії зараз'}
        </button>
      </div>
    </div>
  );
}

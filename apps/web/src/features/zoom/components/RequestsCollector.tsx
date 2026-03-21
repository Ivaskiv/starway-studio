// frontend/src/features/zoom/components/RequestsCollector.tsx
// Форма для подачі запиту на сесію — зберігається в ZoomSession.requests Json[]
// Приклад: <RequestsCollector onClose={() => setShow(false)} />

import { useState } from 'react';

interface RequestsCollectorProps {
  onClose:     () => void;
  sessionId?:  string; // якщо є конкретна сесія
}

const TIME_OPTIONS = [
  'Ранок (09:00–12:00)', 'День (12:00–16:00)',
  'Вечір (18:00–21:00)', 'Гнучко',
];

const TOPIC_PRESETS = [
  'Колесо балансу', 'Робота з цілями', 'Подолання блоків',
  'Фінансова сфера', 'Відносини', 'Реалізація', 'Інше',
];

export default function RequestsCollector({ onClose, sessionId }: RequestsCollectorProps) {
  const [topic,    setTopic]    = useState('');
  const [question, setQuestion] = useState('');
  const [time,     setTime]     = useState('');
  const [sent,     setSent]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    // TODO: підключити до API коли буде готовий ендпоінт
    await new Promise(r => setTimeout(r, 600));
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-teal-400/25 bg-teal-400/[0.06] backdrop-blur-xl p-6 text-center">
        <div className="text-3xl mb-3">✦</div>
        <p className="text-[14px] font-semibold text-teal-200 mb-1">Запит надіслано!</p>
        <p className="text-[12px] text-white/40 mb-4">Ментор відповість протягом 24 годин</p>
        <button
          onClick={onClose}
          className="text-[12px] text-white/40 hover:text-white/60 transition-colors"
        >
          Закрити
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-xl p-5 relative overflow-hidden">
      {/* accent glow */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[rgb(var(--accent-rgb))] opacity-[0.06] blur-2xl" />

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/25 mb-1">Новий запит</p>
          <h3 className="text-[15px] font-semibold text-white">Запит на сесію</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/40 hover:text-white/70 text-[16px] flex items-center justify-center transition-colors"
        >
          ×
        </button>
      </div>

      {/* topic presets */}
      <div className="mb-4">
        <p className="text-[11px] text-white/35 mb-2">Тема</p>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {TOPIC_PRESETS.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={[
                'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                topic === t
                  ? 'bg-[rgba(var(--accent-rgb),0.15)] border-[rgba(var(--accent-rgb),0.35)] text-[rgb(var(--accent-rgb))]'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/45 hover:text-white/65 hover:border-white/20',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Або введіть свою тему..."
          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-[rgba(var(--accent-rgb),0.4)] transition-colors"
        />
      </div>

      {/* question */}
      <div className="mb-4">
        <p className="text-[11px] text-white/35 mb-2">Питання (необов'язково)</p>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={2}
          placeholder="Що саме хочеш опрацювати?"
          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-[rgba(var(--accent-rgb),0.4)] transition-colors resize-none"
        />
      </div>

      {/* time preference */}
      <div className="mb-5">
        <p className="text-[11px] text-white/35 mb-2">Зручний час</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setTime(t)}
              className={[
                'py-2 rounded-xl text-[11px] border transition-all',
                time === t
                  ? 'bg-[rgba(var(--accent-rgb),0.1)] border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))]'
                  : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!topic.trim() || loading}
        className="w-full py-3 rounded-xl bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '...' : '✦ Надіслати запит'}
      </button>
    </div>
  );
}
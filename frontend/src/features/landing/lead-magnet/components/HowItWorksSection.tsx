// frontend/src/features/lead-magnet/components/HowItWorksSection.tsx
const REASONS = [
  {
    icon: '💎',
    text: 'Ти нарешті бачиш правду про свої реакції, а не те, що "хотілося б бачити".',
  },
  {
    icon: '🌀',
    text: 'Внутрішній діалог "я не знаю, що робити" зупиняється — і з\'являється швидкість у рішеннях.',
  },
  {
    icon: '🔮',
    text: 'Автоматичні вибори зникають — ти починаєш діяти свідомо, а не по інерції.',
  },
  {
    icon: '💙',
    text: 'Ти більше не фантазуєш про життя "потім" — а формуєш конкретну картину, як хочеш жити.',
  },
  {
    icon: '🪨',
    text: 'Ти визначаєш реальні тригери, які запускають старі моделі — і можеш вимкнути їх на корені.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="lm-section">
      <h2 className="lm-section-title">ЧОМУ ЦЕ ПРАЦЮЄ?</h2>
      <p className="lm-section-subtitle">
        ТИ ЗМІНЮЄШ НЕ ДУМКИ —<br />
        А ОСНОВУ, З ЯКОЇ ЩОДНЯ ПРИЙМАЄШ РІШЕННЯ.
      </p>

      <div className="lm-how-grid">
        {REASONS.map((r, i) => (
          <div key={i} className={`lm-how-card ${i === 2 ? 'lm-how-card--center' : ''}`}>
            <div className="lm-how-icon">{r.icon}</div>
            <p className="lm-how-text">{r.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
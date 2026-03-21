// frontend/src/features/lead-magnet/components/FiveDaysSection.tsx
const DAYS = [
  {
    num: '01',
    text: 'Побачиш свої реакції без самообману — і зрозумієш, що реально запускає твої дії.',
  },
  {
    num: '02',
    text: 'Визначиш ситуації, які вмикають старі моделі — і перестанеш потрапляти в одні й ті самі пастки.',
  },
  {
    num: '03',
    text: 'Сформуєш чітке бачення того, як ти хочеш жити — конкретне, а не розмите «хочу краще».',
  },
  {
    num: '04',
    text: 'Зрозумієш свої автоматичні вибори — і навчишся змінювати їх у моменті.',
  },
  {
    num: '05',
    text: 'Збережеш структуру 5 точок, яка триматиме твої рішення й дії в одному напрямку.',
  },
]

export function FiveDaysSection() {
  return (
    <section className="lm-five-section">
      <h2 className="lm-section-title">ЗА 5 ДНІВ ТИ...</h2>

      <div className="lm-five-days">
        {DAYS.map((d, i) => (
          <div key={i} className="lm-day-card">
            <div className="lm-day-num">{d.num}</div>
            <p className="lm-day-text">{d.text}</p>
          </div>
        ))}
      </div>

      {/* Декоративна крива лінія — SVG */}
      <div className="lm-five-curve" aria-hidden="true">
        <svg viewBox="0 0 1200 80" preserveAspectRatio="none" fill="none">
          <path
            d="M 0 60 Q 150 10 300 50 Q 450 90 600 40 Q 750 0 900 50 Q 1050 90 1200 60"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          {[60, 300, 600, 900, 1140].map((cx, i) => (
            <circle key={i} cx={cx} cy={i % 2 === 0 ? 55 : 45} r="5" fill="rgba(255,255,255,0.2)" />
          ))}
        </svg>
      </div>

      <div className="lm-cta-float">
        <button
          className="lm-hero-btn"
          onClick={() => document.getElementById('lm-cta-form')?.scrollIntoView({ behavior: 'smooth' })}
        >
          ПРОЙТИ ПРАКТИКУМ
        </button>
      </div>
    </section>
  )
}
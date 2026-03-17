// frontend/src/features/lead-magnet/components/BonusesSection.tsx
const BONUSES = [
  {
    num: 1,
    title: 'План-карта дій на 72 години',
    desc: 'Проста послідовність впровадження, яка запускає рух відразу — навіть якщо ти «не знаєш, з чого починати».',
    result: 'перші конкретні зміни вже в найближчі 3 дні.',
  },
  {
    num: 2,
    title: '"Щоденник бачення" — інтерактивний шаблон',
    desc: '20 запитань, які знімають туман у голові.',
    result: 'збірне бачення життя, від якого зсередини стає тихо й зрозуміло.',
  },
  {
    num: 3,
    title: 'Карта внутрішньої ясності',
    desc: '10 хвилин — і ти бачиш, де ти стоїш, що виснажує і що тримає на місці.',
    result: 'конкретний стартовий пункт і перші кроки виходу з застою.',
  },
  {
    num: 4,
    title: 'Матриця енергетичного балансу',
    desc: 'Ти бачиш, що дає тобі силу, а що непомітно її забирає.',
    result: 'більше енергії, менше виснаження, реальний контроль над ресурсом.',
  },
  {
    num: 5,
    title: 'Аудіо "Налаштування ресурсного стану"',
    desc: 'Короткий інструмент, що повертає зібраність, коли емоції накривають',
    result: 'фокус і спокій у момент, коли це найбільше потрібно.',
  },
  {
    num: 6,
    title: 'аудіо урок "Мова сили"',
    desc: 'Як говорити чітко, без тисячі пояснень і внутрішнього «вибач, що я існую».',
    result: 'спокійна твердість у комунікації та межі, які працюють.',
  },
]

export function BonusesSection() {
  return (
    <section className="lm-section">
      <h2 className="lm-section-title">І ЦЕ ЩЕ НЕ ВСЕ!</h2>
      <p className="lm-bonuses-intro">
        Окрім основної програми, ти отримуєш пакет інструментів, який<br />
        робить зміни не теорією — а щоденною практикою.<br />
        Не про «подумай краще». А про «роблю → бачу результат».
      </p>

      <div className="lm-bonuses-grid">
        {BONUSES.map((b) => (
          <div key={b.num} className="lm-bonus-card">
            <div className="lm-bonus-header">
              <strong>БОНУС {b.num}.</strong> {b.title}
            </div>
            <div className="lm-bonus-body">{b.desc}</div>
            <div className="lm-bonus-result">
              <strong>Результат:</strong> {b.result}
            </div>
          </div>
        ))}
      </div>

      <div className="lm-bonuses-footer">
        <p className="lm-bonuses-value">Загальна вартість бонусів: 190 € +</p>
        <p className="lm-bonuses-value">Ти отримуєш їх безкоштовно в рамках практикуму.</p>
        <h3 className="lm-bonuses-claim">БОНУСИ НЕ ПРИКРАШАЮТЬ ПРОДУКТ!</h3>
        <p className="lm-bonuses-subclaim">
          Вони підсилюють шлях, щоб ти не просто «послухала уроки» — а змінила логіку дій.
        </p>
      </div>
    </section>
  )
}
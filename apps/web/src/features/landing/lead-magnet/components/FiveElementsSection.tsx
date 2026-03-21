// frontend/src/features/lead-magnet/components/FiveElementsSection.tsx
const ELEMENTS = [
  {
    icon: '🌊',
    title: 'СТАН — ВНУТРІШНЯ ОПОРА З ЯКОЇ ТИ ДІЄШ',
    desc: 'Без стабільного стану рішення стають імпульсивними, а дії — уривчастими. Цей елемент вирівнює твою внутрішню основу.',
    results: ['спокій замість гойдалок', 'впевнені рішення', 'контроль над реакціями', 'дії без самозливів'],
  },
  {
    icon: '🎯',
    title: 'ЦІЛЬ — ТОЧКА Б, ЩО ЗАДАЄ НАПРЯМ',
    desc: 'Без чіткого бачення люди ходять по колу. Тут ти формуєш конкретну картину того, як хочеш жити.',
    results: ['ясний напрямок', 'відчуття сенсу', 'план, а не фантазії', 'чіткий вектор на кожен день'],
  },
  {
    icon: '⚡',
    title: 'ВИБІР — ЩОДЕННИЙ МЕХАНІЗМ СТВОРЕННЯ ТВОЄЇ РЕАЛЬНОСТІ',
    desc: 'Автопілот тримає людину в старих сценаріях. Тут ти вимикаєш автоматичні реакції та повертаєш тобі керування життям в твої руки.',
    results: ['контроль свого шляху', 'зупинка старих шаблонів', 'свідомі дії', 'вплив на кожен результат'],
  },
  {
    icon: '🔑',
    title: 'РІШЕННЯ — ТОЧКА ЗАПУСКУ ЗМІН',
    desc: 'Життя змінюється не від мрій, а від рішення. Цей елемент прибирає «подумаю потім» і вмикає рух.',
    results: ['вихід із застою', 'сміливість вибирати зараз', 'зникнення страху «не вийде»', 'внутрішня твердість'],
  },
  {
    icon: '🚀',
    title: 'ДІЯ — МОМЕНТ, КОЛИ ЗМІНИ СТАЮТЬ РЕАЛЬНІСТЮ',
    desc: 'Тут спотикаються 82% людей. Бо знають — але не роблять. Цей елемент переводить тебе у стабільну, послідовну дію.',
    results: ['темп, який не виснажує', 'щоденні маленькі кроки → великі зміни', 'здатність доводити до кінця', 'рух навіть без ідеальних умов'],
  },
]

export function FiveElementsSection() {
  return (
    <section className="lm-section">
      <h2 className="lm-section-title">
        5 ЕЛЕМЕНТІВ, ЯКІ СТАЮТЬ<br />ТВОЄЮ НОВОЮ ОПОРОЮ
      </h2>

      <div className="lm-elements-top">
        {ELEMENTS.slice(0, 3).map((el, i) => (
          <ElementCard key={i} el={el} />
        ))}
      </div>
      <div className="lm-elements-bottom">
        {ELEMENTS.slice(3).map((el, i) => (
          <ElementCard key={i} el={el} />
        ))}
      </div>
    </section>
  )
}

function ElementCard({ el }: { el: typeof ELEMENTS[0] }) {
  return (
    <div className="lm-element-card">
      <div className="lm-element-header">
        <div className="lm-element-icon">{el.icon}</div>
        <h3 className="lm-element-title">{el.title}</h3>
      </div>
      <p className="lm-element-desc">{el.desc}</p>
      <p className="lm-result-label">Результат:</p>
      <ul className="lm-bullet-list">
        {el.results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )
}
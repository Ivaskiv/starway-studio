import { useLeadMagnetRegistration } from '../hooks/useLeadMagnetRegistration'

const PACKAGES = [
  {
    id: 'free' as const,
    badge: 'БЕЗКОШТОВНО',
    title: 'ЛІДМАГНІТ',
    subtitle: '5 днів практикуму',
    price: '0 грн',
    oldPrice: null,
    accent: false,
    features: [
      '5 уроків практикуму',
      'Урок 1 — стартова точка і механізм теперішніх рішень',
      'Урок 2 — створення бачення без чужих шаблонів',
      'Урок 3 — чому ти застрягаєш у старих сценаріях',
      'Урок 4 — внутрішній перемикач для швидких рішень',
      'Урок 5 — система з 5 точок внутрішньої опори',
    ],
    cta: 'ОТРИМАТИ БЕЗКОШТОВНО',
    highlight: null,
  },
  {
    id: 'trial' as const,
    badge: '🔥 7 ДНІВ БЕЗКОШТОВНО',
    title: 'AI-МЕНТОР',
    subtitle: 'Спробуй AI-систему',
    price: '0 грн / 7 днів',
    oldPrice: null,
    accent: true,
    features: [
      'Все з пакету ЛІДМАГНІТ',
      '✦ Колесо балансу + AI-аналіз',
      '✦ Ранкові питання (3 хв / день)',
      '✦ Вечірні питання + рефлексія',
      '✦ Персональні афірмації від AI',
      '✦ Мікрозавдання на день',
      '✦ Щоденний AI-звіт',
      '✦ Чат з AI-ментором',
      'Після 7 днів — вибір підписки',
    ],
    cta: 'СПРОБУВАТИ AI-МЕНТОРА',
    highlight: 'Найпопулярніший старт',
  },
  {
    id: 'paid' as const,
    badge: 'ПРЕМІУМ',
    title: 'НАСТАВНИЦТВО',
    subtitle: 'Повна AI-система',
    price: '33 € / місяць',
    oldPrice: '59 €',
    accent: false,
    features: [
      'Все з пакету AI-МЕНТОР',
      '✦ Тижневі PDF-звіти',
      '✦ Zoom-сесії з ментором',
      '✦ AI Генератор продуктів',
      '✦ Аналіз воронки',
      '✦ Необмежена кількість продуктів',
      '✦ Пропозиції міні-курсів',
      '✦ Шлях у наставництво',
      'Річний план зі знижкою',
    ],
    cta: 'ПРОЙТИ ПРАКТИКУМ',
    highlight: null,
  },
]

export function PricingSection() {
  const { selectedPackage, setSelectedPackage, name, setName, phone, setPhone, handleSubmit, isLoading } =
    useLeadMagnetRegistration()

  return (
    <section className="lm-pricing-section">
      <h2 className="lm-section-title">ОБИРАЙ ТАРИФ</h2>

      <div className="lm-pricing-grid">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`lm-pricing-card ${pkg.accent ? 'lm-pricing-card--accent' : ''} ${selectedPackage === pkg.id ? 'lm-pricing-card--selected' : ''}`}
            onClick={() => setSelectedPackage(pkg.id)}
          >
            {pkg.highlight && (
              <div className="lm-pricing-highlight">{pkg.highlight}</div>
            )}

            <div className="lm-pricing-badge">{pkg.badge}</div>
            <h3 className="lm-pricing-title">{pkg.title}</h3>
            <p className="lm-pricing-subtitle">{pkg.subtitle}</p>

            <ul className="lm-pricing-features">
              {pkg.features.map((f) => (
                <li key={f} className="lm-pricing-feature">
                  {f.startsWith('✦') ? (
                    <span className="lm-feature-accent">{f}</span>
                  ) : (
                    <span>{f}</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="lm-pricing-price-wrap">
              {pkg.oldPrice && (
                <span className="lm-pricing-old-price">{pkg.oldPrice}</span>
              )}
              <span className="lm-pricing-price">{pkg.price}</span>
            </div>

            <button
              className={`lm-pricing-btn ${pkg.accent ? 'lm-pricing-btn--accent' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPackage(pkg.id)
                document.getElementById('lm-cta-form')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {pkg.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
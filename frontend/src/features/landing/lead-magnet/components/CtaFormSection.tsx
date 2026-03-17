import { useEffect, useState } from 'react'
import { useLeadMagnetRegistration } from '../hooks/useLeadMagnetRegistration'

function useCountdown(minutes = 99) {
  const [seconds, setSeconds] = useState(minutes * 60)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function CtaFormSection() {
  const { name, setName, phone, setPhone, selectedPackage, handleSubmit, isLoading } =
    useLeadMagnetRegistration()
  const timer = useCountdown(99)

  return (
    <section id="lm-cta-form" className="lm-cta-section">
      <div className="lm-cta-inner">
        <div className="lm-cta-left">
          <h2 className="lm-cta-title">СТАРТ КУРСУ ОДРАЗУ ПІСЛЯ РЕЄСТРАЦІЇ</h2>
          <p className="lm-cta-subtitle">
            Заповніть форму та отримайте доступ до практикуму <strong>ПРЯМО ЗАРАЗ</strong>
          </p>

          <div className="lm-cta-form">
            <input
              className="lm-input"
              type="text"
              placeholder="Ваше ім'я"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="lm-input"
              type="tel"
              placeholder="+380 (00) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className="lm-cta-btn"
              onClick={handleSubmit}
              disabled={isLoading || !name || !phone}
            >
              {isLoading ? 'Реєструємо...' : 'ОТРИМАТИ ДОСТУП'}
            </button>
            <p className="lm-cta-disclaimer">
              Натискаючи кнопку, ви погоджуєтесь з умовами оферти
            </p>
          </div>
        </div>

        <div className="lm-cta-timer-card">
          <p className="lm-timer-label">ЗНИЖКА ЗАКІНЧИТЬСЯ ЧЕРЕЗ</p>
          <p className="lm-timer-value">{timer}</p>
        </div>
      </div>
    </section>
  )
}
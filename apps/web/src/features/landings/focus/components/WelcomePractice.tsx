import { CalendarDays } from 'lucide-react'


import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '@/features/landings/focus/content/constants'

export default function WelcomePractice() {
  const {
    title,
    text,
    items,
    meeting,
    cta,
  } = FOCUS_PAGE.welcomeZoom

  return (
    <section
      id="welcome-practice"
      className="focus-section o-ambient o-ambient--center"
      data-reveal
    >
      <div
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        <div className="welcome-practice-card">

          <div className="welcome-practice-body stack-lg">

            <h2 className="welcome-practice-title">
              {title}
            </h2>

            {text?.[0] && (
              <p className="welcome-practice-copy">
                {text[0]}
              </p>
            )}

            <ul className="welcome-practice-list">
              {items.map((item: string) => (
                <li
                  key={item}
                  className="welcome-practice-item"
                >
                  <span
                    className="welcome-practice-marker"
                    aria-hidden="true"
                  />

                  <span className="welcome-practice-item-text">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="welcome-practice-divider" />

            {meeting && (
              <div className="welcome-practice-meeting">

                <div className="welcome-practice-meeting-icon">
                  <CalendarDays className="focus-icon" />
                </div>

                <p className="welcome-practice-meeting-text">
                  {meeting}
                </p>

              </div>
            )}

            <a
              className="focus-btn-primary focus-btn-full"
              href={FOCUS_PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => handleFocusPaymentClick(event, FOCUS_PAYMENT_URL)}
            >
              {cta}
            </a>

          </div>
        </div>
      </div>
    </section>
  )
}
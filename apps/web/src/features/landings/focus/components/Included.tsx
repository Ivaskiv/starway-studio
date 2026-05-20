import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'
import { handleFocusPaymentClick } from '@/features/subscription/utils/openExternalPaymentUrl'
import { FOCUS_PAYMENT_URL } from '../content/constants'

type FocusIncludedItem = [string, string]

export default function Included() {
  const { subtitlesection, title, cta, note } = FOCUS_PAGE.included
  const items = FOCUS_PAGE.included.items as FocusIncludedItem[]

  return (
    <section
      id="included"
      className="focus-section o-ambient o-ambient--center"
      data-reveal
    >
      {/* HEADER */}
      <div
        className="focus-container stack focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        <div className="focus-section-eyebrow">{subtitlesection}</div>

        <h2 className="focus-section-title" data-reveal data-reveal-delay="2">
          {title}
        </h2>
      </div>

      <div
        className="focus-container focus-reveal stack-xl"
        data-reveal
        data-reveal-delay="3"
      >
        <div className="focus-included-grid">
          {items.map((item: FocusIncludedItem, index: number) => {
            const cardTitle = item[0] ?? ''
            const cardText = item[1] ?? ''
            const bodyText = cardText || ''

            return (
              <div key={cardTitle} className="focus-card focus-included-card">
                <span className="focus-item-num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="focus-card-content focus-included-card-content">
                  <h4 className="focus-included-title focus-note-primary">
                    {cardTitle}
                  </h4>
                  {bodyText ? (
                    <p className="focus-included-copy">
                      {bodyText}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
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
    </section>
  )
}

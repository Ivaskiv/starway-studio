import { BookText, Bot, CalendarDays, Gem, MessagesSquare, Video } from 'lucide-react'

import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'
import { FOCUS_PAYMENT_URL } from '../utils/constants'

const includedIcons = [MessagesSquare, Video, CalendarDays, Bot, BookText]

type FocusIncludedItem = [string, string]

export default function Included() {
  const { subtitlesection, title, cta } = FOCUS_PAGE.included
  const items = FOCUS_PAGE.included.items as FocusIncludedItem[]

  return (
    <section id="included" className="focus-section focus-section-secondary stack" data-reveal>
      <div className="focus-container focus-reveal stack" data-reveal data-reveal-delay="1">
        <div className="focus-section-eyebrow focus-hero-stat-top">{subtitlesection}</div>
        <h2 className="focus-section-title" data-reveal data-reveal-delay="2">
          {title}
        </h2>
      </div>

      <div className="focus-container focus-included-grid focus-reveal" data-reveal data-reveal-delay="3">
        {items.map((item: FocusIncludedItem, index: number) => {
          const Icon = includedIcons[index] ?? MessagesSquare
          const cardTitle = item[0] ?? ''
          const cardText = item[1] ?? ''

          return (
            <div key={cardTitle} className="focus-included-card focus-card">
              <div className="focus-included-icon">
                <Icon className="focus-icon" aria-hidden="true" />
              </div>

              <div className="focus-card-content">
                <h4 className="focus-included-title">{cardTitle}</h4>
                {cardText ? <p className="focus-included-copy">{cardText}</p> : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="focus-container focus-problem-core-wrap focus-reveal" data-reveal data-reveal-delay="3">
        <div className="focus-included-card focus-included-card-highlight focus-card">
          <div className="focus-included-icon">
            <Gem className="focus-icon" aria-hidden="true" />
          </div>

          <a
            className="focus-btn-primary focus-btn-full focus-card-cta"
            href={FOCUS_PAYMENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            {cta}
          </a>
        </div>
      </div>
    </section>
  )
}

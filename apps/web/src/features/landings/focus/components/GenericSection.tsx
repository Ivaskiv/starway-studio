type GenericItem = {
  title?: string
  text?: string
  quote?: string
  author?: string
  question?: string
  answer?: string
}

type GenericSectionVariant = 'testimonials' | 'bonuses' | 'faq'

type GenericSectionProps = {
  id: string
  subtitlesection?: string
  title: string
  intro?: string
  note?: string
  items: GenericItem[]
  variant: GenericSectionVariant
}

export default function GenericSection({
  id,
  subtitlesection = '',
  title,
  intro,
  note,
  items,
  variant,
}: GenericSectionProps) {
  return (
    <section
      id={id}
      className={`focus-section o-ambient o-ambient--center focus-generic-section focus-generic-section--${variant}`}
      data-reveal
    >
      <div
        className="focus-container stack focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title" data-reveal data-reveal-delay="2">
          {title}
        </h2>
        {intro ? (
          <p className="focus-body-copy focus-generic-section__intro" data-reveal data-reveal-delay="3">
            {intro}
          </p>
        ) : null}
      </div>

      <div
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="4"
      >
        {variant === 'faq' ? (
          <div className="focus-faq-list">
            {items.map((item: GenericItem, index: number) => (
              <details key={item.question ?? `${variant}-${index}`} className="focus-card focus-faq-item">
                <summary className="focus-faq-summary">
                  <span className="focus-item-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="focus-note-primary focus-faq-question">
                    {item.question}
                  </span>
                  <span className="focus-faq-toggle" aria-hidden="true">
                    +
                  </span>
                </summary>

                <div className="focus-faq-answer">
                  <p className="focus-body-copy">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className={`focus-generic-grid focus-generic-grid--${variant}`}>
            {items.map((item: GenericItem, index: number) => (
              <article key={item.quote ?? item.title ?? `${variant}-${index}`} className={`focus-card focus-generic-card focus-generic-card--${variant}`}>
                <span className="focus-item-num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="focus-generic-copy stack-sm">
                  {item.quote ? (
                    <p className="focus-body-copy focus-generic-quote">{item.quote}</p>
                  ) : null}

                  {item.author ? (
                    <p className="focus-note-secondary focus-generic-author">
                      {item.author}
                    </p>
                  ) : null}

                  {item.title ? (
                    <h3 className="focus-note-primary focus-generic-title">{item.title}</h3>
                  ) : null}

                  {item.text ? (
                    <p className="focus-body-copy focus-generic-text">{item.text}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        {note ? (
          <div className="focus-generic-note focus-quote-glass">
            <div className="focus-note">
              <p className="focus-note-primary">{note}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

export default function Problem() {
  const { subtitlesection, title, items, note } = FOCUS_PAGE.problem

  return (
    <section
      id="problem"
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
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="3"
      >

        <ul className="focus-problem-list stack-sm" aria-label={title}>
          {items.map((text: string) => (
            <li key={text} className="focus-problem-item focus-glass-item">
              <span className="focus-problem-item__marker" aria-hidden="true" />
              <span className="focus-problem-item__text">{text}</span>
            </li>
          ))}
        </ul>

          {note && (
            <div
              className="focus-about-note-row focus-reveal"
              data-reveal
              data-reveal-delay="4"
            >
              <div className="focus-quote-glass">
                <div className="focus-note">
                  <p className="focus-note-primary">
                    {note[0]}
                  </p>

                  {note[1] && (
                    <p className="focus-note-secondary">
                      {note[1]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </section>
  )
}

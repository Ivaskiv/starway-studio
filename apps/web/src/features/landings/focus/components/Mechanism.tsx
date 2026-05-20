import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

export default function Mechanism() {
  const { subtitlesection, title, text, items, note } = FOCUS_PAGE.mechanism

  return (
    // o-ambient--center: centered, inverted — balanced atmosphere
    <section id="mechanism" className="focus-section stack o-ambient o-ambient--center">
      <div className="focus-container focus-reveal stack">
        {/* SECTION CONTENT START */}
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>

        <div className="stack">
          {text.map((line: string, i: number) => (
            <p key={i} className="focus-body-copy">{line}</p>
          ))}
        </div>
        {/* SECTION CONTENT END */}
      </div>

      <div className="focus-container focus-flow-list focus-reveal stack">
        {/* CARD ITEMS START */}
        {items.map((item: string) => (
          <div key={item} className="focus-flow-item">
            <span className="focus-flow-item__bullet">—</span>
            <p className="focus-flow-item__text">{item}</p>
          </div>
        ))}
        {/* CARD ITEMS END */}
      </div>

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

</section>
  )
}

import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

export default function AboutFocus() {
  const { subtitlesection, title, text, note } = FOCUS_PAGE.aboutfocus
  const intro = text.slice(0, 2)
  const list = text.slice(2)

  return (
    <section id="about" className="focus-section focus-section-secondary stack">
      <div className="focus-container focus-reveal stack">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <div className="focus-about-grid">

          <div className="focus-about-left stack">
            <h2 className="focus-about-title">
              {(Array.isArray(title) ? title : title.split('\n'))
                .map((line: string, i: number) => <span key={i} className="block">{line.trim()}</span>)}
            </h2>
            <div className="focus-problem-core-wrap">
              <div className="focus-quote-glass focus-glass">
                <p>{note.map((line: string, i: number) => <span key={i}>{line}<br /></span>)}</p>
              </div>
            </div>
          </div>

          <div className="focus-about-right stack">
            {intro.map((item: string, i: number) => (
              <p key={i} className="focus-about-copy">{item}</p>
            ))}
            <ul className="focus-about-list stack">
              {list.map((item: string, i: number) => (
                <li key={i} className="focus-about-list-item focus-glass-item">
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  )
}

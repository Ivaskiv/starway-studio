import { FOCUS_PAGE } from '@/features/landings/focus/utils/focus.content'

export default function Problem() {
  const { subtitlesection, title, items, note } = FOCUS_PAGE.problem

  return (
    <section id="problem" className="focus-section stack">
      <div className="focus-container focus-reveal stack">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>
      </div>

      <div className="focus-container focus-problem-flow focus-reveal stack">
        {items.map((text: string) => (
          <div key={text} className="focus-problem-line focus-glass-item">
            <span className="focus-problem-bullet">—</span>
            <p className="focus-problem-text">{text}</p>
          </div>
        ))}
      </div>

      <div className="focus-container focus-problem-core-wrap focus-reveal">
        <div className="focus-quote-glass focus-glass">
          <p>
            {note.map((line: string, i: number) => (
              <span key={i}>
                {line}
                {i < note.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}

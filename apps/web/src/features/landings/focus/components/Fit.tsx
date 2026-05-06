import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

export default function Fit() {
  const { subtitlesection, title, items } = FOCUS_PAGE.fit

  return (
    <section id="fit" className="focus-section stack">
      <div className="focus-container focus-reveal stack">
        <div className="focus-section-eyebrow">{subtitlesection}</div>
        <h2 className="focus-section-title">{title}</h2>
      </div>

      <div className="focus-container focus-problem-flow focus-reveal stack">
        {items.map((item: string) => (
          <div key={item} className="focus-problem-line focus-glass-item">
            <span className="focus-problem-bullet">—</span>
            <p className="focus-problem-text">{item}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
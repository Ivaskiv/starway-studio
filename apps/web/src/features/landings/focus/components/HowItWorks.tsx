import { FOCUS_PAGE } from "@/features/landings/focus/content/focus.content"

type FocusStep = {
  title: string
  text: string
}

function chunkSteps(
  steps: FocusStep[],
  cols: number
): FocusStep[][] {

  const rows: FocusStep[][] = []

  let i = 0

  while (i < steps.length) {
    rows.push(steps.slice(i, i + cols))
    i += cols
  }

  return rows
}

export default function HowItWorks() {

  const {
    subtitlesection,
    title,
    steps,
    note,
  } = FOCUS_PAGE.how

  const total = steps.length

  function getCols(n: number): number {
    for (const c of [4, 3, 2]) {
      if (n % c === 0) return c
      if (n % c !== 1) return c
    }

    return 3
  }

  const desktopCols = getCols(total)

  const rows = chunkSteps(
    steps,
    desktopCols
  )

  return (
    <section
      id="how"
      className="focus-section"
      data-reveal
    >

      <div
        className="focus-container stack focus-reveal"
        data-reveal
        data-reveal-delay="1"
      >

        {/* header */}
        <div className="focus-how-header stack">

          <div className="focus-section-eyebrow">
            {subtitlesection}
          </div>

          <h2
            className="focus-section-title"
            data-reveal
            data-reveal-delay="2"
          >
            {title}
          </h2>

        </div>

        {/* pipeline */}
        <div
          className="focus-pipeline focus-reveal"
          aria-hidden="true"
        >

          <div className="focus-pipeline-track" />

          {steps.map((step, i) => (

            <div
              key={step.title}
              className="focus-pipeline-item"
            >

              <div className="focus-pipeline-node">

                <div className="focus-pipeline-node-glass">
                  <div className="focus-pipeline-node-ring" />
                </div>

                <span className="focus-pipeline-node-num">
                  {String(i + 1).padStart(2, '0')}
                </span>

              </div>

<div className="focus-pipeline-label">

  <strong className="focus-pipeline-label-title">
    {step.title}
  </strong>

  <span className="focus-pipeline-label-copy">

    <span className="focus-pipeline-label-dot" />

    {step.text}

  </span>

</div>
              {i < total - 1 && (
                <div
                  className="focus-pipeline-arrow"
                  aria-hidden="true"
                >
                  ›
                </div>
              )}

            </div>
          ))}
        </div>


        {/* outcome */}
        <div className="focus-pipeline-outcome focus-reveal">

          <span className="focus-pipeline-outcome-arrow">
            →
          </span>

          <span className="focus-pipeline-outcome-text">
            Ти йдеш з рішенням, а не з розумінням
          </span>

        </div>

        {/* note */}
        <div
          className="focus-problem-core-wrap focus-reveal"
          data-reveal
          data-reveal-delay="3"
        >

          <div className="focus-quote-glass focus-glass">

            <p>
              {note.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < note.length - 1
                    ? <br />
                    : null}
                </span>
              ))}
            </p>

          </div>
        </div>

      </div>
    </section>
  )
}
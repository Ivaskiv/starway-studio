import {
  CalendarDays,
  ClipboardCheck,
  MessagesSquare,
  Rocket,
  Target,
} from 'lucide-react'

import { FOCUS_PAGE } from '@/features/landings/focus/content/focus.content'

const STEP_ICONS = [CalendarDays, Target, ClipboardCheck, MessagesSquare, Rocket]

export default function HowItWorks() {
  const { subtitlesection, title, steps, note } = FOCUS_PAGE.how
  const total = steps.length

  return (
    <section
      id="how"
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

      {/* MAIN GRID */}
      <div
        className="focus-container focus-reveal"
        data-reveal
        data-reveal-delay="3"
      >
        <div className="focus-pipeline" aria-label={title}>
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Target

            return (
              <div
                key={step.title}
                className="focus-pipeline-step-wrap"
                data-reveal
                data-reveal-delay={String(i + 2)}
              >
                <article className="focus-pipeline-item focus-pipeline-card">
                  <div className="focus-pipeline-step-badge" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  <div className="focus-pipeline-step-icon" aria-hidden="true">
                    <Icon className="focus-pipeline-step-icon-svg" />
                  </div>

                  <div className="focus-pipeline-label">
                    <strong className="focus-pipeline-label-title focus-note-primary">
                      {step.title}
                    </strong>
                    <span className="focus-pipeline-label-sub focus-note-secondary">
                      {step.text}
                    </span>
                  </div>
                </article>

                {i < total - 1 && (
                  <div className="focus-pipeline-connector" aria-hidden="true">
                    <span className="focus-pipeline-connector-line" />
                    <span className="focus-pipeline-connector-arrow">→</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* NOTE */}
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

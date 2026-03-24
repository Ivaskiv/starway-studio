import { useState } from 'react'

import { Gem, Sparkles } from 'lucide-react'

type TrackerFacet = {
  id: string
  title: string
  percent: number
  question: string
}

interface TrackerPageProps {
  score: number
}

const FACETS: TrackerFacet[] = [
  {
    id: 'taste',
    title: 'Вкус до життя',
    percent: 45,
    question: 'Що сьогодні повертає тобі смак до життя?',
  },
  {
    id: 'clarity',
    title: 'Без ілюзій',
    percent: 20,
    question: 'Де зараз важливо подивитися чесно, без самообману?',
  },
  {
    id: 'presence',
    title: 'Присутність',
    percent: 60,
    question: 'У які моменти ти справді був/була в контакті з собою?',
  },
  {
    id: 'action',
    title: 'Дія',
    percent: 10,
    question: 'Яка одна дія сьогодні реально просуне тебе вперед?',
  },
  {
    id: 'legacy',
    title: 'Спадщина',
    percent: 5,
    question: 'Що з того, що ти робиш, має довгий слід?',
  },
] as const

export default function TrackerPage({ score }: TrackerPageProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  return (
    <div className="space-y-4">
      <div className="ios-glass px-4 py-4 md:px-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
          Трекер Ювеліра
        </p>
        <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Кожен день — крок до мрії</h2>
      </div>

      <div className="ios-glass px-4 py-4 md:px-5">
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
          <div className="flex flex-col items-center">
          <div
            className="miniapp-tracker__circle"
            style={{ background: `conic-gradient(rgba(var(--accent-soft-rgb),0.95) 0 ${score}%, rgba(255,255,255,0.06) ${score}% 100%)` }}
          >
            <div className="miniapp-tracker__circle-inner">
              <span className="text-2xl font-black text-[var(--text-primary)]">{score}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">з 100</span>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
            Ти відполірував {Math.round(score / 20)} з 5 граней
          </p>
          </div>

          <div className="miniapp-tracker__banner md:mt-0">
            <span className="btn-icon h-10 w-10 rounded-2xl">
              <Gem className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Diamond Index</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                Інтегральний індекс твоєї якості дій і внутрішньої опори.
              </p>
            </div>
            <span className="text-sm font-black text-[rgb(var(--accent-soft-rgb))]">{score}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {FACETS.map(facet => (
          <div key={facet.id} className="ios-glass px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="btn-icon h-10 w-10 rounded-2xl">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{facet.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{facet.percent}%</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">{facet.percent}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(var(--accent-soft-rgb),0.95),rgba(var(--accent-rgb),0.82))]"
                style={{ width: `${facet.percent}%` }}
              />
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Питання для рефлексії
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {facet.question}
              </p>
              <textarea
                rows={4}
                value={answers[facet.id] ?? ''}
                onChange={event => setAnswers(current => ({ ...current, [facet.id]: event.target.value }))}
                placeholder="Напиши коротку чесну відповідь..."
                className="ios-input mt-3 min-h-[112px] resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

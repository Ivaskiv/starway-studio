import { useMemo, useState, type ReactNode } from 'react'
import type { CardAction, OutputCardCommonProps } from './types'
import { MODEL_BADGE, STATUS_BADGE } from './types'

type Props = OutputCardCommonProps & {
  children: (mode: 'edit' | 'preview') => ReactNode
  extraActions?: CardAction[]
}

export function OutputCardShell(props: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const wordMetric = useMemo(() => {
    if ('readTime' in props.card) return `Читання: ${props.card.readTime} хв`
    return `Слів: ${props.card.wordCount}`
  }, [props.card])

  return (
    <article className="sa-output-card">
      <header className="sa-output-card__header">
        <span className="sa-chip">{props.contentType}</span>
        <span className="sa-chip">{MODEL_BADGE[props.card.model]}</span>
        <span className="sa-chip">{wordMetric}</span>
        <button className="sa-chip sa-chip--toggle" type="button" onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}>
          {mode === 'edit' ? 'Перегляд' : 'Редагування'}
        </button>
      </header>

      <section className="sa-output-card__body">{props.children(mode)}</section>

      <footer className="sa-output-card__footer">
        <button className="sa-card-btn" type="button" onClick={() => props.onCopy(JSON.stringify(props.card, null, 2))}>Копіювати</button>
        <button className="sa-card-btn" type="button" onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}>Редагувати/Перегляд</button>
        {props.actions.map((action) => (
          <button key={action} className="sa-card-btn" type="button">{action}</button>
        ))}
        {props.extraActions?.map((action) => (
          <button key={action.id} className="sa-card-btn sa-card-btn--accent" type="button" onClick={action.onClick}>{action.label}</button>
        ))}
        <span className="sa-chip sa-chip--status">{STATUS_BADGE[props.card.status]}</span>
      </footer>
    </article>
  )
}

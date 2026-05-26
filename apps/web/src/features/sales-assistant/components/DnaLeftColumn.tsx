import { useEffect, useState } from 'react'

type StrategyKey = 'truth' | 'architect' | 'psychology'

type Props = {
  onStrategyChange?: (key: StrategyKey) => void
}

type LexiconState = {
  mustTags: string[]
  banTags: string[]
}

const STRATEGIES: Array<{ key: StrategyKey; label: string; description: string }> = [
  { key: 'truth', label: 'Оголена правда', description: 'Провокативно, в лоб, зриває маски' },
  { key: 'architect', label: 'Головний архітектор', description: 'Сила, масштаб, жорсткий варіант А/Б' },
  { key: 'psychology', label: 'Психологія дії', description: 'Глибокий психолінгвістичний audit без цензури' },
]

const STORAGE_KEY = 'dna_lexicon'

export default function DnaLeftColumn({ onStrategyChange }: Props) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyKey>('truth')
  const [mustTags, setMustTags] = useState<string[]>(['тригер', 'застрягла', 'зливати'])
  const [banTags, setBanTags] = useState<string[]>(['трансформація', 'унікальна можливість', 'успішний успіх'])
  const [mustInput, setMustInput] = useState('')
  const [banInput, setBanInput] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as LexiconState
      if (Array.isArray(parsed.mustTags)) setMustTags(parsed.mustTags)
      if (Array.isArray(parsed.banTags)) setBanTags(parsed.banTags)
    } catch {
      // ignore broken storage payload
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mustTags, banTags }))
  }, [mustTags, banTags])

  const switchStrategy = (key: StrategyKey) => {
    setSelectedStrategy(key)
    onStrategyChange?.(key)
  }

  const addTag = (kind: 'must' | 'ban') => {
    const value = (kind === 'must' ? mustInput : banInput).trim()
    if (!value) return
    if (kind === 'must') {
      setMustTags((prev) => (prev.includes(value) ? prev : [...prev, value]))
      setMustInput('')
      return
    }
    setBanTags((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setBanInput('')
  }

  return (
    <aside className="dna-left-col" aria-label="Ліва панель ДНК">
      <p className="dna-left-col__title">AI-СТРАТЕГІЯ</p>
      <div className="dna-left-col__strategies">
        {STRATEGIES.map((strategy) => (
          <button
            key={strategy.key}
            type="button"
            className={`dna-left-col__strategy-btn${selectedStrategy === strategy.key ? ' is-active' : ''}`}
            onClick={() => switchStrategy(strategy.key)}
          >
            <span className="dna-left-col__strategy-copy">
              <strong>{strategy.label}</strong>
              <small>{strategy.description}</small>
            </span>
            {selectedStrategy === strategy.key ? <strong>Активно</strong> : null}
          </button>
        ))}
      </div>

      <section className="dna-left-col__tag-panel dna-left-col__tag-panel--must">
        <h4>MUST</h4>
        <div className="dna-left-col__tags">
          {mustTags.map((tag) => <TagPill key={tag} tag={tag} onRemove={() => setMustTags((prev) => prev.filter((item) => item !== tag))} />)}
        </div>
        <input className="dna-left-col__input" value={mustInput} onChange={(e) => setMustInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('must')} placeholder="Додати MUST тег" />
      </section>

      <section className="dna-left-col__tag-panel dna-left-col__tag-panel--ban">
        <h4>BAN</h4>
        <div className="dna-left-col__tags">
          {banTags.map((tag) => <TagPill key={tag} tag={tag} onRemove={() => setBanTags((prev) => prev.filter((item) => item !== tag))} />)}
        </div>
        <input className="dna-left-col__input" value={banInput} onChange={(e) => setBanInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag('ban')} placeholder="Додати BAN тег" />
      </section>
    </aside>
  )
}

function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <span className="dna-left-col__tag">
      {tag}
      <button type="button" className="dna-left-col__tag-remove" onClick={onRemove} aria-label={`Видалити ${tag}`}>
        ×
      </button>
    </span>
  )
}

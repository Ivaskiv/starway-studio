import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { AI_ASSISTANT_SECTION_INFO } from '@/features/sales-assistant/config/contentStudio.config'
import DnaLexiconLocalTags from './DnaLexiconLocalTags'

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

export default function DnaLeftColumn({
  onStrategyChange,
}: Props) {
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

            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
              <h3 className="ai-sidebar-label-heading">AI-СТРАТЕГІЯ</h3>
            </label>

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
            <span
              className={`dna-left-col__strategy-dot${selectedStrategy === strategy.key ? ' is-active' : ''}`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>


      <DnaLexiconLocalTags
        mustTags={mustTags}
        banTags={banTags}
        mustInput={mustInput}
        banInput={banInput}
        onMustInputChange={setMustInput}
        onBanInputChange={setBanInput}
        onAddTag={addTag}
        onRemoveMustTag={(tag) => setMustTags((prev) => prev.filter((item) => item !== tag))}
        onRemoveBanTag={(tag) => setBanTags((prev) => prev.filter((item) => item !== tag))}
      /> 
      
    </aside>
  )
}

import { AI_ASSISTANT_SECTION_INFO } from '@/features/sales-assistant/config/contentStudio.config'
import { Check, HelpCircle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

type Props = {
  mustTags: string[]
  banTags: string[]
  mustInput: string
  banInput: string
  onMustInputChange: (value: string) => void
  onBanInputChange: (value: string) => void
  onAddTag: (kind: 'must' | 'ban') => void
  onRemoveMustTag: (tag: string) => void
  onRemoveBanTag: (tag: string) => void
}

const MUST_SUGGESTIONS = ['тригер', 'застрягла', 'зливати', 'тупняк', 'внутрішній критик', 'точка опори']
const BAN_SUGGESTIONS = ['трансформація', 'унікальна можливість', 'успішний успіх', 'результат гарантовано', 'просто почни', 'не хочу']

export default function DnaLexiconLocalTags({
  mustTags,
  banTags,
  mustInput,
  banInput,
  onMustInputChange,
  onBanInputChange,
  onAddTag,
  onRemoveMustTag,
  onRemoveBanTag,
}: Props) {
  const [mustOpen, setMustOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)

  const mustDropdown = useMemo(() => {
    const pool = Array.from(new Set([...MUST_SUGGESTIONS, ...mustTags]))
    const q = mustInput.trim().toLowerCase()
    return pool.filter((item) => q.length === 0 || item.toLowerCase().includes(q)).slice(0, 6)
  }, [mustInput, mustTags])

  const banDropdown = useMemo(() => {
    const pool = Array.from(new Set([...BAN_SUGGESTIONS, ...banTags]))
    const q = banInput.trim().toLowerCase()
    return pool.filter((item) => q.length === 0 || item.toLowerCase().includes(q)).slice(0, 6)
  }, [banInput, banTags])

  return (
    <>
      <section className=" dna-left-col__tag-panel--must">
                <header className="ai-lexicon-header">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
              <h3 className="ai-sidebar-label-heading">ЛОКАЛЬНІ ТЕГИ</h3>
            </label>
            <div className="group relative ml-1 inline-block">
              <HelpCircle
                size={14}
                className="text-[var(--text-muted)] cursor-help opacity-60 hover:opacity-100 transition-opacity"
              />
              <div className="ai-lexicon-tooltip">
                {AI_ASSISTANT_SECTION_INFO.lexicon}
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-wider opacity-70">
            Швидкі MUST/BAN маркери для поточної сесії
          </p>
        </header>
    

        <h4 className="ai-lexicon-section-title ai-lexicon-section-title--required">
          <span><Check size={12} /></span> MUST
        </h4>
        <div className="dna-left-col__dropdown-wrap">
          <div className="dna-left-col__input-row">
            <input
              className="dna-left-col__input ai-lexicon-input"
              value={mustInput}
              onChange={(e) => onMustInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTag('must')}
              placeholder="Додати MUST тег"
            />
            <button type="button" className="dna-left-col__toggle-btn" onClick={() => setMustOpen((v) => !v)}>
              {mustOpen ? '▴' : '▾'}
            </button>
          </div>
          {mustOpen ? (
            <div className="dna-left-col__dropdown" role="listbox" aria-label="MUST words">
              <div className="dna-left-col__chips ai-lexicon-list">
                {mustTags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={() => onRemoveMustTag(tag)} />
                ))}
              </div>
              {mustDropdown.length > 0 ? (
                <div className="dna-left-col__suggestion-grid">
                  {mustDropdown.map((item) => (
                    <button key={item} type="button" className="dna-left-col__dropdown-item dna-left-col__dropdown-item--must" onClick={() => onMustInputChange(item)}>
                      <span className="dna-left-col__dropdown-item-dot">●</span>
                      <span className="dna-left-col__dropdown-item-label">{item}</span>
                      <span className="dna-left-col__dropdown-item-x">×</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <h4 className="ai-lexicon-section-title ai-lexicon-section-title--forbidden">
          <span><X size={12} /></span> BAN
        </h4>
        <div className="dna-left-col__dropdown-wrap">
          <div className="dna-left-col__input-row">
            <input
              className="dna-left-col__input ai-lexicon-input"
              value={banInput}
              onChange={(e) => onBanInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTag('ban')}
              placeholder="Додати BAN тег"
            />
            <button type="button" className="dna-left-col__toggle-btn" onClick={() => setBanOpen((v) => !v)}>
              {banOpen ? '▴' : '▾'}
            </button>
          </div>
          {banOpen ? (
            <div className="dna-left-col__dropdown" role="listbox" aria-label="BAN words">
              <div className="dna-left-col__chips ai-lexicon-list ai-lexicon-list--muted">
                {banTags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={() => onRemoveBanTag(tag)} forbidden />
                ))}
              </div>
              {banDropdown.length > 0 ? (
                <div className="dna-left-col__suggestion-grid">
                  {banDropdown.map((item) => (
                    <button key={item} type="button" className="dna-left-col__dropdown-item dna-left-col__dropdown-item--ban" onClick={() => onBanInputChange(item)}>
                      <span className="dna-left-col__dropdown-item-dot">●</span>
                      <span className="dna-left-col__dropdown-item-label">{item}</span>
                      <span className="dna-left-col__dropdown-item-x">×</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

function TagPill({ tag, onRemove, forbidden = false }: { tag: string; onRemove: () => void; forbidden?: boolean }) {
  return (
    <span className={`ai-lexicon-chip${forbidden ? ' ai-lexicon-chip--forbidden' : ''}`}>
      {tag}
      <button type="button" className="ai-lexicon-chip-remove" onClick={onRemove} aria-label={`Видалити ${tag}`}>
        ×
      </button>
    </span>
  )
}

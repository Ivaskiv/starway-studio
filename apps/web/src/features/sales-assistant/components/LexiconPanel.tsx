import { Check, HelpCircle, X } from 'lucide-react'
import React, { useState } from 'react'
import { AI_ASSISTANT_SECTION_INFO } from '@/features/sales-assistant/config/contentStudio.config'

export interface LexItem {
  id: string
  word: string
  type: 'REQUIRED' | 'FORBIDDEN'
}

interface LexiconPanelProps {
  items: LexItem[]
  onAdd: (word: string, type: 'REQUIRED' | 'FORBIDDEN') => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export const LexiconPanel: React.FC<LexiconPanelProps> = ({
  items,
  onAdd,
  onDelete,
  isLoading,
}) => {
  const [word, setWord] = useState('')
  const [type, setType] = useState<'REQUIRED' | 'FORBIDDEN'>('REQUIRED')

  const required = items.filter((item) => item.type === 'REQUIRED')
  const forbidden = items.filter((item) => item.type === 'FORBIDDEN')

  const handleAdd = () => {
    if (!word.trim() || isLoading) return
    onAdd(word.trim(), type)
    setWord('')
  }

  return (
    <section className="dashboard-liquid-card--soft ai-lexicon-panel">
      <header className="ai-lexicon-header">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
            <h3 className="ai-sidebar-label-heading">ЛЕКСИКОН ДНК</h3>
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
          Автоматична фільтрація семантичного ядра
        </p>
      </header>

      {/* Поле введення нового слова */}
      <div className="space-y-3">
        <input
          className="input-glass ai-lexicon-input"
          disabled={isLoading}
          onChange={(event) => setWord(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAdd()
          }}
          placeholder="Слово або фраза-маркер..."
          type="text"
          value={word}
        />

        <div className="flex gap-2">
          <button
            className={`ai-lexicon-type-btn lg-btn ${type === 'REQUIRED' ? 'is-active' : ''}`}
            disabled={isLoading}
            onClick={() => setType('REQUIRED')}
            type="button"
          >
            <Check size={12} /> Потрібно
          </button>
          <button
            className={`ai-lexicon-type-btn lg-btn ${type === 'FORBIDDEN' ? 'is-active is-forbidden' : ''}`}
            disabled={isLoading}
            onClick={() => setType('FORBIDDEN')}
            type="button"
          >
            <X size={12} /> БАН
          </button>

          <button
            className="ai-lexicon-save hero-cta-primary lg-btn"
            disabled={isLoading || !word.trim()}
            onClick={handleAdd}
            type="button"
          >
            Зберегти
          </button>
        </div>
      </div>

      {/* Списки відфільтрованої семантики */}
      <div className="space-y-4 pt-2">
        {/* REQUIRED */}
        <div className="space-y-1.5">
          
          <h4 className="ai-lexicon-section-title ai-lexicon-section-title--required">
            <span><Check size={12} /></span> Вживати обов&apos;язково:
          </h4>
          <div className="ai-lexicon-list custom-scrollbar">
            {required.map((item) => (
              <span
                className="ai-lexicon-chip"
                key={item.id}
              >
                {item.word}
                <button
                  className="ai-lexicon-chip-remove"
                  disabled={isLoading}
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            {required.length === 0 && (
              <span className="text-xs text-[var(--text-muted)] italic p-1">
                Поки пусто
              </span>
            )}
          </div>
        </div>

        {/* FORBIDDEN */}
        <div className="space-y-1.5">
          <h4 className="ai-lexicon-section-title ai-lexicon-section-title--forbidden">
            <span><X size={12} /></span> Вирізати (Стоп-слова):
          </h4>
          <div className="ai-lexicon-list ai-lexicon-list--muted custom-scrollbar">
            {forbidden.map((item) => (
              <span
                className="ai-lexicon-chip ai-lexicon-chip--forbidden"
                key={item.id}
              >
                {item.word}
                <button
                  className="ai-lexicon-chip-remove"
                  disabled={isLoading}
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            {forbidden.length === 0 && (
              <span className="text-xs text-[var(--text-muted)] italic p-1">
                Поки пусто
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

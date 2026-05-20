import { HelpCircle } from 'lucide-react'
import React, { useState } from 'react'

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
    <section className="dashboard-liquid-card--soft p-5 space-y-5">
      <header className="border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-[rgb(var(--accent-rgb))]">
            Крок 04
          </span>
          <span className="text-base font-semibold text-[var(--text-primary)]">
            ЛЕКСИКОН ДНК
          </span>
          <div className="group relative ml-1 inline-block">
            <HelpCircle
              size={14}
              className="text-[var(--text-muted)] cursor-help opacity-60 hover:opacity-100 transition-opacity"
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--bg-primary)] border border-white/10 rounded-xl text-[11px] leading-relaxed text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-2xl">
              Живий семантичний фільтр, який гарантує вживання впізнаваних
              маркерів та видалення маркетингового сміття.
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
          className="input-glass w-full text-sm font-mono"
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
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border uppercase tracking-[0.12em] ${
              type === 'REQUIRED'
                ? 'bg-[rgba(var(--accent-rgb),0.18)] border-[rgba(var(--accent-rgb),0.38)] text-[rgb(var(--accent-rgb))]'
                : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            disabled={isLoading}
            onClick={() => setType('REQUIRED')}
            type="button"
          >
            ✓ Потрібно
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border uppercase tracking-[0.12em] ${
              type === 'FORBIDDEN'
                ? 'bg-[rgba(244,118,118,0.12)] border-[rgba(244,118,118,0.28)] text-[#f47676]'
                : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            disabled={isLoading}
            onClick={() => setType('FORBIDDEN')}
            type="button"
          >
            ✕ БАН
          </button>

          <button
            className="hero-cta-primary px-6 py-2.5 disabled:opacity-20 font-bold text-xs rounded-xl transition-all uppercase tracking-widest"
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
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[rgb(var(--accent-rgb))] flex items-center gap-1 opacity-80">
            <span>✓</span> Вживати обов&apos;язково:
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-3 bg-white/5 border border-white/10 rounded-2xl custom-scrollbar">
            {required.map((item) => (
              <span
                className="inline-flex items-center gap-2 bg-white/5 text-[var(--text-secondary)] border border-white/10 text-xs font-mono px-3 py-1 rounded-lg"
                key={item.id}
              >
                {item.word}
                <button
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-sans font-bold ml-1 text-sm transition-colors"
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
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-1 opacity-80">
            <span>✕</span> Вирізати (Стоп-слова):
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-3 bg-white/[0.02] border border-white/5 rounded-2xl custom-scrollbar">
            {forbidden.map((item) => (
              <span
                className="inline-flex items-center gap-2 bg-white/5 text-[var(--text-muted)] border border-white/5 text-xs font-mono px-3 py-1 rounded-lg line-through decoration-white/20"
                key={item.id}
              >
                {item.word}
                <button
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-sans font-bold ml-1 text-sm transition-colors"
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

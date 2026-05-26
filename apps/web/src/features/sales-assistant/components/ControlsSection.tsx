import {
  AI_ASSISTANT_SECTION_INFO,
  AI_ASSISTANT_TONE_PRESETS,
  CONTENT_TYPES,
  GENERATION_MODES,
  PROTOCOLS,
} from '@/features/sales-assistant/config/contentStudio.config'
import type { DnaGenerationMode } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import type { ContentKey } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import { HelpCircle } from 'lucide-react'

interface ControlsSectionProps {
  selectedProtocol: (typeof PROTOCOLS)[number]['key']
  currentProtocolLabel: string
  outputs: ContentKey[]
  tone: string
  generationMode: DnaGenerationMode
  onSelectProtocol: (key: (typeof PROTOCOLS)[number]['key']) => void
  onToggleOutput: (key: ContentKey) => void
  onSetTone: (tone: string) => void
  onSetGenerationMode: (mode: DnaGenerationMode) => void
}

export function ControlsSection(props: ControlsSectionProps) {
  return (
    <>
      <div className="dashboard-liquid-card--soft ai-section-card ai-section-card--formats p-6 space-y-4">
        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
          <h3 className="ai-sidebar-label-heading">Емоційний протокол</h3>
          <div className="group relative">
            <HelpCircle
              size={12}
              className="cursor-help opacity-50 hover:opacity-100 transition-opacity"
            />
            <div className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-56 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-xl">
              {AI_ASSISTANT_SECTION_INFO.protocol}
            </div>
          </div>
        </label>
        <div className="ai-assistant-protocol-cards">
          {PROTOCOLS.map((item) => {
            const isSelected = props.selectedProtocol === item.key
            return (
              <label
                key={item.key}
                className={`ai-assistant-protocol-card ${isSelected ? 'is-active' : ''}`}
              >
                <input
                  checked={isSelected}
                  className="mt-1 accent-[rgb(var(--accent-rgb))]"
                  name="protocol"
                  onChange={() => props.onSelectProtocol(item.key)}
                  type="radio"
                />
                <div>
                  <p className="ai-assistant-protocol-title flex items-center gap-1.5">
                    <span>{item.label}</span>
                    <span className="group relative inline-flex">
                      <span className="sa-tooltip-btn">?</span>
                      <span className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                        {item.info}
                      </span>
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium leading-snug opacity-88">
                    {item.desc}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
        <div className="space-y-3">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
            <h3 className="ai-sidebar-label-heading">Налаштування формули</h3>
            <span className="text-[rgb(var(--accent-rgb))] normal-case tracking-normal">
              «{props.currentProtocolLabel ?? ''}»
            </span>
          </label>
          <div className="ai-control-grid">
            {CONTENT_TYPES.map((item) => {
              const isActive = props.outputs?.includes(item.key) ?? false
              return (
                <button
                  key={item.key}
                  onClick={() => props.onToggleOutput?.(item.key)}
                  className={`ai-control-btn ${
                    isActive
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
                  }`}
                  type="button"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span>{item.label}</span>
                    <span className="group relative inline-flex">
                      <span className="sa-tooltip-btn">?</span>
                      <span className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                        {item.info}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
            <h3 className="ai-sidebar-label-heading">Тон комунікації</h3>
          </label>
          <div className="ai-control-grid ai-control-grid--tone">
            {AI_ASSISTANT_TONE_PRESETS.map((item) => {
              const isSelected = props.tone === item.label
              return (
                <button
                  key={item.id}
                  onClick={() => props.onSetTone?.(item.label)}
                  className={`ai-control-btn ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]'
                  }`}
                  type="button"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span>{item.label}</span>
                    <span className="group relative inline-flex">
                      <span className="sa-tooltip-btn">?</span>
                      <span className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                        {item.info}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
            <h3 className="ai-sidebar-label-heading">Режим генерації</h3>
          </label>
          <div className="ai-control-grid ai-control-grid--mode">
            {GENERATION_MODES.map((mode) => {
              const active = props.generationMode === mode.key
              return (
                <button
                  key={mode.key}
                  className={`ai-control-btn ai-control-btn--mode ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]'
                  }`}
                  onClick={() => props.onSetGenerationMode?.(mode.key)}
                  type="button"
                >
                  <span className="ai-control-btn__mode-lines">
                    <span>{mode.label}</span>
                    <span className="ai-control-btn__meta">
                      {mode.provider.toUpperCase()}
                    </span>
                  </span>
                  <span className="group ai-control-btn__mode-help">
                    <span className="sa-tooltip-btn">?</span>
                    <span className="ai-floating-tooltip absolute bottom-full right-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                      {mode.info}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

import type { ContentKey } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import { Lock } from 'lucide-react'

type ContentTypeItem = {
  key: ContentKey
  label: string
}

type Props = {
  strategicCoreReady: boolean
  outputs: ContentKey[]
  isPremiumAccess: boolean
  contentTypes: readonly ContentTypeItem[]
  onLockedType: () => void
  onToggleOutput: (key: ContentKey) => void
  onGenerateFromCore: (key: ContentKey) => void
}

export function ContentTypesSection({
  strategicCoreReady,
  outputs,
  isPremiumAccess,
  contentTypes,
  onLockedType,
  onToggleOutput,
  onGenerateFromCore,
}: Props) {
  return (
    <div className="dna-strategic-block">
      <div className="dna-strategic-block__head">
        <span className="dna-strategic-block__title">ГЕНЕРАЦІЯ АРТЕФАКТІВ</span>
        <span className="dna-strategic-block__count">{outputs.length} обрано</span>
      </div>
      <div className="dna-chip-grid">
        {contentTypes.map((item) => {
          const isActive = outputs.includes(item.key)
          const isLocked = item.key === 'reels' && !isPremiumAccess
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (isLocked) return onLockedType()
                onToggleOutput(item.key)
                if (!isActive && strategicCoreReady) onGenerateFromCore(item.key)
              }}
              className={`dna-content-chip ${isActive ? 'is-active' : ''}`}
            >
              <span>{item.label}</span>
              {isLocked ? <span className="dna-lock-chip"><Lock size={12} /></span> : null}
            </button>
          )
        })}
      </div>
      <p className="dna-strategic-block__hint">Нові типи генеруються на базі існуючого стратегічного ядра без повного перезапуску пайплайну.</p>
    </div>
  )
}

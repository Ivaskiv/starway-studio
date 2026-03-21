import { Button } from '@/ui/Button'
import type { MentorPromptConfig } from '@/features/products/types/product.types'

interface Step6Props {
  config: MentorPromptConfig
  loading?: boolean
  onPublish: () => void
}

export const Step6Publish: React.FC<Step6Props> = ({ config, loading, onPublish }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Готово до публікації</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-[var(--glass-bg)] rounded-xl border border-[var(--border-primary)]">
          <p className="text-[var(--text-muted)] text-sm">Ім’я ментора</p>
          <p className="font-semibold text-[var(--text-primary)]">{config.mentorName}</p>
          <p className="text-[var(--text-muted)] text-sm">Стиль: {config.style}</p>
          <p className="text-[var(--text-muted)] text-sm">Мова: {config.language}</p>
        </div>
        <div className="p-4 bg-[var(--glass-bg)] rounded-xl border border-[var(--border-primary)]">
          <p className="text-[var(--text-muted)] text-sm">Фокусні сфери</p>
          <p className="font-semibold text-[var(--text-primary)]">{config.focusAreas.join(', ') || 'Нічого не обрано'}</p>
          <p className="text-[var(--text-muted)] text-sm">Фраза-підпис</p>
          <p className="text-[var(--text-primary)]">{config.signaturePhrase}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {config.upsellNotes && (
          <div className="p-3 bg-[var(--glass-bg)] rounded-xl border border-[var(--border-primary)] text-sm">
            <p className="text-[var(--text-muted)]">UPSELL-підказка</p>
            <p className="text-[var(--text-primary)] font-medium">{config.upsellNotes}</p>
          </div>
        )}
        <Button onClick={onPublish} disabled={loading}>
          {loading ? 'Публікуємо...' : 'Опублікувати AI-мисію'}
        </Button>
      </div>
    </div>
  )
}

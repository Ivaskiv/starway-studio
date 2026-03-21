import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { Textarea } from '@/ui/Textarea'
import { useMemo } from 'react'
import { generateSystemPrompt } from '../utils/promptTemplate'
import type { MentorPromptConfig } from '@/features/products/types/product.types'

interface Step5Props {
  config: MentorPromptConfig
}

export const Step5PromptPreview: React.FC<Step5Props> = ({ config }) => {
  const prompt = useMemo(() => generateSystemPrompt(config), [config])

  const handleCopy = async () => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(prompt)
    } else {
      console.warn('Clipboard unavailable, prompt not copied.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Перегляд системного prompt</h3>
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          <Icon name="Copy" className="text-[var(--accent)]" />
          Скопіювати
        </Button>
      </div>
      <Textarea value={prompt} readOnly rows={10} className="bg-[var(--glass-bg)] text-[var(--text-muted)]" />
    </div>
  )
}

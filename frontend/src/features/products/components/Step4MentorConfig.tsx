import { Input } from '@/ui/Input'
import { Label } from '@/ui/Label'
import { Select } from '@/ui/Select'
import { Textarea } from '@/ui/Textarea'
import type {
  MentorPromptConfig,
  MentorStyle,
  MentorLanguage,
} from '@/features/products/types/product.types'
import React from 'react'

interface Step4Props {
  value: MentorPromptConfig
  onChange: (value: MentorPromptConfig) => void
}

const STYLE_OPTIONS: { label: string; value: MentorStyle }[] = [
  { label: 'Strict', value: 'strict' },
  { label: 'Supportive', value: 'supportive' },
  { label: 'Provocative', value: 'provocative' },
  { label: 'Soft', value: 'soft' },
]

const LANG_OPTIONS: { label: string; value: MentorLanguage }[] = [
  { label: 'Українською', value: 'UA' },
  { label: 'Англійською', value: 'EN' },
]

export const Step4MentorConfig: React.FC<Step4Props> = ({ value, onChange }) => {
  const update = <K extends keyof MentorPromptConfig>(field: K, next: MentorPromptConfig[K]) => {
    onChange({ ...value, [field]: next })
  }

  const handleFocus = (text: string) => {
    const list = text.split(',').map(item => item.trim()).filter(Boolean)
    update('focusAreas', list)
  }

  const handleForbidden = (text: string) => {
    const list = text.split(',').map(item => item.trim()).filter(Boolean)
    update('forbiddenTopics', list)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Кастомізуй AI-мотон</h3>
      <div>
        <Label>Ім’я ментора</Label>
        <Input value={value.mentorName} onChange={e => update('mentorName', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Стиль</Label>
          <Select value={value.style} onChange={e => update('style', e.target.value as MentorStyle)}>
            {STYLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Мова спілкування</Label>
          <Select value={value.language} onChange={e => update('language', e.target.value as MentorLanguage)}>
            {LANG_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Фраза-підпис</Label>
        <Input value={value.signaturePhrase} onChange={e => update('signaturePhrase', e.target.value)} />
      </div>

      <div>
        <Label>Фокусні сфери (через кому)</Label>
        <Textarea
          value={value.focusAreas.join(', ')}
          onChange={e => handleFocus(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>План «після паузи»</Label>
          <Textarea
            value={value.onStreakBreak ?? ''}
            onChange={e => update('onStreakBreak', e.target.value)}
            placeholder="Що сказати, коли користувач пропускає 3+ дні"
            rows={2}
          />
        </div>
        <div>
          <Label>Стрес/тривога</Label>
          <Textarea
            value={value.onLowState ?? ''}
            onChange={e => update('onLowState', e.target.value)}
            placeholder="Як підтримати під час занепокоєння"
            rows={2}
          />
        </div>
        <div>
          <Label>Досягнення</Label>
          <Textarea
            value={value.onAchievement ?? ''}
            onChange={e => update('onAchievement', e.target.value)}
            placeholder="Що сказати на streak 7+"
            rows={2}
          />
        </div>
      </div>

      <div>
        <Label>Фокус «Заборонені теми» (через кому)</Label>
        <Textarea
          value={(value.forbiddenTopics ?? []).join(', ')}
          onChange={e => handleForbidden(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label>UPSELL-підказки (наприклад: «згадати AI-мінікурс після місяця»)</Label>
        <Textarea
          value={value.upsellNotes ?? ''}
          onChange={e => update('upsellNotes', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}

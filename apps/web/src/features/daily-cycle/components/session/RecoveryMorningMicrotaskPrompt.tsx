import { useState } from 'react'

import { Button } from '@/ui'

type Props = {
  dateLabel: string
  isSaving: boolean
  onSubmitManual: (value: string) => void
  onSkip: () => void
}

export default function RecoveryMorningMicrotaskPrompt({
  dateLabel,
  isSaving,
  onSubmitManual,
  onSkip,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('')

  return (
    <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-yellow-300/20 bg-[rgba(7,10,21,0.92)] p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300/10 text-yellow-300">
        +
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">Ранок за {dateLabel} збережено</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/65">
        Для вчорашнього дня не генеруємо нові авто мікрозавдання. Якщо ти вже зробила маленьку дію, просто запиши її. Якщо ні, можна одразу перейти до вечірньої сесії.
      </p>

      {!isEditing ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => setIsEditing(true)}
            size="lg"
            variant="solid"
          >
            + Своє мікрозавдання
          </Button>
          <Button
            onClick={onSkip}
            size="lg"
            variant="ghost"
          >
            Жодної — перейти до вечора
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-3 text-left">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Наприклад: дописала важливий лист / зробила один дзвінок / закрила маленький хвіст."
            className="min-h-28 w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.3)]"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => setIsEditing(false)}
              size="lg"
              variant="ghost"
            >
              Назад
            </Button>
            <Button
              onClick={() => onSubmitManual(value)}
              size="lg"
              variant="solid"
              disabled={!value.trim() || isSaving}
            >
              {isSaving ? 'Зберігаємо...' : 'Зберегти і перейти до вечора'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

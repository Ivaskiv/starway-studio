// frontend/src/features/ai-generator/components/GenerationPanel.tsx
import { Button } from '@/ui';
import { useState } from 'react';
// ✅ Розширено: підтримка Hero варіантів + режим hero/text
import { HeroVariantsPicker } from './HeroVariantsPicker'
import type { HeroVariant } from '../types/ai-generator.types'

// ── Типи ─────────────────────────────────────────────────────────────────────

interface TextGeneratePayload {
  stepNumber: number
  userInput:  string
  context:    Record<string, string>
}

interface HeroGeneratePayload {
  niche:          string
  targetAudience: string
  utp:            string
  tone?:          'serious' | 'inspiring' | 'provocative' | 'soft'
}

interface TextModeProps {
  mode:       'text'
  stepNumber: number
  userInput:  string
  context:    Record<string, string>
  onConfirm:  (value: string) => void
  generate:   (payload: TextGeneratePayload) => Promise<{ variants: string[] }>
}

interface HeroModeProps {
  mode:          'hero'
  niche:          string
  targetAudience: string
  utp:            string
  onConfirm:      (variant: HeroVariant) => void
  generate:       (payload: HeroGeneratePayload) => Promise<{ variants: HeroVariant[] }>
}

type Props = TextModeProps | HeroModeProps

// ── Компонент ─────────────────────────────────────────────────────────────────

export function GenerationPanel(props: Props) {
  const [textVariants, setTextVariants] = useState<string[]>([])
  const [heroVariants, setHeroVariants] = useState<HeroVariant[]>([])
  const [selectedIdx,  setSelectedIdx]  = useState<number | null>(null)
  const [isLoading,    setIsLoading]    = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      if (props.mode === 'text') {
        const base = selectedIdx !== null ? textVariants[selectedIdx] : props.userInput
        const res  = await props.generate({ stepNumber: props.stepNumber, userInput: base ?? '', context: props.context })
        setTextVariants(prev => [...prev, ...res.variants])
        setSelectedIdx(null)
      } else {
        const res = await props.generate({
          niche:          props.niche,
          targetAudience: props.targetAudience,
          utp:            props.utp,
        })
        setHeroVariants(prev => [...prev, ...res.variants])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Hero режим ─────────────────────────────────────────────────────────────
  if (props.mode === 'hero') {
    return (
      <div className="space-y-4">
        <HeroVariantsPicker
          variants={heroVariants}
          onSelect={props.onConfirm}
          isLoading={isLoading && heroVariants.length === 0}
        />
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Генеруємо...' : heroVariants.length ? 'Ще варіанти' : '⚡ Згенерувати Hero'}
        </Button>
      </div>
    )
  }

  // ── Text режим (оригінальний) ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {textVariants.map((v, i) => (
        <div
          key={i}
          onClick={() => setSelectedIdx(i)}
          className="cursor-pointer rounded-xl border p-4 transition"
        >
          {v}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? 'Генеруємо...' : 'Згенерувати ще'}
        </Button>

        <Button
          disabled={selectedIdx === null || props.mode !== 'text'}
          onClick={() => {
            if (props.mode === 'text' && selectedIdx !== null) {
              props.onConfirm(textVariants[selectedIdx]!)
            }
          }}
        >
          Далі
        </Button>
      </div>
    </div>
  )
}
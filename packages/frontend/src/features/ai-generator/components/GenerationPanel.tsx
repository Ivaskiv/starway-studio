// packages/frontend/src/features/ai-generator/components/GenerationPanel.tsx
import { Button } from '@/ui'
import { useState } from 'react'

interface Props {
  stepNumber: number
  userInput: string
  context: Record<string, string>
  onConfirm: (value: string) => void
  generate: (payload: { stepNumber: number; userInput: string; context: Record<string, string> }) => Promise<{ variants: string[] }>
}

export function GenerationPanel({
  stepNumber,
  userInput,
  context,
  onConfirm,
  generate,
}: Props) {
  const [variants, setVariants] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    const base = selectedIndex !== null ? variants[selectedIndex] : userInput

    const res = await generate({
      stepNumber,
      userInput: base,
      context,
    })

    setVariants(prev => [...prev, ...res.variants])
    setSelectedIndex(null)
  }

  return (
    <div className="space-y-4">
      {variants.map((v, i) => (
        <div
          key={i}
          onClick={() => setSelectedIndex(i)}
          className={`cursor-pointer rounded-xl border p-4 transition
            ${selectedIndex === i
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 hover:border-slate-500'}
          `}
        >
          {v}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleGenerate}>Згенерувати ще</Button>

        <Button
          disabled={selectedIndex === null}
          onClick={() => onConfirm(variants[selectedIndex!])}
        >
          Далі
        </Button>
      </div>
    </div>
  )
}

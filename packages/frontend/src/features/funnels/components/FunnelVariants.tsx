// packages/frontend/src/features/funnels/components/FunnelVariants.tsx
import { useState } from 'react'
import { Button } from '@/ui'
import { VariantCard } from '../../ai-generator/components/VariantCard';

interface Props {
  userInput: string
  context: Record<string, string>
  onConfirm: (selected: string) => void
  generate: (payload: { userInput: string; context: Record<string, string> }) => Promise<{ variants: string[] }>
}

export function FunnelVariants({
  userInput,
  context,
  onConfirm,
  generate,
}: Props) {
  const [variants, setVariants] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const onGenerate = async () => {
    const base = selectedIndex !== null ? variants[selectedIndex] : userInput
    const res = await generate({ userInput: base, context })
    setVariants(prev => [...prev, ...res.variants])
    setSelectedIndex(null)
  }

  return (
    <div className="space-y-4">
      {variants.map((v, i) => (
        <VariantCard
          key={i}
          text={v}
          active={selectedIndex === i}
          onClick={() => setSelectedIndex(i)}
        />
      ))}

      <div className="flex gap-2">
        <Button onClick={onGenerate}>Згенерувати ще</Button>
        <Button
          disabled={selectedIndex === null}
          onClick={() => onConfirm(variants[selectedIndex!])}
        >
          Вибрати та продовжити
        </Button>
      </div>
    </div>
  )
}
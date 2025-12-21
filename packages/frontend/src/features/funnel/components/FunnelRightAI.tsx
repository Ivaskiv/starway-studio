/** src/features/funnel/components/FunnelRightAI.tsx */


import React from 'react'
import { FunnelStep } from '@starway/shared'
import { Button } from '@/components/ui'

type FunnelRightAIProps = {
  steps?: FunnelStep[]
  aiPrompt?: string
  setAiPrompt?: (value: string) => void
  generations?: number
  isGenerating?: boolean
  onGenerate?: () => void
}

export default function FunnelRightAI({
  steps = [],
  aiPrompt = 'Generate a summary of the funnel steps',
  setAiPrompt,
  generations = 3,
  isGenerating = false,
  onGenerate
}: FunnelRightAIProps) {
  return (
    <aside className="lg:sticky lg:top-24 border border-gray-800 rounded-xl p-4 bg-gray-900">
      <div className="font-semibold mb-2">AI Assistant</div>

      <p className="text-sm text-gray-400 mb-4">
        Генерацій залишилось: {generations}
      </p>

      <textarea
        className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-sm"
        placeholder="Напишіть запит до AI..."
        value={aiPrompt}
        onChange={e => setAiPrompt?.(e.target.value)}
      />

      <Button
        disabled={generations === 0 || isGenerating}
        onClick={onGenerate}
        className="mt-3 w-full bg-purple-600 disabled:opacity-40 rounded p-2"
      >
        {isGenerating ? 'Генеруємо...' : 'Згенерувати'}
      </Button>
    </aside>
  )
}

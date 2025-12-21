// src/components/ai/AIFunnelAssistant.tsx
import { useState } from 'react'
import { Button, Textarea } from '@/components/ui'
import { Loader2 } from 'lucide-react'

import {
import { AI_FIELD_CONFIGS }import { AIFieldConfig, AIFieldFocus, AIFunnelAssistantProps } from '@starway/shared/src/types/ai'
 from '@shared/prompts/funnimport { buildGenerationPrompt } from '@shared/prompts/funnel';
el';import { AI_FIELD_CONFIGS } from '@shared/prompts/funnel';

  AIFunnelAssistantProps,
  AIFieldConfig,
  AIFieldFocus
} from '@starway/shared/src/types/ai'


export default function AIFunnelAssistant({
  currentField,
  funnelDraft,
  generations,
  onGenerate,
  isGenerating
}: AIFunnelAssistantProps) {
  const [prompt, setPrompt] = useState('')

  const config: AIFieldConfig =
    AI_FIELD_CONFIGS[currentField as AIFieldFocus]

  const Icon = config.icon

  const totalGens = generations.base + generations.bonus

  const hasContext =
    Boolean(funnelDraft.name) ||
    Boolean(funnelDraft.audience) ||
    Boolean(funnelDraft.niche) ||
    Boolean(funnelDraft.goal)

  // ✅ ЄДИНА правильна генерація
  const handleGenerateClick = () => {
    if (!prompt.trim()) return

    const generationPrompt = buildPrompttsts(
      currentField,
      prompt,
      {
        name: funnelDraft.name,
        audience: funnelDraft.audience,
        niche: funnelDraft.niche,
        goal: funnelDraft.goal
      }
    )

    onGenerate(generationPrompt)
    setPrompt('')
  }

  return (
    <aside className="lg:sticky lg:top-24 h-fit">
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Icon size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-400">
              Генерує: {config.title}
            </p>
          </div>
        </div>

        {/* Generations */}
        <div className="mb-4 p-3 bg-gray-900/50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Генерації</span>
            <span className="text-lg font-bold text-white font-mono">
              {totalGens}
            </span>
          </div>
        </div>

        {/* Context */}
        {hasContext && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-1">
            <p className="text-blue-300 font-semibold">📋 Контекст:</p>

            {funnelDraft.name && (
              <div><span className="text-gray-500">Воронка:</span> {funnelDraft.name}</div>
            )}
            {funnelDraft.audience && (
              <div><span className="text-gray-500">ЦА:</span> {funnelDraft.audience.slice(0, 50)}…</div>
            )}
            {funnelDraft.niche && (
              <div><span className="text-gray-500">Ніша:</span> {funnelDraft.niche}</div>
            )}
            {funnelDraft.goal && (
              <div><span className="text-gray-500">Мета:</span> {funnelDraft.goal}</div>
            )}
          </div>
        )}

        {/* Prompt */}
        <Textarea
          label="Ваш запит"
          placeholder={config.placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="mb-4"
        />

        {/* Button */}
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
          onClick={handleGenerateClick}
          disabled={!prompt.trim() || totalGens === 0 || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Генерую…
            </>
          ) : (
            <>
              <Icon size={16} className="mr-2" />
              Згенерувати AI
            </>
          )}
        </Button>

        {/* Tips */}
        <div className="mt-4 p-3 bg-gray-900/30 rounded-xl">
          <p className="text-xs font-semibold text-purple-400 mb-2">
            💡 Поради:
          </p>
          <ul className="space-y-1.5">
            {config.tips.map((tip, i) => (
              <li key={i} className="text-xs text-gray-400">
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {totalGens === 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 text-center">
              ⚠️ Генерації закінчились
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

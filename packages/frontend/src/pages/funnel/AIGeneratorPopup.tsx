// packages/frontend/src/features/funnel/components/AIGeneratorPopup.tsx

import { useState } from 'react'
import { Sparkles, X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui'

type Props = {
  field: string | null
  remainingGens: number
  onClose: () => void
  onGenerate: (prompt: string) => void  // ✅ ВИПРАВЛЕНО: void замість boolean
  onSelectVariant: (text: string) => void
}

export default function AIGeneratorPopup({ field, remainingGens, onClose, onGenerate, onSelectVariant }: Props) {
  const [prompt, setPrompt] = useState('')
  const [variants, setVariants] = useState<{ id: string; text: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleGenerate = () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    onGenerate(prompt)  // ✅ Тепер без return

    setTimeout(() => {
      setVariants([
        { id: '1', text: `AI варіант 1: ${prompt.slice(0, 40)}...` },
        { id: '2', text: `AI варіант 2: ${prompt.slice(0, 35)} (покращений)` },
        { id: '3', text: `AI варіант 3: ${prompt.slice(0, 38)} (оптимальний)` }
      ])
      setIsGenerating(false)
    }, 2000)
  }

  const handleCopy = (variant: { id: string; text: string }) => {
    setCopiedId(variant.id)
    onSelectVariant(variant.text)
    setTimeout(() => setCopiedId(null), 800)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border-2 border-purple-500/50 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-purple-400" />
              AI-Генератор
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Поле: <span className="text-purple-400 font-semibold">{field}</span>
            </p>
          </div>
          <Button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-7 h-7" />
          </Button>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={`Опишіть що згенерувати для ${field}...`}
          rows={4}
          className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none resize-none mb-4"
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating || remainingGens === 0}
          className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Генерую...
            </span>
          ) : (
            `Згенерувати (${remainingGens} залишилось)`
          )}
        </button>

        {variants.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-400 mb-3">
              ✨ Оберіть варіант (клік = копіювання):
            </div>
            {variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => handleCopy(variant)}
                className="w-full text-left p-4 bg-gray-950 border-2 border-gray-700 hover:border-purple-500 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between">
                  <p className="text-white">{variant.text}</p>
                  {copiedId === variant.id ? (
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 ml-3" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500 group-hover:text-purple-400 flex-shrink-0 ml-3" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
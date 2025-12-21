// packages/frontend/src/features/funnel/components/GenerationsCounter.tsx

import { Sparkles } from 'lucide-react'

type Props = {
  total: number
  used: number
  remaining: number
}

export default function GenerationsCounter({ total, used, remaining }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-3">
      <div className="text-xs text-gray-400 mb-1">Генерації AI</div>
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <span className="text-2xl font-bold">{remaining}</span>
        <span className="text-gray-500">/ {total}</span>
      </div>
      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${(used / total) * 100}%` }}
        />
      </div>
    </div>
  )
}
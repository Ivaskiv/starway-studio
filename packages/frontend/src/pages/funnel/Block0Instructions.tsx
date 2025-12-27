// packages/frontend/src/features/funnel/components/Block0Instructions.tsx

import { Lightbulb } from 'lucide-react'

const BLOCK_INSTRUCTIONS = {
  title: '🎯 Блок 0: Основа AI-воронки',
  description: 'Це фундамент вашої воронки. Заповніть 3 поля або використайте AI-генератор.',
  tips: [
    '📝 Назва: коротка, емоційна, про результат (5-10 слів)',
    '👥 Аудиторія: вік, біль, бажання, готовність платити',
    '🎯 Мета: вимірювана дія користувача'
  ]
}

export default function Block0Instructions() {
  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-2 border-indigo-500/30 rounded-2xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-4">{BLOCK_INSTRUCTIONS.title}</h2>
      <p className="text-lg text-gray-300 mb-6">{BLOCK_INSTRUCTIONS.description}</p>

      <div className="bg-gray-900/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-yellow-400">Поради:</span>
        </div>
        <ul className="space-y-2">
          {BLOCK_INSTRUCTIONS.tips.map((tip, i) => (
            <li key={i} className="text-sm text-gray-300">{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
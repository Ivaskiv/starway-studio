// packages/frontend/src/pages/home/LandingPage.tsx
import { Button, GlassCard } from '@/ui'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <GlassCard className="p-8 max-w-2xl text-center" data-hover="lift">
        <h1 className="text-4xl font-bold text-white mb-4">AI-Ментор: З Стану в Дію</h1>
        <p className="text-slate-300 mb-6">
          Жорстка система: Стан → Ціль → Вибір → Рішення → Дія. Без мотивації, тільки фіксація та зсув.
        </p>
        <div className="space-y-4 mb-8">
          <p className="text-orange-400 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" /> 7-денний trial: Колесо балансу + щоденний цикл
          </p>
          <p className="text-green-400">Потім: Підписка 33€/міс + наставництво, або рік з бонусами</p>
        </div>
        <Button
          onClick={() => navigate('/auth')}
          data-color="orange"
          data-size="lg"
          className="w-full md:w-auto"
        >
          Почати trial (7 днів безкоштовно)
        </Button>
        <p className="text-xs text-slate-500 mt-4">
          Інтеграція з Telegram: Завдання та нагадування в чаті
        </p>
      </GlassCard>
    </div>
  )
}
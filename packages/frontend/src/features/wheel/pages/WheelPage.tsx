// features/wheel/pages/WheelPage.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, History, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { WheelForm } from '../components/WheelForm'
import { WheelHistory } from '../components/WheelHistory'

type Tab = 'assessment' | 'history'

export const WheelPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('assessment')

  if (!user) {
    navigate('/auth')
    return null
  }

  const handleComplete = () => {
    // Можна редіректити на AI Mentor
    navigate('/dashboard/ai-mentor')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              Колесо балансу
            </h1>
            <p className="text-white/60 mt-1">Оціни 8 ключових сфер свого життя</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
          <button
            onClick={() => setTab('assessment')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === 'assessment' 
                ? 'bg-purple-500 text-white' 
                : 'text-white/60 hover:text-white'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            Оцінка
          </button>
          <button
            onClick={() => setTab('history')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === 'history' 
                ? 'bg-purple-500 text-white' 
                : 'text-white/60 hover:text-white'
              }
            `}
          >
            <History className="w-4 h-4" />
            Історія
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {tab === 'assessment' ? (
            <WheelForm userId={user.id} onComplete={handleComplete} />
          ) : (
            <WheelHistory userId={user.id} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default WheelPage
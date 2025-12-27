// src/pages/user/Dashboard.tsx

import { useState, useEffect } from 'react'
import { Trophy, Flame, Clock, Target, CheckCircle, Lock, Play, MessageCircle, BookOpen, Award, TrendingUp, Calendar, Bell } from 'lucide-react'


export default function StudentDashboard() {
  const [progress, setProgress] = useState<UserProgress>({
    total_points: 1250,
    current_streak: 7,
    level: 5,
    completed_blocks: 12,
    total_blocks: 24,
    time_spent_minutes: 480,
    achievements: [
      { id: '1', title: 'Перший крок', icon: '🎯', unlocked: true },
      { id: '2', title: '7 днів поспіль', icon: '🔥', unlocked: true },
      { id: '3', title: '1000 балів', icon: '⭐', unlocked: true },
      { id: '4', title: 'Майстер завдань', icon: '🏆', unlocked: false, progress: 12, requirement: 20 }
    ]
  })

  const [blocks, setBlocks] = useState<Block[]>([
    { id: '1', type: 'video', title: 'Вступ до курсу', content: 'Відеоурок про основи...', completed: true, locked: false, points: 20 },
    { id: '2', type: 'text', title: 'Теоретична база', content: 'Текстовий урок...', completed: true, locked: false, points: 10 },
    { id: '3', type: 'task', title: 'Практичне завдання #1', content: 'Виконайте наступне...', completed: true, locked: false, points: 50, user_answer: 'Моя відповідь...' },
    { id: '4', type: 'video', title: 'Поглиблене вивчення', content: 'Наступний крок...', completed: false, locked: false, points: 20 },
    { id: '5', type: 'task', title: 'Практичне завдання #2', content: 'Створіть проєкт...', completed: false, locked: false, points: 50 },
    { id: '6', type: 'ai_session', title: 'Сесія з AI-ментором', content: 'Обговорення прогресу...', completed: false, locked: true, points: 30 }
  ])

  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [taskAnswer, setTaskAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const completionPercentage = (progress.completed_blocks / progress.total_blocks) * 100
  const nextLevelPoints = (progress.level + 1) * 500
  const levelProgress = (progress.total_points % 500) / 5

  const submitTask = async () => {
    if (!selectedBlock || !taskAnswer.trim()) {
      alert('Введіть відповідь')
      return
    }

    setIsSubmitting(true)
    
    // Симуляція відправки на сервер
    setTimeout(() => {
      setBlocks(blocks.map(b => 
        b.id === selectedBlock.id 
          ? { ...b, completed: true, user_answer: taskAnswer }
          : b
      ))
      
      setProgress({
        ...progress,
        completed_blocks: progress.completed_blocks + 1,
        total_points: progress.total_points + selectedBlock.points
      })
      
      setTaskAnswer('')
      setSelectedBlock(null)
      setIsSubmitting(false)
      
      alert(`✅ Завдання здано! +${selectedBlock.points} балів`)
    }, 1000)
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-5 w-5" />
      case 'text': return <BookOpen className="h-5 w-5" />
      case 'task': return <Target className="h-5 w-5" />
      case 'ai_session': return <MessageCircle className="h-5 w-5" />
      default: return <CheckCircle className="h-5 w-5" />
    }
  }

  const getBlockColor = (type: string) => {
    const colors: Record<string, string> = {
      video: 'border-orange-500 bg-orange-950/20',
      text: 'border-blue-800 bg-blue-950/20',
      task: 'border-green-700 bg-green-950/20',
      ai_session: 'border-purple-600 bg-purple-950/20'
    }
    return colors[type] || 'border-gray-700 bg-gray-900'
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🎓 Мій кабінет</h1>
          <p className="text-gray-400">Відстежуй прогрес та досягай цілей</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ЛІВА КОЛОНКА: Статистика */}
          <div className="space-y-6">
            {/* Основна статистика */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Твої досягнення
              </h2>

              <div className="space-y-4">
                {/* Рівень */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Рівень {progress.level}</span>
                    <span className="text-sm font-bold text-green-500">{progress.total_points} балів</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 h-full transition-all duration-500"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">До рівня {progress.level + 1}: {nextLevelPoints - progress.total_points} балів</p>
                </div>

                {/* Стрік */}
                <div className="flex items-center justify-between bg-orange-950/30 border border-orange-600 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Flame className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{progress.current_streak}</p>
                      <p className="text-xs text-gray-400">днів поспіль</p>
                    </div>
                  </div>
                  <span className="text-orange-500 text-2xl">🔥</span>
                </div>

                {/* Прогрес курсу */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Прогрес курсу</span>
                    <span className="text-sm font-bold">{Math.round(completionPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progress.completed_blocks} з {progress.total_blocks} блоків</p>
                </div>

                {/* Час на платформі */}
                <div className="flex items-center justify-between bg-blue-950/30 border border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{Math.floor(progress.time_spent_minutes / 60)}г {progress.time_spent_minutes % 60}хв</p>
                      <p className="text-xs text-gray-400">на платформі</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Досягнення */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Бейджі
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {progress.achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      achievement.unlocked
                        ? 'border-yellow-600 bg-yellow-950/30'
                        : 'border-gray-700 bg-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <p className="text-xs font-medium">{achievement.title}</p>
                    {!achievement.unlocked && achievement.progress && achievement.requirement && (
                      <p className="text-xs text-gray-500 mt-1">
                        {achievement.progress}/{achievement.requirement}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Зв'язок з ментором */}
            <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Зв'язатися з ментором
            </button>
          </div>

          {/* ЦЕНТРАЛЬНА + ПРАВА КОЛОНКА: Контент */}
          <div className="lg:col-span-2 space-y-6">
            {/* Блоки курсу */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">📚 Твій курс</h2>
              
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`border-2 rounded-xl p-4 transition ${getBlockColor(block.type)} ${
                      block.locked ? 'opacity-50' : 'hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-black rounded-lg flex items-center justify-center font-bold">
                        {block.completed ? <CheckCircle className="h-6 w-6 text-green-500" /> : index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getBlockIcon(block.type)}
                          <h3 className="font-bold">{block.title}</h3>
                          {block.locked && <Lock className="h-4 w-4 text-gray-500" />}
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-1">{block.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">+{block.points} балів</span>
                          {block.completed && (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Виконано
                            </span>
                          )}
                        </div>
                      </div>

                      {!block.locked && !block.completed && (
                        <button
                          onClick={() => setSelectedBlock(block)}
                          className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
                        >
                          {block.type === 'task' ? 'Здати' : 'Почати'}
                        </button>
                      )}

                      {block.completed && block.type === 'task' && (
                        <button
                          onClick={() => setSelectedBlock(block)}
                          className="px-6 py-2 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition"
                        >
                          Переглянути
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Модальне вікно завдання */}
            {selectedBlock && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedBlock.title}</h2>
                      <p className="text-gray-400">+{selectedBlock.points} балів за виконання</p>
                    </div>
                    <button
                      onClick={() => setSelectedBlock(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-black/50 border border-gray-800 rounded-xl p-6 mb-6">
                    <p className="text-gray-300 leading-relaxed">{selectedBlock.content}</p>
                  </div>

                  {selectedBlock.type === 'task' && !selectedBlock.completed && (
                    <>
                      <label className="block mb-2 font-medium">Твоя відповідь:</label>
                      <textarea
                        value={taskAnswer}
                        onChange={(e) => setTaskAnswer(e.target.value)}
                        placeholder="Опишіть своє рішення..."
                        rows={6}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white resize-none mb-4"
                      />

                      <div className="flex gap-4">
                        <button
                          onClick={() => setSelectedBlock(null)}
                          className="flex-1 px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition"
                        >
                          Скасувати
                        </button>
                        <button
                          onClick={submitTask}
                          disabled={isSubmitting || !taskAnswer.trim()}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-lg transition"
                        >
                          {isSubmitting ? 'Надсилаю...' : 'Здати завдання'}
                        </button>
                      </div>
                    </>
                  )}

                  {selectedBlock.completed && selectedBlock.user_answer && (
                    <div>
                      <h3 className="font-bold mb-2 text-green-500">✅ Твоя відповідь:</h3>
                      <div className="bg-green-950/30 border border-green-700 rounded-lg p-4">
                        <p className="text-gray-300">{selectedBlock.user_answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Нагадування */}
            <div className="bg-gradient-to-r from-red-950/50 to-orange-950/50 border-2 border-orange-600 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <Bell className="h-12 w-12 text-orange-500" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">🔔 Не забудь!</h3>
                  <p className="text-gray-300">Сьогодні о 18:00 — практичне завдання #2</p>
                </div>
                <button className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition">
                  Налаштувати
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
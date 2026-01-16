// packages/frontend/src/features/ai-mentor/pages/AIMentorPage.tsx

import {
  Bell,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { useGetProgressOverviewQuery } from '@/features/progress/services/progress.api'

import {
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
} from '@/templates/ai-mentor/services/aiMentor.api'

import {
  useCompleteTaskMutation,
  useCreateTaskMutation,
  useGetTodayTasksQuery,
} from '@/services/mentor.api'

import { TelegramConnectModal } from '@/features/ai-mentor/components/TelegramConnectModal'
// import { WheelModal } from '@/features/wheel/components/WheelModal'
import { Button, GlassCard, Input, Progress } from '@/ui'

import { useGetWheelQuery } from '@/services'
import { ChatMessage, DailyTask } from '@/types/mentor.types'

export default function AIMentorPage() {
  const { data: userData } = useGetMeQuery()
  const user = userData?.user

  const { data: progress, isLoading: isLoadingProgress } = useGetProgressOverviewQuery()
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTodayTasksQuery()
  const { data: wheelData, isLoading: isLoadingWheel } = useGetWheelQuery()

  // Правильний запит чату з user_id + skip
  const { data: chatData, isLoading: isLoadingChat } = useGetChatHistoryQuery(
    { user_id: user?.id || '', limit: 5 },
    { skip: !user?.id } 
  )

  const [completeTask] = useCompleteTaskMutation()
  const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation()
  const [sendMessage, { isLoading: isSendingMessage }] = useSendChatMessageMutation()

  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [showWheelModal, setShowWheelModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [chatInput, setChatInput] = useState('')

  const isTelegramConnected = Boolean(user?.telegram_id)

  // Stats з безпечними fallback'ами
const totalPoints = progress?.total_points ?? 0;
const level = Math.floor(totalPoints / 500) + 1;
const pointsToNextLevel = 500 - (totalPoints % 500);
const levelProgress = ((totalPoints % 500) / 500) * 100;

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId).unwrap()
      toast.success('Завдання виконано!')
    } catch (err) {
      console.error('Complete task error:', err)
      toast.error('Не вдалося виконати завдання')
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return
    try {
      await createTask({ title: newTaskTitle.trim() }).unwrap()
      setNewTaskTitle('')
      toast.success('Завдання додано!')
    } catch (err) {
      console.error('Create task error:', err)
      toast.error('Не вдалося додати завдання')
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return
    if (!user?.id) {
      toast.error('Не вдалося визначити користувача. Спробуйте увійти знову.')
      return
    }

    try {
      await sendMessage({ 
        user_id: user.id, 
        content: chatInput.trim() 
      }).unwrap()
      
      setChatInput('')
      toast.success('Повідомлення надіслано!')
    } catch (err: any) {
      console.error('Send message error:', err)
      toast.error(err?.data?.message || 'Не вдалося надіслати повідомлення')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 
                        flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Ментор</h1>
            <p className="text-white/60">Твій персональний помічник для росту</p>
          </div>
        </div>

        {/* Telegram Connect */}
        {!isTelegramConnected && (
          <Button
            onClick={() => setShowTelegramModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 
                     hover:bg-blue-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-blue-400 font-medium">Підключи Telegram</p>
              <p className="text-white/40 text-sm">Для нагадувань та прогресу</p>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-400" />
          </Button>
        )}
      </div>

      {/* Stats Row */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {/* Стрік */}
  <GlassCard className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
        <Flame className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{progress?.current_streak ?? 0}</p>
        <p className="text-xs text-white/50">днів поспіль</p>
      </div>
    </div>
  </GlassCard>

  {/* Виконані блоки */}
  <GlassCard className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
        <Target className="w-5 h-5 text-green-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{progress?.completed_blocks ?? 0}</p>
        <p className="text-xs text-white/50">блоків виконано</p>
      </div>
    </div>
  </GlassCard>

  {/* Total Points */}
  <GlassCard className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-purple-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{totalPoints}</p>
        <p className="text-xs text-white/50">балів</p>
      </div>
    </div>
  </GlassCard>

  {/* Рівень */}
  <GlassCard className="p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
        <TrendingUp className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">Рівень {level}</p>
        <p className="text-xs text-white/50">{pointsToNextLevel} балів до наступного</p>
      </div>
    </div>
  </GlassCard>
</div>

{/* Level Progress */}
<GlassCard className="p-6">
  <h2 className="text-lg font-semibold text-white mb-4">Прогрес рівня</h2>
  
  <div className="flex items-center gap-4 mb-4">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                  flex items-center justify-center shadow-lg shadow-purple-500/30">
      <span className="text-2xl font-bold text-white">{level}</span>
    </div>
    <div className="flex-1">
      <p className="text-white font-medium">Рівень {level}</p>
      <p className="text-white/40 text-sm">{totalPoints} балів</p>
    </div>
  </div>

  <Progress 
    value={levelProgress} 
    color="purple" 
    size="md" 
  />
  <p className="text-white/40 text-xs mt-2 text-center">
    {pointsToNextLevel} балів до рівня {level + 1}
  </p>
</GlassCard>


<div className="grid lg:grid-cols-3 gap-6">
  {/* Tasks & Chat Column */}
  <div className="lg:col-span-2 space-y-6">
    {/* Today's Tasks */}
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          Сьогоднішні завдання
        </h2>
        <span className="text-white/40 text-sm">
          {tasksData?.completed ?? 0}/{tasksData?.total ?? 0}
        </span>
      </div>

      {isLoadingTasks ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasksData?.tasks?.map((task: DailyTask) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                task.status === 'completed'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Button
                variant="ghost"
                onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                className={`w-6 h-6 rounded-full p-0 ${
                  task.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'border-2 border-white/30 hover:border-green-500'
                }`}
              >
                {task.status === 'completed' && <Check className="w-4 h-4" />}
              </Button>
              <span className={`flex-1 ${task.status === 'completed' ? 'text-white/50 line-through' : 'text-white'}`}>
                {task.title}
              </span>
              {task.scheduledTime && (
                <span className="text-white/40 text-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.scheduledTime}
                </span>
              )}
            </div>
          ))}

          {(!tasksData?.tasks || tasksData.tasks.length === 0) && (
            <div className="text-center py-8 text-white/40">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Завдань на сьогодні немає</p>
            </div>
          )}

          {/* Add Task */}
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="Додати завдання..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isCreatingTask}
              className="px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
            >
              {isCreatingTask ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      )}
    </GlassCard>

    {/* Chat with Mentor */}
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-purple-400" />
        Чат з ментором
      </h2>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
        {isLoadingChat ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : chatData?.messages ? (
          chatData.messages.length > 0 ? (
            chatData.messages.slice(-5).map((msg: ChatMessage) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-orange-500/20 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">Напиши мені перше повідомлення!</p>
              <p className="text-sm mt-2 opacity-70">
                Я допоможу з цілями, мотивацією чи розбором дня
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-white/50">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Чат ще не завантажився...</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
          placeholder="Напиши повідомлення... (Enter для відправки)"
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          rows={1}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!chatInput.trim() || isSendingMessage || !user?.id}
          className="min-w-[44px] h-[44px] p-0 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSendingMessage ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </GlassCard>
  </div>

  {/* Right Column */}
  <div className="space-y-6">
    {/* Wheel of Balance */}
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        Колесо балансу
      </h2>

      {isLoadingWheel ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : wheelData?.current ? (
        <>
          <div className="flex justify-center mb-4">
            <div className="w-44 h-44 rounded-full border-4 border-purple-500/30 flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <div className="text-center">
                <span className="text-3xl font-bold text-white">
                  {wheelData.current.average.toFixed(1)}
                </span>
                <span className="text-white/40 text-sm block">/ 10</span>
              </div>
            </div>
          </div>
          <p className="text-white/40 text-sm text-center">
            Оновлено: {new Date(wheelData.current.completed_at).toLocaleDateString('uk')}
          </p>
        </>
      ) : (
        <div className="text-center py-8 text-white/40">
          <p className="mb-4">Колесо ще не заповнено</p>
        </div>
      )}

      <Button
        onClick={() => setShowWheelModal(true)}
        disabled={!wheelData?.canFillNew}
        className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white rounded-xl"
      >
        {wheelData?.canFillNew ? 'Оновити оцінку' : `Доступно через ${wheelData?.daysUntilNext ?? 0} дн.`}
      </Button>
    </GlassCard>

    {/* Level Progress */}
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Прогрес рівня</h2>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                      flex items-center justify-center shadow-lg shadow-purple-500/30">
          <span className="text-2xl font-bold text-white">{level}</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">Рівень {level}</p>
          <p className="text-white/40 text-sm">{totalPoints} балів</p>
        </div>
      </div>

      <Progress 
        value={levelProgress} 
        color="purple" 
        size="md" 
      />
      <p className="text-white/40 text-xs mt-2 text-center">
        {pointsToNextLevel} балів до рівня {level + 1}
      </p>
    </GlassCard>
  </div>
</div>


      {/* Modals */}
      <TelegramConnectModal 
        isOpen={showTelegramModal} 
        onClose={() => setShowTelegramModal(false)} 
      />

      {/* <WheelModal
      user_id={user_id}
        isOpen={showWheelModal}
        onClose={() => setShowWheelModal(false)}
        onComplete={() => setShowWheelModal(false)}
      /> */}
    </div>
  )
}
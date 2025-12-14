import { useState } from 'react'
import { Sparkles, Video, FileText, CheckSquare, MessageCircle, Calendar, Gift, ClipboardCheck, Trash2, Save, ArrowLeft, Plus, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'

interface Block {
  id: string
  type: 'video' | 'text' | 'task' | 'ai_session' | 'reminder' | 'bonus' | 'quiz'
  order: number
  title: string
  content: string
  duration?: number
  points?: number
  deadline_hours?: number
  settings?: {
    video_url?: string
    task_type?: 'text' | 'file' | 'photo' | 'video'
    ai_prompt?: string
    quiz_questions?: any[]
  }
}

interface ProductForm {
  title: string
  description: string
  type: 'course' | 'practicum' | 'ai_mentor'
  category: string
  duration_days: number
  price: number
  access_type: 'one_time' | 'subscription'
}

const BLOCK_TYPES = [
  { type: 'video', icon: Video, label: 'Відеоурок', color: 'orange', points: 20 },
  { type: 'text', icon: FileText, label: 'Текстовий урок', color: 'blue', points: 10 },
  { type: 'task', icon: CheckSquare, label: 'Завдання', color: 'green', points: 50 },
  { type: 'ai_session', icon: MessageCircle, label: 'AI-ментор сесія', color: 'purple', points: 30 },
  { type: 'reminder', icon: Calendar, label: 'Нагадування', color: 'red', points: 0 },
  { type: 'bonus', icon: Gift, label: 'Бонус/Ресурс', color: 'yellow', points: 15 },
  { type: 'quiz', icon: ClipboardCheck, label: 'Тест', color: 'cyan', points: 40 },
] as const

export default function UniversalProductBuilder() {
  const [productForm, setProductForm] = useState<ProductForm>({
    title: '',
    description: '',
    type: 'practicum',
    category: 'personal_growth',
    duration_days: 7,
    price: 0,
    access_type: 'one_time'
  })
  
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const addBlock = (type: Block['type']) => {
    const blockType = BLOCK_TYPES.find(b => b.type === type)
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      order: blocks.length + 1,
      title: '',
      content: '',
      duration: 15,
      points: blockType?.points || 0,
      deadline_hours: type === 'task' ? 48 : undefined,
      settings: {
        task_type: type === 'task' ? 'text' : undefined
      }
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const generateWithAI = async () => {
    if (!productForm.title) {
      alert('Спочатку вкажіть назву продукту')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Створи структуру ${productForm.type === 'course' ? 'курсу' : productForm.type === 'practicum' ? 'практикуму' : 'AI-ментора'} "${productForm.title}" на ${productForm.duration_days} днів.
            Категорія: ${productForm.category}
            
            Доступні типи блоків: video, text, task, ai_session, reminder, bonus, quiz
            
            Поверни JSON масив блоків:
            [
              {
                "type": "video/text/task/ai_session/reminder/bonus/quiz",
                "title": "назва блоку",
                "content": "детальний опис",
                "duration": 15,
                "points": 20
              }
            ]
            
            Для практикуму: фокус на завданнях та прогресі
            Для курсу: більше відео та тестів
            Для AI-ментора: багато ai_session блоків
            
            Повертай ТІЛЬКИ JSON.`
          }]
        })
      })
      
      const data = await response.json()
      const content = data.content[0].text
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      
      if (jsonMatch) {
        const generatedBlocks = JSON.parse(jsonMatch[0])
        setBlocks(generatedBlocks.map((b: any, i: number) => ({
          ...b,
          id: `block-${Date.now()}-${i}`,
          order: i + 1,
          settings: b.type === 'task' ? { task_type: 'text' } : {}
        })))
      }
    } catch (err) {
      console.error(err)
      alert('Помилка генерації')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveProduct = async () => {
    if (!productForm.title || blocks.length === 0) {
      alert('Заповніть назву та додайте блоки')
      return
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...productForm, blocks })
      })
      
      if (response.ok) {
        alert('✅ Продукт створено!')
      }
    } catch (err) {
      console.error(err)
      alert('Помилка збереження')
    }
  }

  const getBlockIcon = (type: string) => {
    const block = BLOCK_TYPES.find(b => b.type === type)
    return block ? <block.icon className="h-5 w-5" /> : null
  }

  const getBlockColor = (type: string) => {
    const colorMap: Record<string, string> = {
      video: 'border-orange-500 bg-orange-950/20',
      text: 'border-blue-800 bg-blue-950/20',
      task: 'border-green-700 bg-green-950/20',
      ai_session: 'border-purple-600 bg-purple-950/20',
      reminder: 'border-red-600 bg-red-950/20',
      bonus: 'border-yellow-600 bg-yellow-950/20',
      quiz: 'border-cyan-600 bg-cyan-950/20'
    }
    return colorMap[type] || 'border-gray-700 bg-gray-900'
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад до списку
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🚀 Конструктор продуктів</h1>
          <p className="text-gray-400">Курси • Практикуми • AI-ментори</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ЛІВА ПАНЕЛЬ */}
          <div className="space-y-6">
            {/* Налаштування продукту */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">⚙️ Налаштування</h2>
              
              <div className="space-y-4">
                <Select
                  label="Тип продукту"
                  value={productForm.type}
                  onChange={(e) => setProductForm({ ...productForm, type: e.target.value as ProductForm['type'] })}
                  options={[
                    { value: 'course', label: '📚 Курс' },
                    { value: 'practicum', label: '🎯 Практикум' },
                    { value: 'ai_mentor', label: '🤖 AI-ментор' }
                  ]}
                />

                <Input
                  label="Назва *"
                  type="text"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="Назва продукту"
                />

                <Textarea
                  label="Опис"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  placeholder="Короткий опис продукту"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Тривалість"
                    type="number"
                    value={productForm.duration_days}
                    onChange={(e) => setProductForm({ ...productForm, duration_days: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                  <Input
                    label="Ціна (₴)"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <Select
                  label="Доступ"
                  value={productForm.access_type}
                  onChange={(e) => setProductForm({ ...productForm, access_type: e.target.value as ProductForm['access_type'] })}
                  options={[
                    { value: 'one_time', label: 'Разова покупка' },
                    { value: 'subscription', label: 'Підписка' }
                  ]}
                />

                <Button
                  variant="primary"
                  onClick={generateWithAI}
                  disabled={!productForm.title || isGenerating}
                  isLoading={isGenerating}
                  className="w-full"
                >
                  {!isGenerating && <Sparkles className="h-5 w-5" />}
                  {isGenerating ? 'Генерую...' : 'Згенерувати з AI'}
                </Button>
              </div>
            </div>

            {/* Додати блоки */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">➕ Додати блок</h3>
              <div className="space-y-2">
                {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    variant="secondary"
                    onClick={() => addBlock(type)}
                    className="w-full justify-start border border-gray-700"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Статистика */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">📊 Статистика</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Всього блоків:</span>
                  <span className="font-bold">{blocks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Завдань:</span>
                  <span className="font-bold">{blocks.filter(b => b.type === 'task').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Відео:</span>
                  <span className="font-bold">{blocks.filter(b => b.type === 'video').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Загальні бали:</span>
                  <span className="font-bold text-green-500">{blocks.reduce((sum, b) => sum + (b.points || 0), 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ПРАВА ПАНЕЛЬ */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">📦 Структура продукту</h2>
                <span className="text-sm text-gray-400">{blocks.length} блоків</span>
              </div>

              {blocks.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Plus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Додайте блоки або згенеруйте з AI</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={`border-2 rounded-xl p-4 ${getBlockColor(block.type)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-600 cursor-move" />
                          <div className="flex-shrink-0 w-10 h-10 bg-black rounded-lg flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {getBlockIcon(block.type)}
                            <Input
                              type="text"
                              value={block.title}
                              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                              placeholder="Назва блоку"
                              className="flex-1"
                            />
                            <Button
                              variant="danger"
                              onClick={() => deleteBlock(block.id)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          <Textarea
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="Опис блоку..."
                            rows={2}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            {block.type !== 'reminder' && (
                              <Input
                                label="Тривалість (хв)"
                                type="number"
                                value={block.duration || 15}
                                onChange={(e) => updateBlock(block.id, { duration: parseInt(e.target.value) || 15 })}
                                min={1}
                              />
                            )}
                            <Input
                              label="Бали за виконання"
                              type="number"
                              value={block.points || 0}
                              onChange={(e) => updateBlock(block.id, { points: parseInt(e.target.value) || 0 })}
                              min={0}
                            />
                          </div>

                          {block.type === 'task' && (
                            <Select
                              label="Тип завдання"
                              value={block.settings?.task_type || 'text'}
                              onChange={(e) => updateBlock(block.id, {
                                settings: { ...block.settings, task_type: e.target.value as any }
                              })}
                              options={[
                                { value: 'text', label: 'Текстова відповідь' },
                                { value: 'file', label: 'Файл' },
                                { value: 'photo', label: 'Фото' },
                                { value: 'video', label: 'Відео' }
                              ]}
                            />
                          )}

                          {block.type === 'video' && (
                            <Input
                              label="URL відео"
                              type="url"
                              value={block.settings?.video_url || ''}
                              onChange={(e) => updateBlock(block.id, {
                                settings: { ...block.settings, video_url: e.target.value }
                              })}
                              placeholder="https://youtube.com/watch?v=..."
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {blocks.length > 0 && (
                <Button
                  variant="success"
                  onClick={saveProduct}
                  className="w-full py-4"
                >
                  <Save className="h-5 w-5" />
                  Зберегти продукт
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
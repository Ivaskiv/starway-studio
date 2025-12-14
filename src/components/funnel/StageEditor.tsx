// src/components/funnel/StageEditor.tsx
import { useState } from 'react'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { 
  Sparkles, Plus, Trash2, Clock, 
  Target, MessageSquare, Mail
} from 'lucide-react'

interface StageData {
  id: string
  name: string
  type: string
  duration: number
  product?: {
    name: string
    price: number
    description: string
  }
  channels: string[]
  triggers: Trigger[]
  messages: Message[]
}

interface Trigger {
  id: string
  event: string
  action: string
  delay: number
}

interface Message {
  id: string
  type: 'email' | 'telegram' | 'ai'
  subject?: string
  content: string
  sendAfter: number
}

export default function StageEditor({ 
  stage, 
  onUpdate, 
  onClose 
}: { 
  stage: StageData
  onUpdate: (data: Partial<StageData>) => void
  onClose: () => void
}) {
  const [data, setData] = useState(stage)
  const [activeTab, setTab] = useState<'general' | 'product' | 'automation'>('general')

  const updateData = (updates: Partial<StageData>) => {
    const newData = { ...data, ...updates }
    setData(newData)
    onUpdate(updates)
  }

  const addTrigger = () => {
    const newTrigger: Trigger = {
      id: `trigger-${Date.now()}`,
      event: 'урок_завершено',
      action: 'відправити_повідомлення',
      delay: 0
    }
    updateData({ triggers: [...data.triggers, newTrigger] })
  }

  const removeTrigger = (id: string) => {
    updateData({ triggers: data.triggers.filter(t => t.id !== id) })
  }

  const addMessage = () => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'telegram',
      content: '',
      sendAfter: 0
    }
    updateData({ messages: [...data.messages, newMessage] })
  }

  const updateMessage = (id: string, updates: Partial<Message>) => {
    updateData({ 
      messages: data.messages.map(m => 
        m.id === id ? { ...m, ...updates } : m
      )
    })
  }

  const removeMessage = (id: string) => {
    updateData({ messages: data.messages.filter(m => m.id !== id) })
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h3 className="text-xl font-bold">{data.name}</h3>
        <Button 
          onClick={onClose} 
          variant="ghost"
          className="p-2"
          aria-label="Закрити"
        >
          ✕
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {['general', 'product', 'automation'].map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab as any)}
            className={`px-6 py-3 font-medium transition ${
              activeTab === tab
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'general' && '⚙️ Загальне'}
            {tab === 'product' && '📦 Продукт'}
            {tab === 'automation' && '🤖 Автоматизація'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* General */}
        {activeTab === 'general' && (
          <>
            <Input
              label="Назва етапу"
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
            />

            <Input
              label="Тривалість (днів)"
              type="number"
              value={data.duration}
              onChange={(e) => updateData({ duration: parseInt(e.target.value) })}
            />

            <div>
              <p className="text-sm font-medium mb-3">Канали</p>
              {['landing', 'telegram', 'email', 'payment', 'ai-mentor'].map(ch => (
                <label key={ch} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.channels.includes(ch)}
                    onChange={(e) => {
                      const newChannels = e.target.checked
                        ? [...data.channels, ch]
                        : data.channels.filter(c => c !== ch)
                      updateData({ channels: newChannels })
                    }}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <span className="text-sm capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Product */}
        {activeTab === 'product' && (
          <>
            <Input
              label="Назва продукту"
              value={data.product?.name || ''}
              onChange={(e) => updateData({ 
                product: { ...data.product!, name: e.target.value }
              })}
            />

            <Input
              label="Ціна (₴)"
              type="number"
              value={data.product?.price || 0}
              onChange={(e) => updateData({ 
                product: { ...data.product!, price: parseInt(e.target.value) }
              })}
            />

            <Textarea
              label="Опис"
              value={data.product?.description || ''}
              onChange={(e) => updateData({ 
                product: { ...data.product!, description: e.target.value }
              })}
              rows={4}
            />

            <Button variant="secondary" className="w-full">
              <Sparkles size={16} />
              Згенерувати AI опис
            </Button>
          </>
        )}

        {/* Automation */}
        {activeTab === 'automation' && (
          <>
            {/* Triggers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">Тригери</p>
                <Button variant="secondary" onClick={addTrigger} className="text-sm">
                  <Plus size={16} />
                  Додати
                </Button>
              </div>
              
              {data.triggers.map(trigger => (
                <div key={trigger.id} className="bg-gray-800 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <Target size={16} className="text-orange-400" />
                    <Button 
                      onClick={() => removeTrigger(trigger.id)}
                      variant="ghost"
                      className="p-1"
                      aria-label="Видалити тригер"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </div>
                  <Select
                    label="Подія"
                    options={[
                      { value: 'урок_завершено', label: 'Урок завершено' },
                      { value: 'не_активний', label: '3 дні не активний' },
                      { value: 'email_відкрито', label: 'Email відкрито' }
                    ]}
                    value={trigger.event}
                    className="mb-2"
                  />
                  <Select
                    label="Дія"
                    options={[
                      { value: 'відправити_повідомлення', label: 'Відправити повідомлення' },
                      { value: 'показати_оффер', label: 'Показати оффер' }
                    ]}
                    value={trigger.action}
                  />
                </div>
              ))}
            </div>

            {/* Messages */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">Повідомлення</p>
                <Button variant="secondary" onClick={addMessage} className="text-sm">
                  <Plus size={16} />
                  Додати
                </Button>
              </div>

              {data.messages.map(msg => (
                <div key={msg.id} className="bg-gray-800 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    {msg.type === 'email' ? <Mail size={16} /> : <MessageSquare size={16} />}
                    <Button 
                      onClick={() => removeMessage(msg.id)}
                      variant="ghost"
                      className="p-1"
                      aria-label="Видалити повідомлення"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </div>

                  <Select
                    label="Тип"
                    options={[
                      { value: 'telegram', label: 'Telegram' },
                      { value: 'email', label: 'Email' },
                      { value: 'ai', label: 'AI-ментор' }
                    ]}
                    value={msg.type}
                    onChange={(e) => updateMessage(msg.id, { type: e.target.value as any })}
                    className="mb-2"
                  />

                  {msg.type === 'email' && (
                    <Input
                      label="Тема"
                      value={msg.subject || ''}
                      onChange={(e) => updateMessage(msg.id, { subject: e.target.value })}
                      className="mb-2"
                    />
                  )}

                  <Textarea
                    label="Текст"
                    value={msg.content}
                    onChange={(e) => updateMessage(msg.id, { content: e.target.value })}
                    rows={3}
                    className="mb-2"
                  />

                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <Input
                      type="number"
                      value={msg.sendAfter}
                      onChange={(e) => updateMessage(msg.id, { sendAfter: parseInt(e.target.value) })}
                      className="flex-1"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-400">годин</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-800">
        <Button variant="primary" className="w-full">
          Зберегти зміни
        </Button>
      </div>
    </div>
  )
}
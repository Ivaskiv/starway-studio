// src/features/demo/demoModels.ts

import { Module } from "@/types/src/types/api";

export const DEMO_MODULES: Module[] = [
  {
    id: 'ai-mentor',
    name: 'AI-Ментор',
    description: 'Персональний асистент на базі GPT',
    category: 'ai',
    icon: '🤖',
    enabled: true,
    isPremium: true,
    version: '1.0.0',
    settings: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    }
  },
  {
    id: 'telegram-bot',
    name: 'Telegram-бот',
    description: 'Автоматизація через Telegram',
    category: 'automation',
    icon: '✈️',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  },
  {
    id: 'tasks',
    name: 'Завдання',
    description: 'Чек-листи та трекінг виконання',
    category: 'productivity',
    icon: '✅',
    enabled: true,
    isPremium: false,
    version: '1.0.0'
  }
]

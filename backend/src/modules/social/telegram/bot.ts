// backend/src/telegram/bot.ts
import TelegramBot from 'node-telegram-bot-api'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set')
}

export const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false })

export async function sendMessage(chatId: number | string, text: string) {
  return telegramBot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
}

export async function sendDocument(chatId: number | string, fileBuffer: Buffer, options?: { caption?: string }) {
  return telegramBot.sendDocument(chatId, fileBuffer, options)
}

export async function sendPhoto(chatId: number | string, fileBuffer: Buffer, options?: { caption?: string }) {
  return telegramBot.sendPhoto(chatId, fileBuffer, options)
}

export async function sendAudio(chatId: number | string, fileBuffer: Buffer, options?: { caption?: string; title?: string }) {
  return telegramBot.sendAudio(chatId, fileBuffer, options)
}

export async function sendVideo(chatId: number | string, fileBuffer: Buffer, options?: { caption?: string; supports_streaming?: boolean }) {
  return telegramBot.sendVideo(chatId, fileBuffer, options)
}
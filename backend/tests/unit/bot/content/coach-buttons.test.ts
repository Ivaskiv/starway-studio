import { describe, expect, it } from 'vitest'

import { coachBotContent } from '../../../../src/bot/content/coachBot.content.ts'
import {
  MENU_AGENTS_PATTERN,
  MENU_ANALYTICS_PATTERN,
  MENU_CONDUCT_PATTERN,
  MENU_LIBRARY_PATTERN,
  MENU_SETTINGS_PATTERN,
  buildCoachMainMenuReplyMarkup,
  showCoachSystemMenu,
} from '../../../../src/bot/handlers/coach/menu.ts'

function createCtx() {
  return {
    chat: { id: 42, type: 'private' },
    from: { id: 99 },
    reply: async () => undefined,
  }
}

function hasDecorativeEmoji(value: string): boolean {
  return /[\u{1F300}-\u{1FAFF}]/u.test(value)
}

describe('coach button labels', () => {
  it('renders the main coach reply keyboard without decorative emoji', () => {
    const markup = buildCoachMainMenuReplyMarkup()
    const keyboard = markup.reply_markup.keyboard.flat()

    expect(keyboard).toEqual([
      coachBotContent.menu.conduct,
      coachBotContent.menu.library,
      coachBotContent.menu.analytics,
      coachBotContent.menu.content,
      coachBotContent.menu.settings,
      coachBotContent.menu.agents,
    ])
    expect(keyboard.every((label) => !hasDecorativeEmoji(label))).toBe(true)
  })

  it('keeps legacy emoji-prefixed incoming menu text compatible with existing regex patterns', () => {
    expect(MENU_CONDUCT_PATTERN.test('🎙️ Новий Zoom')).toBe(true)
    expect(MENU_LIBRARY_PATTERN.test('📚 Бібліотека Zoom')).toBe(true)
    expect(MENU_ANALYTICS_PATTERN.test('📊 Аналітика')).toBe(true)
    expect(MENU_AGENTS_PATTERN.test('🤖 Агенти')).toBe(true)
    expect(MENU_SETTINGS_PATTERN.test('⚙️ Система')).toBe(true)
  })

  it('keeps touched inline button labels free from decorative emoji and preserves routes', async () => {
    const replies: Array<{ text: string; payload: any }> = []
    const ctx = {
      ...createCtx(),
      reply: async (text: string, payload: any) => {
        replies.push({ text, payload })
        return undefined
      },
    }

    await showCoachSystemMenu(ctx as never)

    const inlineButtons = replies[0]?.payload?.reply_markup?.inline_keyboard?.flat() ?? []
    const buttonTexts = inlineButtons.map((button: { text: string }) => button.text)
    const callbackData = inlineButtons
      .map((button: { callback_data?: string }) => button.callback_data)
      .filter(Boolean)

    expect(buttonTexts).toContain(coachBotContent.menu.schedule)
    expect(buttonTexts).toContain(coachBotContent.menu.members)
    expect(buttonTexts).toContain(coachBotContent.menu.notifications)
    expect(buttonTexts).toContain(coachBotContent.menu.payments)
    expect(buttonTexts.every((label: string) => !hasDecorativeEmoji(label))).toBe(true)
    expect(callbackData).toEqual(expect.arrayContaining([
      'coach:participants',
      'coach:notifications',
      'coach-content:payments',
      'coach:analytics',
    ]))
  })

  it('keeps next-week state buttons meaningful without emoji', () => {
    expect(coachBotContent.nextWeek.dayOpen.startsWith('✓')).toBe(true)
    expect(coachBotContent.nextWeek.dayClosed.startsWith('✗')).toBe(true)
    expect(coachBotContent.nextWeek.hourOpen.startsWith('✓')).toBe(true)
    expect(coachBotContent.nextWeek.hourClosed.startsWith('✗')).toBe(true)
    expect(hasDecorativeEmoji(coachBotContent.nextWeek.btnHours)).toBe(false)
    expect(hasDecorativeEmoji(coachBotContent.nextWeek.btnDone)).toBe(false)
  })
})

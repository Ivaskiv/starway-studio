import { describe, expect, it } from 'vitest'

import { coachBotContent } from '../../../../src/bot/content/coachBot.content.ts'
import {
  MENU_AGENTS_PATTERN,
  MENU_ANALYTICS_PATTERN,
  MENU_CONDUCT_PATTERN,
  MENU_LIBRARY_PATTERN,
  MENU_SETTINGS_PATTERN,
  buildCoachMainMenuReplyMarkup,
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
  it('renders the compact main coach reply keyboard', () => {
    const markup = buildCoachMainMenuReplyMarkup()
    const keyboard = markup.reply_markup.keyboard.flat()
    const labels = keyboard.map((button) => typeof button === 'string' ? button : button.text)

    expect(labels).toEqual([
      coachBotContent.system.calendarCta,
      coachBotContent.menu.members,
      coachBotContent.menu.battle,
      coachBotContent.menu.analytics,
      coachBotContent.menu.more,
    ])
    expect(labels).not.toContain(coachBotContent.menu.conduct)
    expect(labels).not.toContain(coachBotContent.menu.calendar)
  })

  it('keeps legacy emoji-prefixed incoming menu text compatible with existing regex patterns', () => {
    expect(MENU_CONDUCT_PATTERN.test('🎙️ Новий Zoom')).toBe(true)
    expect(MENU_LIBRARY_PATTERN.test('📚 Бібліотека Zoom')).toBe(true)
    expect(MENU_ANALYTICS_PATTERN.test('📊 Аналітика')).toBe(true)
    expect(MENU_AGENTS_PATTERN.test('🤖 Агенти')).toBe(true)
    expect(MENU_SETTINGS_PATTERN.test('⚙️ Система')).toBe(true)
  })

  it('keeps the calendar CTA as one WebApp button and removes the old first-row pair', () => {
    const markup = buildCoachMainMenuReplyMarkup('EXPERT', 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token')
    const keyboard = markup.reply_markup.keyboard
    const labels = keyboard.flat().map((button) => typeof button === 'string' ? button : button.text)

    expect(keyboard[0]).toEqual([
      expect.objectContaining({
        text: coachBotContent.system.calendarCta,
        web_app: { url: 'https://miniapp.example/app/dashboard/zoom?dl=coach-zoom-token' },
      }),
    ])
    expect(labels).toEqual([
      coachBotContent.system.calendarCta,
      coachBotContent.menu.members,
      coachBotContent.menu.battle,
      coachBotContent.menu.analytics,
      coachBotContent.menu.more,
    ])
    expect(labels).not.toContain(coachBotContent.menu.conduct)
    expect(labels).not.toContain(coachBotContent.menu.calendar)
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

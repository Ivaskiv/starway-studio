import { describe, expect, it } from 'vitest'

import {
  quickDetectIntent,
  resolveNextStep,
  resolveTelegramIntelligence,
} from '../intelligence.ts'

describe('telegram intelligence routing', () => {
  it('routes focus questions to the focus intent', () => {
    expect(quickDetectIntent('Що таке ФОКУС?')).toEqual({
      intent: 'about_focus',
      confidence: 0.98,
    })
  })

  it('routes ABSystem methodology questions to the absystem intent', () => {
    expect(quickDetectIntent('Поясни 5 елементів ABSystem')).toEqual({
      intent: 'about_absystem',
      confidence: 0.98,
    })
  })

  it('routes pricing questions to the pricing intent', () => {
    expect(quickDetectIntent('Яка ціна і скільки коштує участь?')).toEqual({
      intent: 'pricing',
      confidence: 1,
    })
  })

  it('routes technical issues to human handoff', () => {
    expect(quickDetectIntent('Не працює доступ і помилка оплати')).toEqual({
      intent: 'technical_issue',
      confidence: 1,
    })
  })

  it('defaults to no quick match for neutral messages', () => {
    expect(quickDetectIntent('Дякую, зрозуміло')).toBeNull()
  })

  it('routes obvious out-of-scope questions to strict fallback', () => {
    expect(quickDetectIntent('Як купити квартиру у Львові?')).toEqual({
      intent: 'out_of_scope',
      confidence: 1,
    })
  })

  it('maps fallback and scope flags to the correct next step', () => {
    expect(resolveNextStep('about_focus', false)).toBe('show_focus')
    expect(resolveNextStep('about_absystem', false)).toBe('show_absystem')
    expect(resolveNextStep('technical_issue', false)).toBe('contact_nadya')
    expect(resolveNextStep('out_of_scope', false)).toBe('contact_nadya')
  })

  it('returns the exact 3 month price from the strict knowledge base', async () => {
    const result = await resolveTelegramIntelligence({
      chatId: 'test-chat',
      userId: null,
      message: 'Скільки коштує ФОКУС на 3 місяці?',
    })

    expect(result.message).toContain('69€')
    expect(result.message).toContain('30€')
    expect(result.isFallback).toBe(false)
  })

  it('never invents exact schedule times', async () => {
    const result = await resolveTelegramIntelligence({
      chatId: 'test-chat',
      userId: null,
      message: 'Який точний час сесій ФОКУСУ?',
    })

    expect(result.message).toContain('4 живі Zoom-розбори щомісяця')
    expect(result.message).toContain('Точний розклад уточни у Наді')
    expect(result.message).not.toMatch(/\b\d{1,2}:\d{2}\b/)
  })

  it('does not turn apartment questions into pricing or focus answers', async () => {
    const result = await resolveTelegramIntelligence({
      chatId: 'test-chat',
      userId: null,
      message: 'Як купити квартиру у Львові?',
    })

    expect(result.isFallback).toBe(true)
    expect(result.message).toContain('Це не мої компетенції')
  })
})

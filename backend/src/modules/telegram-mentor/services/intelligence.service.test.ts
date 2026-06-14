import { describe, expect, it } from 'vitest'

import {
  quickDetectIntent,
  resolveNextStep,
} from './intelligence.service.js'

describe('telegram intelligence routing', () => {
  it('routes focus questions to the focus intent', () => {
    expect(quickDetectIntent('Що таке ФОКУС?')).toEqual({
      intent: 'about_focus',
      confidence: 0.9,
    })
  })

  it('routes ABSystem methodology questions to the absystem intent', () => {
    expect(quickDetectIntent('Поясни 5 елементів ABSystem')).toEqual({
      intent: 'about_absystem',
      confidence: 0.9,
    })
  })

  it('routes pricing questions to the pricing intent', () => {
    expect(quickDetectIntent('Яка ціна і скільки коштує участь?')).toEqual({
      intent: 'pricing',
      confidence: 0.9,
    })
  })

  it('routes technical issues to human handoff', () => {
    expect(quickDetectIntent('Не працює доступ і помилка оплати')).toEqual({
      intent: 'technical_issue',
      confidence: 0.9,
    })
  })

  it('defaults to no quick match for neutral messages', () => {
    expect(quickDetectIntent('Дякую, зрозуміло')).toBeNull()
  })

  it('maps fallback and scope flags to the correct next step', () => {
    expect(resolveNextStep('about_focus', false)).toBe('show_focus')
    expect(resolveNextStep('about_absystem', false)).toBe('show_absystem')
    expect(resolveNextStep('technical_issue', false)).toBe('contact_nadya')
    expect(resolveNextStep('out_of_scope', false)).toBe('contact_nadya')
  })
})

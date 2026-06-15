import { describe, expect, it } from 'vitest'

import {
  formatAbTestTelegramLine,
  renderTelegramContentMessage,
  splitTelegramContentBlocks,
} from './abTest.views.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
} from '../content/abTest.results.js'

describe('abTest telegram formatting', () => {
  it('renders inline bold markers as html bold tags', () => {
    expect(
      formatAbTestTelegramLine('Ти вже **зробила перший крок** і пішла далі.'),
    ).toBe('Ти вже <b>зробила перший крок</b> і пішла далі.')
  })

  it('renders bold lines without literal markdown markers', () => {
    expect(
      renderTelegramContentMessage('РІШЕННЯ', [
        '**{firstName}, ось твій результат.**',
        'Звичайний рядок.',
      ]),
    ).toBe(
      '<b>РІШЕННЯ</b>\n\n<b>{firstName}, ось твій результат.</b>\n\nЗвичайний рядок.',
    )
  })

  it('interpolates firstName before splitting result intro blocks', () => {
    const definition = getAbTestResultDefinition('decision')
    const body = interpolateFirstName(definition.msg1, 'Vira')
    const blocks = splitTelegramContentBlocks(body.split('\n'))

    expect(blocks[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('Vira, ось твій результат.'),
    })
  })
})

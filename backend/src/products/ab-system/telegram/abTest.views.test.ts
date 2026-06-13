import { describe, expect, it } from 'vitest'

import { formatAbTestTelegramLine, renderTelegramContentMessage } from './abTest.views.js'

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
})

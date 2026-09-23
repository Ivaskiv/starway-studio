import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BattleInstruction } from '@/features/zoom/components/BattleInstruction'
import { battleInstructionContent } from '@/features/zoom/components/battleInstruction.content'

describe('BattleInstruction', () => {
  it('renders the canonical Battle instruction content owner', () => {
    const markup = renderToStaticMarkup(
      createElement(BattleInstruction, { onClose: vi.fn() }),
    )

    expect(battleInstructionContent.title).toBe('Правила Zoom Battle')
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('Правила Zoom Battle')
    expect(markup).toContain('7-денний формат 1v1')
    expect(markup).toContain('Роль учасника')
    expect(markup).toContain('Роль коуча')
    expect(markup).toContain('Нагороди')
    expect(markup).toContain('aria-label="Закрити правила Zoom Battle"')
    expect(markup).toContain('>Закрити<')
  })

  it('keeps instruction copy neutral and free from runtime field names', () => {
    const text = JSON.stringify(battleInstructionContent)

    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    expect(text).not.toMatch(/battleStatus|sessionId|requests|ZoomSessionAttendee/)
    expect(text).not.toContain('зробила')
    expect(text).not.toContain('учасниц')
  })
})

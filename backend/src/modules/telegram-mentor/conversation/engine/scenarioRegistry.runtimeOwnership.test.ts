import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('scenarioRegistry AB System runtime ownership', () => {
  it('does not keep duplicated focus payment preview copy inside conversation engine', () => {
    const source = readFileSync(
      new URL('./scenarioRegistry.ts', import.meta.url),
      'utf8',
    )

    expect(source).toContain('resolveCanonicalFocusPaymentView')
    expect(source).not.toContain('Супер. Якщо відгукується — нижче можеш одразу вибрати формат участі.')
    expect(source).not.toContain('Обирай зручний варіант, і після оплати ми відкриємо тобі доступ у ФОКУС.')
  })
})

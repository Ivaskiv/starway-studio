import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('scenarioRegistry AB System runtime ownership', () => {
  it('does not keep duplicated AB/FOCUS business copy inside conversation engine', () => {
    const rootDir = new URL('.', import.meta.url)
    const files = readdirSync(rootDir, { recursive: true })
      .filter((entry) => (
        typeof entry === 'string' &&
        entry.endsWith('.ts') &&
        !entry.endsWith('.test.ts') &&
        !entry.includes('__snapshots__')
      ))
      .map((entry) => join(rootDir.pathname, entry))

    const source = files
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    const scenarioRegistrySource = readFileSync(
      new URL('../scenarioRegistry.ts', import.meta.url),
      'utf8',
    )

    expect(scenarioRegistrySource).toContain('resolveCanonicalFocusPaymentView')
    expect(source).not.toContain('Твій результат уже готовий')
    expect(source).not.toContain('Можеш переглянути його ще раз або пройти тест заново')
    expect(source).not.toContain('Супер. Якщо відгукується — нижче можеш одразу вибрати формат участі.')
    expect(source).not.toContain('Обирай зручний варіант, і після оплати ми відкриємо тобі доступ у ФОКУС.')
    expect(source).not.toContain('ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ')
    expect(source).not.toContain('ПРОЙТИ ТЕСТ ЩЕ РАЗ')
    expect(source).not.toContain('ЗАГЛЯНУТИ')
  })
})

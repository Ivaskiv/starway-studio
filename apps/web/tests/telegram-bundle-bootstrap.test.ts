import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const indexHtml = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8')
const loaderScript = indexHtml.match(
  /<script id="telegram-ngrok-app-loader">\s*([\s\S]*?)<\/script>/,
)?.[1]

describe('Telegram bundle bootstrap', () => {
  it('renders a recoverable retry screen when the Mini App bundle fetch fails', async () => {
    expect(loaderScript).toBeTruthy()

    const root = { innerHTML: '' }
    const retryButton = { addEventListener: vi.fn() }
    const reload = vi.fn()
    const document = {
      getElementById: vi.fn((id: string) => {
        if (id === 'root') return root
        if (id === 'telegram-bundle-bootstrap-retry') return retryButton
        return null
      }),
      body: { appendChild: vi.fn() },
      createElement: vi.fn(),
    }
    const fetch = vi.fn().mockRejectedValue(new Error('tunnel unavailable'))

    new Function(
      'window',
      'document',
      'URLSearchParams',
      'fetch',
      'console',
      loaderScript!,
    )(
      { location: { search: '', reload } },
      document,
      URLSearchParams,
      fetch,
      { error: vi.fn() },
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(root.innerHTML).toContain('Не вдалося завантажити застосунок')
    expect(root.innerHTML).toContain('СПРОБУВАТИ ЩЕ РАЗ')
    expect(retryButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
  })
})

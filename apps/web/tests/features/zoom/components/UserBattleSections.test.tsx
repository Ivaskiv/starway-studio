import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryResult = {
  data: [] as Array<{ id: string; firstName: string | null; lastName: string | null; email: string }>,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}
const initiate = vi.fn()
const checkout = vi.fn()

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetEligibleOpponentsQuery: () => queryResult,
  useInitiateBattleMutation: () => [initiate, { isLoading: false }],
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl: (...args: unknown[]) => checkout(...args),
}))

describe('BattleCallSection', () => {
  beforeEach(() => {
    queryResult.data = []
    queryResult.isLoading = false
    queryResult.isError = false
    queryResult.refetch.mockReset()
    initiate.mockReset()
    checkout.mockReset()
  })

  it('renders an explicit loading state while eligible opponents are requested', async () => {
    queryResult.isLoading = true
    const { BattleCallSection } = await import('@/features/zoom/components/battle/UserBattleSections')

    const markup = renderToStaticMarkup(createElement(BattleCallSection, {
      userId: 'user-1', onOpenInstructions: vi.fn(),
    }))

    expect(markup).toContain('Завантажуємо доступних суперників…')
    expect(markup).toContain('disabled=""')
  })

  it('renders eligible opponent names from the API DTO', async () => {
    queryResult.data = [{
      id: 'user-2', firstName: 'Олена', lastName: 'Коваль', email: 'olena@example.com',
    }]
    const { BattleCallSection } = await import('@/features/zoom/components/battle/UserBattleSections')

    const markup = renderToStaticMarkup(createElement(BattleCallSection, {
      userId: 'user-1', onOpenInstructions: vi.fn(),
    }))

    expect(markup).toContain('title="Олена Коваль"')
    expect(markup).toContain('aria-label="Обрати суперника: Олена Коваль"')
  })

  it('keeps selection local and toggles only the chosen eligible opponent', async () => {
    const { getNextSelectedBattleOpponent, isEligibleBattleOpponent } = await import('@/features/zoom/components/battle/UserBattleSections')

    expect(getNextSelectedBattleOpponent('', 'user-2')).toBe('user-2')
    expect(getNextSelectedBattleOpponent('user-2', 'user-2')).toBe('')
    expect(getNextSelectedBattleOpponent('user-2', 'user-3')).toBe('user-3')
    expect(isEligibleBattleOpponent([{
      id: 'user-2', firstName: 'Олена', lastName: null, email: 'olena@example.com',
    }], 'user-2')).toBe(true)
    expect(isEligibleBattleOpponent([], 'user-2')).toBe(false)
  })

  it('renders a legitimate no-opponents state without enabling submit', async () => {
    const { BattleCallSection } = await import('@/features/zoom/components/battle/UserBattleSections')

    const markup = renderToStaticMarkup(createElement(BattleCallSection, {
      userId: 'user-1', onOpenInstructions: vi.fn(),
    }))

    expect(markup).toContain('Наразі немає доступних суперників для Battle.')
    expect(markup).toContain('disabled=""')
  })

  it('renders an eligible-opponents API failure with retry', async () => {
    queryResult.isError = true
    const { BattleCallSection } = await import('@/features/zoom/components/battle/UserBattleSections')

    const markup = renderToStaticMarkup(createElement(BattleCallSection, {
      userId: 'user-1', onOpenInstructions: vi.fn(),
    }))

    expect(markup).toContain('Не вдалося завантажити доступних суперників.')
    expect(markup).toContain('Повторити')
    expect(markup).toContain('disabled=""')
  })

  it('initiates the existing Battle flow only for the selected opponent', async () => {
    initiate.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ type: 'subscriber', costUAH: 0, battle: { id: 'battle-1' } }),
    })
    const { submitBattleChallenge } = await import('@/features/zoom/components/battle/UserBattleSections')

    await submitBattleChallenge({
      challengerId: 'user-1', opponentId: 'user-2', initiate, openCheckout: checkout,
    })

    expect(initiate).toHaveBeenCalledWith({ challengerId: 'user-1', opponentId: 'user-2' })
    expect(checkout).not.toHaveBeenCalled()
  })
})

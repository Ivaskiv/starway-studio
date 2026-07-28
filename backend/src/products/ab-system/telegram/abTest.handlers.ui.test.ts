import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadAbTestProgressMock = vi.fn()
const saveAbTestProgressMock = vi.fn()
const buildAbTestProgressPatchMock = vi.fn()
const sendQuestionDirectMock = vi.fn()
const recordTestStartMock = vi.fn()
const logAbTestStartDebugMock = vi.fn()
const logCallbackHandledMock = vi.fn()

vi.mock('./abTest.progress.js', () => ({
  loadAbTestProgress: loadAbTestProgressMock,
  saveAbTestProgress: saveAbTestProgressMock,
  getAbTestProgressFromUiSettings: vi.fn(),
  loadUserUiSettings: vi.fn(),
  isAbTestFocusFunnelLocked: vi.fn(),
}))

vi.mock('../../../core/state-machine/abTestFoundation.js', () => ({
  buildAbTestProgressPatch: buildAbTestProgressPatchMock,
  resolveAbTestQuestionOrder: vi.fn(),
}))

vi.mock('./abTest.views.js', () => ({
  renderCurrentView: vi.fn(),
  formatAbTestTelegramCard: vi.fn(),
  sendQuestionDirect: sendQuestionDirectMock,
  splitTelegramContentBlocks: vi.fn(),
  sendTelegramContentChunk: vi.fn(),
}))

vi.mock('../../../core/orchestrator/testOrchestrator.js', () => ({
  testOrchestrator: {
    recordTestStart: recordTestStartMock,
  },
}))

vi.mock('./abTest.callback.js', () => ({
  logAbTestStartDebug: logAbTestStartDebugMock,
  logCallbackHandled: logCallbackHandledMock,
}))

describe('handleAbTestStart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('warms q1 progress and renders the canonical first question without sending intro again', async () => {
    const currentProgress = { revision: 3 }
    const warmedProgress = { revision: 4, current_question_id: 'q1' }
    loadAbTestProgressMock.mockResolvedValue(currentProgress)
    buildAbTestProgressPatchMock.mockReturnValue(warmedProgress)
    saveAbTestProgressMock.mockResolvedValue(undefined)
    recordTestStartMock.mockResolvedValue(undefined)
    sendQuestionDirectMock.mockResolvedValue(undefined)

    const { handleAbTestStart } = await import('./abTest.handlers.ui.js')

    const ctx = {
      chat: { id: 12345 },
      telegram: {
        sendMessage: vi.fn(),
      },
      answerCbQuery: vi.fn().mockResolvedValue(undefined),
    } as any

    const result = await handleAbTestStart(ctx, 'user-1')

    expect(result).toBe(true)
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1)
    expect(loadAbTestProgressMock).toHaveBeenCalledWith('user-1')
    expect(saveAbTestProgressMock).toHaveBeenCalledWith('user-1', warmedProgress)
    expect(sendQuestionDirectMock).toHaveBeenCalledWith(ctx, 'q1', 4)
  })
})

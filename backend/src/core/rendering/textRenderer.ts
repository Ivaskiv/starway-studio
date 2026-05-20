import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { composeFlowText } from '../flow-builder/flowComposition.js'

export function renderTelegramText(flow: TelegramFlow): string {
  return composeFlowText(flow.title, flow.body)
}

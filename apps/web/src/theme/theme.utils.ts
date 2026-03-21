// frontend/src/theme/theme.utils.ts
// ─── Shim для зворотньої сумісності — реекспортуємо утиліти з accent.utils.ts ───────
import {
  applyAccentColor,
  applyUiMode,
  loadAccentColor,
  UiMode
} from '@/theme/accent.utils'

export {
  loadUiMode as loadUiTheme,
  normalizeUiMode as normalizeUiTheme,
  saveUiMode as saveUiTheme
} from '@/theme/accent.utils'
export type { UiMode as UiTheme } from '@/theme/accent.utils'

export function applyUiTheme(mode: UiMode) {
  applyUiMode(mode)
  applyAccentColor(loadAccentColor(), mode)
}

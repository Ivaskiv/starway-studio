import { absystemContent } from '../../products/absystem/config/absystem.content.js'

export function resolveAbsystemCtaLabel(key: keyof typeof absystemContent.buttons) {
  return absystemContent.buttons[key]
}

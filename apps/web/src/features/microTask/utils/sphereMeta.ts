import { isWheelSphereId, WHEEL_CATEGORY_MAP } from '@/features/wheel/types/wheel.types'

const SPHERE_FALLBACK = {
  emoji: '🎯',
  label: 'Пріоритет',
}

const EXTRA_SPHERE_META: Record<string, { emoji: string; label: string }> = {
  vision: { emoji: '🎯', label: 'Фокус' },
  inner: { emoji: '✨', label: 'Внутрішній стан' },
}

export function getMicroTaskSphereMeta(sphere?: string | null) {
  if (!sphere) return SPHERE_FALLBACK

  if (EXTRA_SPHERE_META[sphere]) {
    return EXTRA_SPHERE_META[sphere]
  }

  const wheelCategory = isWheelSphereId(sphere) ? WHEEL_CATEGORY_MAP.get(sphere) : undefined
  if (wheelCategory) {
    return {
      emoji: wheelCategory.emoji,
      label: wheelCategory.nameUk,
    }
  }

  return SPHERE_FALLBACK
}

export function safeText(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed.insight ?? parsed.text ?? parsed.title ?? parsed.why ?? parsed.description ?? parsed.rawContext
        return typeof candidate === 'string' ? candidate : ''
      }
    } catch {
      return value
    }
    return ''
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

import { WHEEL_CATEGORY_MAP } from '@/features/wheel/types/wheel.types'

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

  const wheelCategory = WHEEL_CATEGORY_MAP.get(sphere)
  if (wheelCategory) {
    return {
      emoji: wheelCategory.emoji,
      label: wheelCategory.nameUk,
    }
  }

  return SPHERE_FALLBACK
}

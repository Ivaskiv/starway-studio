// frontend/src/features/analytics/hooks/useFunnelConversion.ts
// ✅ Виправлено: FunnelStats інтерфейс з явними полями

import { calculateConversion } from '@/lib/utils/calculate'

export interface FunnelStats {
  visitors: number
  buyers:   number
}

export interface FunnelConversionResult {
  conversion:     number | null  // % або null якщо немає даних
  isHealthy:      boolean        // >= 10% вважається нормальним
  label:          string         // "15%" | "—"
}

export function useFunnelConversion(stats: FunnelStats | null): FunnelConversionResult {
  if (!stats || stats.visitors === 0) {
    return { conversion: null, isHealthy: false, label: '—' }
  }

  const conversion = calculateConversion(stats.visitors, stats.buyers)

  return {
    conversion,
    isHealthy: conversion >= 10,
    label:     `${conversion}%`,
  }
}

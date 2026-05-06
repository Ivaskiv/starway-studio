import { type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'
import { dashboardDesignSystem } from '@/styles/design-system'

type CardTone = 'surface' | 'panel' | 'alert'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
}

const toneClass: Record<CardTone, string> = {
  surface: dashboardDesignSystem.surfaces.card,
  panel: dashboardDesignSystem.surfaces.panel,
  alert: dashboardDesignSystem.surfaces.alert,
}

export function Card({ tone = 'surface', className, ...props }: CardProps) {
  return <div className={cn(toneClass[tone], className)} {...props} />
}

export default Card

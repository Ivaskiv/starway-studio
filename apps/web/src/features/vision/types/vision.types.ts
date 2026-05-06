import type { WebMapSystem } from '@/features/web-map/services/web-map.api'

export interface VisionAnswers {
  idealLife: string
  noLongerNormal: string
  pointB: string
}

export interface VisionStatement {
  id: string
  userId: string
  statement: string
  idealLife: string
  noLongerNormal: string
  pointB: string
  createdAt: string
  system?: WebMapSystem | null
}

export type ActiveTab = 'goals' | 'months' | 'analysis' | 'coach'

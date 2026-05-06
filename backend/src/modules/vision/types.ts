import type { VisionSystem } from './system.js'

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
  createdAt: Date
  system?: VisionSystem | null
}

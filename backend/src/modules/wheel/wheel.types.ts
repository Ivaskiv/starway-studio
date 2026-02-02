export interface WheelConfigItem {
  id: string
  label: string
  emoji: string
  description: string
}

export interface WheelScore {
  categoryId: string
  score: number
  comment?: string
}

export interface WheelUserContext {
  name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  age: number | null
}

export interface WheelPDFData {
  userName: string
  scores: WheelScore[]
  weakestSphere: string
  focusSphere: string
  analysis: string
  createdAt: string
}
// interface WheelPDFData {
//   id: string
//   userId: string
//   userName: string
//   isEmail?: boolean
//   scores: Array<{ sphere: string; score: number; comment: string }>
//   weakestSphere: string
//   focusSphere: string
//   analysis: string
//   createdAt: string
// }


export const SPHERE_LABELS: Record<string, string> = {
  money: 'Гроші',
  realization: 'Реалізація',
  relationships: 'Відносини',
  energy: 'Енергія/Тіло',
  freedom: 'Свобода/Час',
  inner_support: 'Внутрішня опора',
  health: "Здоров'я",
  growth: 'Розвиток',
}

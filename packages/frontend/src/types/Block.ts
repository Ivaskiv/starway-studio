// packages/frontend/src/types/Block.ts

export type BlockType =
  | 'trigger'
  | 'email'
  | 'telegram'
  | 'payment'
  | 'gift'
  | 'segment'
  | 'notify'

export interface Block {
  id: string
  type: BlockType
  label: string
  description?: string
  next?: string[]
}
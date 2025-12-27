// packages/ai-mentor/src/types/mentor.ts

import { AIFieldFocus } from "@starway-studio/shared/types/modules"


export type MentorStepId =
  | 'name'
  | 'audience'
  | 'goal'
  | 'offer'
  | 'content'

export interface MentorStep {
  id: MentorStepId
  field: AIFieldFocus
  title: string
  description: string
}

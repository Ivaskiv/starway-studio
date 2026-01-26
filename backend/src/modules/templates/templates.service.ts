export type ProductTemplateType =
  | 'ai-mentor'
  | 'course'
  | 'marathon'

export interface ProductTemplate {
  id: string
  type: ProductTemplateType
  name: string
  schema: unknown        // JSON schema
}

import { DEFAULT_REQUIRED_CONTEXT_SOURCES } from './types.js'
import type { ContextSourceKind, ContextValidationResult, IContextValidator } from './types.js'

export class RuntimeContextValidator implements IContextValidator {
  async validate(input: {
    context: import('./types.js').RuntimeContext
    requiredSources: ContextSourceKind[]
  }): Promise<ContextValidationResult> {
    const requiredSources = input.requiredSources.length
      ? input.requiredSources
      : DEFAULT_REQUIRED_CONTEXT_SOURCES

    const missingSources = requiredSources.filter((source) => !input.context.sourceOrder.includes(source))
    if (missingSources.length) {
      return {
        valid: false,
        reason: `Runtime context is missing required sources: ${missingSources.join(', ')}.`,
        missingSources,
      }
    }

    if (!input.context.summary.trim()) {
      return {
        valid: false,
        reason: 'Runtime context summary is empty.',
      }
    }

    return { valid: true }
  }
}

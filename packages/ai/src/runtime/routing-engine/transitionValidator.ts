import type { AgentId } from '../orchestrator/types.js'
import type {
  ITransitionValidator,
  TransitionValidationContext,
  TransitionValidationResult,
  TransitionValidatorOptions,
} from './types.js'

const DEFAULT_ALLOWED_INITIAL_AGENT_IDS: AgentId[] = ['project_manager']
const DEFAULT_RELEASE_CORRECTIVE_AGENT_IDS: AgentId[] = ['bug_investigation', 'implementation', 'refactoring']

const EXECUTE_TRANSITIONS: Record<AgentId, AgentId[]> = {
  project_manager: ['task_planning'],
  task_planning: ['implementation', 'refactoring'],
  implementation: ['code_review'],
  code_review: ['bug_investigation', 'release_readiness'],
  bug_investigation: ['implementation', 'refactoring'],
  refactoring: ['code_review'],
  release_readiness: [],
  smoke_test: [],
  echo_agent: [],
  summarizer_agent: [],
  classification_agent: [],
  extraction_agent: [],
  planning_agent: [],
  mentor_agent: [],
  assistant_agent: [],
  content_agent: [],
  sales_agent: [],
  coach_agent: [],
  funnel_agent: [],
}

export class TransitionValidator implements ITransitionValidator {
  private readonly allowedInitialAgentIds: Set<AgentId>
  private readonly correctiveAgentIdsFromRelease: Set<AgentId>

  constructor(options: TransitionValidatorOptions = {}) {
    this.allowedInitialAgentIds = new Set(options.allowedInitialAgentIds ?? DEFAULT_ALLOWED_INITIAL_AGENT_IDS)
    this.correctiveAgentIdsFromRelease = new Set(
      options.correctiveAgentIdsFromRelease ?? DEFAULT_RELEASE_CORRECTIVE_AGENT_IDS,
    )
  }

  async validate(context: TransitionValidationContext): Promise<TransitionValidationResult> {
    if (context.stage === 'first') {
      return this.validateFirstDecision(context)
    }

    return this.validateNextDecision(context)
  }

  private validateFirstDecision(context: TransitionValidationContext): TransitionValidationResult {
    const { decision, state } = context

    if (state.completedAgentIds.length > 0) {
      return {
        valid: false,
        reason: 'Initial routing is only valid before any agent has completed.',
      }
    }

    if (decision.kind !== 'execute') {
      return {
        valid: false,
        reason: 'Initial routing must resolve to an executable agent.',
      }
    }

    if (!this.allowedInitialAgentIds.has(decision.agentId)) {
      return {
        valid: false,
        reason: `Initial routing to '${decision.agentId}' is not allowed.`,
      }
    }

    return { valid: true }
  }

  private validateNextDecision(context: TransitionValidationContext): TransitionValidationResult {
    const { decision, lastAgentId } = context

    if (!lastAgentId) {
      return {
        valid: false,
        reason: 'Next routing requires the previously executed agent.',
      }
    }

    if (decision.kind === 'execute') {
      if (lastAgentId === 'release_readiness') {
        if (!this.correctiveAgentIdsFromRelease.has(decision.agentId)) {
          return {
            valid: false,
            reason: `Release readiness may only route to corrective agents, received '${decision.agentId}'.`,
          }
        }
        return { valid: true }
      }

      const allowedTargets = EXECUTE_TRANSITIONS[lastAgentId]
      if (!allowedTargets.includes(decision.agentId)) {
        return {
          valid: false,
          reason: `Transition '${lastAgentId}' -> '${decision.agentId}' is not allowed.`,
        }
      }

      return { valid: true }
    }

    if (decision.kind === 'complete') {
      if (lastAgentId !== 'release_readiness') {
        return {
          valid: false,
          reason: `Only release readiness may complete execution, received '${lastAgentId}'.`,
        }
      }
      return { valid: true }
    }

    if (decision.kind === 'awaiting_approval') {
      return { valid: true }
    }

    if (decision.kind === 'blocked') {
      return { valid: true }
    }

    return {
      valid: false,
      reason: `Unsupported routing decision kind '${String((decision as { kind?: unknown }).kind)}'.`,
    }
  }
}

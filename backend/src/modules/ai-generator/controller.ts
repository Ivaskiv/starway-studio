// backend/src/modules/ai-generator/controller.ts
import { buildBlueprintFromSteps, generateStepVariant, getWorkflowState, saveBlueprint, saveWorkflowState } from '@/modules/ai-generator/service.js';
import { AIGeneratorWorkflowState, BlueprintStepInput, GenerateStepInput, SaveBlueprintInput } from '@/modules/ai-generator/types.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';
import type { Response } from 'express';

const TOTAL_PHASES = 11;

// ── Step Generation ─────────────────────────────────────────────────────────
export async function generateStepHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const input = req.body as GenerateStepInput;

    if (!input?.stepNumber || !input?.userInput) {
      return res.status(400).json({ error: 'step_number_and_user_input_required' });
    }
    if (input.stepNumber < 1 || input.stepNumber > TOTAL_PHASES) {
      return res.status(400).json({ error: 'step_number_out_of_range', expectedRange: `1..${TOTAL_PHASES}` });
    }

    const variant = await generateStepVariant(input);
    return res.json({ success: true, variants: [variant], remainingAttempts: 0 });
  } catch (error) {
    console.error('❌ ai-generator step error:', error);
    return res.status(500).json({ error: 'ai_generator_step_failed' });
  }
}

// ── Build Blueprint ─────────────────────────────────────────────────────────
export async function buildBlueprintHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const stepsData = req.body?.stepsData as BlueprintStepInput[];
    if (!Array.isArray(stepsData) || stepsData.length !== TOTAL_PHASES) {
      return res.status(400).json({ error: 'steps_data_invalid', expected: TOTAL_PHASES, received: stepsData?.length ?? 0 });
    }

    const seen = new Set<number>();
    for (const step of stepsData) {
      if (!step?.number || step.number < 1 || step.number > TOTAL_PHASES) {
        return res.status(400).json({ error: 'invalid_step_number' });
      }
      if (seen.has(step.number)) return res.status(400).json({ error: 'duplicate_step_number' });
      seen.add(step.number);
      if (!String(step?.selectedContent || '').trim()) return res.status(400).json({ error: 'selected_content_required' });
    }

    const blueprint = await buildBlueprintFromSteps(stepsData);
    return res.json(blueprint);
  } catch (error) {
    console.error('❌ ai-generator blueprint error:', error);
    return res.status(500).json({ error: 'ai_generator_blueprint_failed' });
  }
}

// ── Save Blueprint ──────────────────────────────────────────────────────────
export async function saveBlueprintHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const requester = req.user;
    if (!requester?.id) return res.status(401).json({ error: 'unauthorized' });

    const input = req.body as SaveBlueprintInput;
    if (!input?.blueprint?.name) return res.status(400).json({ error: 'blueprint_required' });

    const requiredOnboardingFields = ['productName','funnelName','funnelGoal','coreTask','businessType','targetAudience'] as const;
    const onboarding = input.onboarding || {};
    const missing = requiredOnboardingFields.filter(f => !String(onboarding[f] || '').trim());
    if (missing.length) return res.status(400).json({ error: 'onboarding_required_fields_missing', fields: missing });

    if (!input.blueprint.coreOffer?.name || typeof input.blueprint.coreOffer?.price !== 'number') {
      return res.status(400).json({ error: 'blueprint_core_offer_invalid' });
    }

    const result = await saveBlueprint({ id: requester.id, role: requester.role, email: requester.email ?? undefined }, input);
    return res.json({ success: true, funnelId: result.funnelId });
  } catch (error) {
    console.error('❌ ai-generator save error:', error);
    return res.status(500).json({ error: 'ai_generator_save_failed' });
  }
}

// ── Workflow Handlers ──────────────────────────────────────────────────────
export async function getWorkflowHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const requester = req.user;
    if (!requester?.id) return res.status(401).json({ error: 'unauthorized' });

    const workflow = await getWorkflowState(requester.id);
    return res.json({ success: true, workflow });
  } catch (error) {
    console.error('❌ ai-generator get workflow error:', error);
    return res.status(500).json({ error: 'ai_generator_get_workflow_failed' });
  }
}

export async function saveWorkflowHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const requester = req.user;
    if (!requester?.id) return res.status(401).json({ error: 'unauthorized' });

    const workflow = req.body?.workflow as AIGeneratorWorkflowState | undefined;
    if (!workflow) return res.status(400).json({ error: 'workflow_required' });

    if (workflow.currentStep < 1 || workflow.currentStep > TOTAL_PHASES) {
      return res.status(400).json({ error: 'workflow_current_step_invalid', expectedRange: `1..${TOTAL_PHASES}` });
    }
    if (!Array.isArray(workflow.stepsData) || workflow.stepsData.length !== TOTAL_PHASES) {
      return res.status(400).json({ error: 'workflow_steps_invalid', expected: TOTAL_PHASES, received: workflow.stepsData?.length ?? 0 });
    }

    const result = await saveWorkflowState(requester.id, workflow);
    return res.json({ success: true, updatedAt: result.updatedAt });
  } catch (error) {
    console.error('❌ ai-generator save workflow error:', error);
    return res.status(500).json({ error: 'ai_generator_save_workflow_failed' });
  }
}
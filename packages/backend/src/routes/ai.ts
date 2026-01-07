// packages/backend/src/routes/ai.ts

import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { 
  generateWithAI,
  analyzeUserPrompt,
  generateFunnelStepVariants as generateOldStepVariants,
  generateProductsFromFunnel
} from '../services/ai.js';
import { 
  generateFunnelStepVariants,
  generateFunnelBlueprint,
} from '../services/ai-generator.js';
import { checkGenerationLimit, incrementGenerations } from '../services/generations.js';
import { sql } from '../db/client.js';

const router = Router();

// ============ ІСНУЮЧІ ENDPOINTS ============

// POST /generate - ІСНУЮЧИЙ ENDPOINT (БЕЗ ЗМІН)
router.post('/generate', authRequired, async (req, res) => {
  try {
    const { field, prompt, context } = req.body;
    const userId = req.user!.id;

    if (!field || !prompt) {
      return res.status(400).json({ error: 'missing_field_or_prompt' });
    }

    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    
    if (!canGenerate) {
      return res.status(403).json({ error: 'generation_limit_reached', remaining: 0 });
    }

    const result = await generateWithAI(field, prompt, context);
    
    await incrementGenerations(userId, field, result);

    res.json({ success: true, result, remaining: remaining - 1 });
  } catch (error: any) {
    res.status(500).json({ error: 'generation_failed', message: error.message });
  }
});

// GET /limit - ІСНУЮЧИЙ ENDPOINT (БЕЗ ЗМІН)
router.get('/limit', authRequired, async (req, res) => {
  try {
    const { canGenerate, remaining } = await checkGenerationLimit(req.user!.id);
    res.json({ canGenerate, remaining });
  } catch (error: any) {
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /analyze-prompt - ІСНУЮЧИЙ ENDPOINT
router.post('/analyze-prompt', authRequired, async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.user!.id;

    if (!prompt || prompt.length < 20) {
      return res.status(400).json({ 
        success: false,
        error: 'prompt_too_short',
        message: 'Prompt занадто короткий (мінімум 20 символів)' 
      });
    }

    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      });
    }

    console.log('🤖 Analyzing prompt with OpenAI...');
    const analysis = await analyzeUserPrompt(prompt);

    await incrementGenerations(userId, 'funnel_analysis', JSON.stringify(analysis));

    res.json({ 
      success: true,
      analysis,
      remaining: remaining - 1
    });

  } catch (error: any) {
    console.error('❌ AI analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'analysis_failed',
      message: error.message 
    });
  }
});

// POST /generate-step - ІСНУЮЧИЙ ENDPOINT
router.post('/generate-step', authRequired, async (req, res) => {
  try {
    const { stepNumber, stepTitle, stepDescription, analysis } = req.body;
    const userId = req.user!.id;

    if (!stepNumber || !stepTitle || !analysis) {
      return res.status(400).json({ 
        success: false,
        error: 'missing_fields',
        message: 'Missing required fields' 
      });
    }

    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      });
    }

    console.log(`🤖 Generating variants for step ${stepNumber}: ${stepTitle}`);
    const variants = await generateOldStepVariants(
      stepNumber,
      stepTitle,
      stepDescription,
      analysis
    );

    await incrementGenerations(userId, `funnel_step_${stepNumber}`, JSON.stringify(variants));

    res.json({ 
      success: true,
      variants,
      remaining: remaining - 1
    });

  } catch (error: any) {
    console.error('❌ Generate step error:', error);
    res.status(500).json({ 
      success: false,
      error: 'generation_failed',
      message: error.message 
    });
  }
});

// POST /generate-products - ІСНУЮЧИЙ ENDPOINT
router.post('/generate-products', authRequired, async (req, res) => {
  try {
    const { analysis } = req.body;
    const userId = req.user!.id;

    if (!analysis) {
      return res.status(400).json({ 
        success: false,
        error: 'missing_analysis',
        message: 'Analysis data required' 
      });
    }

    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      });
    }

    console.log('🤖 Generating products for funnel...');
    const products = await generateProductsFromFunnel(analysis);

    await incrementGenerations(userId, 'funnel_products', JSON.stringify(products));

    res.json({ 
      success: true,
      products,
      remaining: remaining - 1
    });

  } catch (error: any) {
    console.error('❌ Generate products error:', error);
    res.status(500).json({ 
      success: false,
      error: 'generation_failed',
      message: error.message 
    });
  }
});

// ============ НОВІ ENDPOINTS ДЛЯ AI GENERATOR (11 КРОКІВ) ============

/**
 * POST /ai/generator/step
 * Генерація варіантів для одного кроку воронки (НОВА СИСТЕМА)
 */
router.post('/generator/step', authRequired, async (req, res) => {
  try {
    const { stepNumber, userInput, context } = req.body;
    const userId = req.user!.id;

    console.log(`🤖 [AI Generator] Step request:`, {
      userId,
      stepNumber,
      userInputLength: userInput?.length,
      hasContext: !!context,
    });

    if (!stepNumber || !userInput) {
      console.warn('⚠️ [AI Generator] Missing fields');
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'Step number and user input required',
      });
    }

    // Перевірка ліміту
    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    
    console.log(`🔍 [AI Generator] Limit check:`, { canGenerate, remaining });

    if (!canGenerate) {
      console.warn(`⚠️ [AI Generator] Limit reached for user ${userId}`);
      return res.status(403).json({
        success: false,
        error: 'generation_limit_reached',
        message: `Ви використали всі спроби генерації (${remaining} залишилось)`,
        remaining: 0,
      });
    }

    console.log(`🤖 [AI Generator] Generating step ${stepNumber}...`);

    // Генерація варіантів
    const variants = await generateFunnelStepVariants(stepNumber, userInput, context || {});

    console.log(`✅ [AI Generator] Generated ${variants.length} variants`);

    // Збереження
    await incrementGenerations(userId, `ai_generator_step_${stepNumber}`, JSON.stringify(variants));

    res.json({
      success: true,
      variants,
      remainingAttempts: remaining - 1,
    });
  } catch (error: any) {
    console.error('❌ [AI Generator] Step error:', error);
    res.status(500).json({
      success: false,
      error: 'generation_failed',
      message: error.message || 'Помилка генерації',
    });
  }
});

/**
 * POST /ai/generator/blueprint
 * Генерація фінального blueprint воронки (НОВА СИСТЕМА)
 */
router.post('/generator/blueprint', authRequired, async (req, res) => {
  try {
    const { stepsData } = req.body;
    const userId = req.user!.id;

    if (!stepsData || !Array.isArray(stepsData) || stepsData.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'invalid_steps_data',
        message: 'Expected 11 steps',
      });
    }

    // Перевірка ліміту
    const { canGenerate, remaining } = await checkGenerationLimit(userId);
    if (!canGenerate) {
      return res.status(403).json({
        success: false,
        error: 'generation_limit_reached',
        remaining: 0,
      });
    }

    console.log(`🤖 [AI Generator] Generating blueprint for user ${userId}`);

    // Генерація blueprint (НОВА функція з ai-generator.ts)
    const blueprint = await generateFunnelBlueprint(stepsData);

    // Збереження
    await incrementGenerations(userId, 'ai_generator_blueprint', JSON.stringify(blueprint));

    res.json({
      success: true,
      ...blueprint,
    });
  } catch (error: any) {
    console.error('❌ [AI Generator] Blueprint error:', error);
    res.status(500).json({
      success: false,
      error: 'blueprint_generation_failed',
      message: error.message,
    });
  }
});

/**
 * POST /ai/generator/save-funnel
 * Збереження згенерованої воронки в БД
 */
router.post('/generator/save-funnel', authRequired, async (req, res) => {
  try {
    const { blueprint } = req.body;
    const userId = req.user!.id;

    if (!blueprint) {
      return res.status(400).json({
        success: false,
        error: 'missing_blueprint',
      });
    }

    console.log(`💾 [AI Generator] Saving funnel for user ${userId}`);

    // Створення воронки в БД
    const [funnel] = await sql`
      INSERT INTO funnels (
        owner_id,
        name,
        description,
        type,
        status,
        theme,
        user_prompt,
        ai_generated_data,
        steps,
        settings,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${blueprint.name},
        ${blueprint.targetAudience},
        ${blueprint.type === 'fast_cash' ? 'mixed' : blueprint.type === 'diagnostic' ? 'telegram' : 'web'},
        'draft',
        'orange',
        ${JSON.stringify(blueprint)},
        ${JSON.stringify({
          financialModel: blueprint.financialModel,
          coreOffer: blueprint.coreOffer,
          upsell: blueprint.upsell,
          automation: blueprint.automation,
        })},
        ${JSON.stringify([])},
        ${JSON.stringify({ tracking: {}, seo: {}, notifications: { email: true, telegram: true } })},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    console.log(`✅ [AI Generator] Funnel created: ${funnel.id}`);

    res.json({
      success: true,
      funnelId: funnel.id,
    });
  } catch (error: any) {
    console.error('❌ [AI Generator] Save funnel error:', error);
    res.status(500).json({
      success: false,
      error: 'save_failed',
      message: error.message,
    });
  }
});

/**
 * GET /ai/generator/stats
 * Статистика генерацій користувача
 */
router.get('/generator/stats', authRequired, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [user] = await sql`
      SELECT generations_used 
      FROM users 
      WHERE id = ${userId}
    `;

    const [funnelsCount] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE user_prompt IS NOT NULL) as total_generated,
        COUNT(*) FILTER (WHERE status != 'draft') as saved_funnels
      FROM funnels
      WHERE owner_id = ${userId}
    `;

    const totalGenerated = parseInt(funnelsCount?.total_generated || '0');
    const savedFunnels = parseInt(funnelsCount?.saved_funnels || '0');
    const successRate = totalGenerated > 0 
      ? Math.round((savedFunnels / totalGenerated) * 100)
      : 0;

    res.json({
      success: true,
      totalGenerated,
      savedFunnels,
      attemptsUsed: user?.generations_used || 0,
      successRate,
    });
  } catch (error: any) {
    console.error('❌ [AI Generator] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'stats_failed',
    });
  }
});

export default router;
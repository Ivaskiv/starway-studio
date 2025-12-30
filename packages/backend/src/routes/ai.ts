// packages/backend/src/routes/ai.ts

import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { 
  generateWithAI,
  analyzeUserPrompt,
  generateFunnelStepVariants,
  generateProductsFromFunnel
} from '../services/ai.js'
import { checkGenerationLimit, incrementGenerations } from '../services/generations.js'

const router = Router()

// POST /generate - ІСНУЮЧИЙ ENDPOINT (БЕЗ ЗМІН)
router.post('/generate', authRequired, async (req, res) => {
  try {
    const { field, prompt, context } = req.body
    const userId = req.user!.id

    if (!field || !prompt) {
      return res.status(400).json({ error: 'missing_field_or_prompt' })
    }

    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      return res.status(403).json({ error: 'generation_limit_reached', remaining: 0 })
    }

    const result = await generateWithAI(field, prompt, context)
    
    await incrementGenerations(userId, field, result)

    res.json({ success: true, result, remaining: remaining - 1 })
  } catch (error: any) {
    res.status(500).json({ error: 'generation_failed', message: error.message })
  }
})

// GET /limit - ІСНУЮЧИЙ ENDPOINT (БЕЗ ЗМІН)
router.get('/limit', authRequired, async (req, res) => {
  try {
    const { canGenerate, remaining } = await checkGenerationLimit(req.user!.id)
    res.json({ canGenerate, remaining })
  } catch (error: any) {
    res.status(500).json({ error: 'server_error' })
  }
})

// ============ НОВІ ENDPOINTS ДЛЯ AI ВОРОНКИ ============

// POST /analyze-prompt - Аналіз промпту користувача
router.post('/analyze-prompt', authRequired, async (req, res) => {
  try {
    const { prompt } = req.body
    const userId = req.user!.id

    if (!prompt || prompt.length < 20) {
      return res.status(400).json({ 
        success: false,
        error: 'prompt_too_short',
        message: 'Prompt занадто короткий (мінімум 20 символів)' 
      })
    }

    // Перевіряємо ліміт генерацій
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      })
    }

    console.log('🤖 Analyzing prompt with OpenAI GPT-4...')
    const analysis = await analyzeUserPrompt(prompt)

    // Зберігаємо генерацію
    await incrementGenerations(userId, 'funnel_analysis', JSON.stringify(analysis))

    res.json({ 
      success: true,
      analysis,
      remaining: remaining - 1
    })

  } catch (error: any) {
    console.error('❌ AI analysis error:', error)
    res.status(500).json({ 
      success: false,
      error: 'analysis_failed',
      message: error.message 
    })
  }
})

// POST /generate-step - Генерація варіантів для кроку воронки
router.post('/generate-step', authRequired, async (req, res) => {
  try {
    const { stepNumber, stepTitle, stepDescription, analysis } = req.body
    const userId = req.user!.id

    if (!stepNumber || !stepTitle || !analysis) {
      return res.status(400).json({ 
        success: false,
        error: 'missing_fields',
        message: 'Missing required fields' 
      })
    }

    // Перевіряємо ліміт (кожен крок = окрема генерація)
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      })
    }

    console.log(`🤖 Generating variants for step ${stepNumber}: ${stepTitle}`)
    const variants = await generateFunnelStepVariants(
      stepNumber,
      stepTitle,
      stepDescription,
      analysis
    )

    // Зберігаємо генерацію
    await incrementGenerations(userId, `funnel_step_${stepNumber}`, JSON.stringify(variants))

    res.json({ 
      success: true,
      variants,
      remaining: remaining - 1
    })

  } catch (error: any) {
    console.error('❌ Generate step error:', error)
    res.status(500).json({ 
      success: false,
      error: 'generation_failed',
      message: error.message 
    })
  }
})

// POST /generate-products - Генерація продуктів для воронки
router.post('/generate-products', authRequired, async (req, res) => {
  try {
    const { analysis } = req.body
    const userId = req.user!.id

    if (!analysis) {
      return res.status(400).json({ 
        success: false,
        error: 'missing_analysis',
        message: 'Analysis data required' 
      })
    }

    // Перевіряємо ліміт
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate) {
      return res.status(403).json({ 
        success: false,
        error: 'generation_limit_reached', 
        remaining: 0 
      })
    }

    console.log('🤖 Generating products for funnel...')
    const products = await generateProductsFromFunnel(analysis)

    // Зберігаємо генерацію
    await incrementGenerations(userId, 'funnel_products', JSON.stringify(products))

    res.json({ 
      success: true,
      products,
      remaining: remaining - 1
    })

  } catch (error: any) {
    console.error('❌ Generate products error:', error)
    res.status(500).json({ 
      success: false,
      error: 'generation_failed',
      message: error.message 
    })
  }
})

// POST /generate-bulk-steps - Генерація всіх 11 кроків за раз (оптимізація)
router.post('/generate-bulk-steps', authRequired, async (req, res) => {
  try {
    const { analysis, steps } = req.body
    const userId = req.user!.id

    if (!analysis || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ 
        success: false,
        error: 'invalid_request',
        message: 'Analysis and steps array required' 
      })
    }

    // Перевіряємо ліміт (11 кроків = 11 генерацій)
    const { canGenerate, remaining } = await checkGenerationLimit(userId)
    
    if (!canGenerate || remaining < steps.length) {
      return res.status(403).json({ 
        success: false,
        error: 'insufficient_generations',
        message: `Need ${steps.length} generations, only ${remaining} remaining`,
        remaining 
      })
    }

    console.log(`🤖 Bulk generating ${steps.length} funnel steps...`)
    
    const results = []
    let generationsUsed = 0

    for (const step of steps) {
      try {
        const variants = await generateFunnelStepVariants(
          step.stepNumber,
          step.title,
          step.description,
          analysis
        )

        results.push({
          stepNumber: step.stepNumber,
          success: true,
          variants
        })

        // Зберігаємо кожну генерацію
        await incrementGenerations(userId, `funnel_step_${step.stepNumber}`, JSON.stringify(variants))
        generationsUsed++

        // Невелика затримка між запитами
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error: any) {
        console.error(`❌ Error generating step ${step.stepNumber}:`, error)
        results.push({
          stepNumber: step.stepNumber,
          success: false,
          error: error.message
        })
      }
    }

    res.json({ 
      success: true,
      results,
      generationsUsed,
      remaining: remaining - generationsUsed
    })

  } catch (error: any) {
    console.error('❌ Bulk generate error:', error)
    res.status(500).json({ 
      success: false,
      error: 'bulk_generation_failed',
      message: error.message 
    })
  }
})

export default router
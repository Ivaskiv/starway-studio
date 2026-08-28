// backend/src/app.ts
import { parse as parseEnv } from 'dotenv'
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import cookieParser from 'cookie-parser'
import cors from 'cors'
import { prisma } from './db/client.js'
import { resolvePublicDeliverablesPath } from './lib/publicDeliverables.js'
import { getUserAccessState } from './modules/subscriptions/payments/focus-access.js'
import { resolveTelegramDeliveryMode } from './modules/telegram-mentor/runtime/botConfig.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const backendEnvPath = resolve(currentDirPath, '../.env')
const backendLocalEnvPath = resolve(currentDirPath, '../.env.local')
const rootEnvPath = resolve(currentDirPath, '../../.env')
const rootLocalEnvPath = resolve(currentDirPath, '../../.env.local')
const publicDeliverablesPath = resolvePublicDeliverablesPath(currentDirPath)

{
  const protectedKeys = new Set(Object.keys(process.env))
  const applyEnvFile = (path: string) => {
    if (!existsSync(path)) return

    const parsed = parseEnv(readFileSync(path))
    for (const [key, value] of Object.entries(parsed)) {
      if (protectedKeys.has(key)) continue
      process.env[key] = value
    }
  }

  applyEnvFile(rootEnvPath)
  applyEnvFile(rootLocalEnvPath)
  applyEnvFile(backendEnvPath)
  applyEnvFile(backendLocalEnvPath)
}

type FrontendRedirectTarget = {
  baseUrl: string
  localOnly: boolean
}
const DEV_FRONTEND_PROXY_TARGET =
  process.env.DEV_FRONTEND_PROXY_TARGET?.trim() ||
  process.env.VITE_DEV_SERVER_URL?.trim() ||
  'http://127.0.0.1:5173'

function isLocalHost(host: string): boolean {
  return (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]')
  )
}

function resolveFrontendBaseUrl(req: Request): FrontendRedirectTarget {
  const requestHost = req.get('host')?.trim().toLowerCase() ?? ''
  const candidates = [
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim(),
    process.env.PUBLIC_FRONTEND_URL?.trim(),
    process.env.VITE_PUBLIC_FRONTEND_URL?.trim(),
    process.env.FRONTEND_URL?.trim(),
    'http://localhost:5173',
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (url.host.toLowerCase() !== requestHost) {
        return {
          baseUrl: url.toString().replace(/\/$/, ''),
          localOnly: isLocalHost(url.host),
        }
      }
    } catch {
      continue
    }
  }

  return {
    baseUrl: 'http://localhost:5173',
    localOnly: true,
  }
}

function shouldProxyToDevFrontend(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (req.path === '/health') return false
  if (req.path.startsWith('/api/')) return false
  if (req.path.startsWith('/debug')) return false
  return true
}

function getPublicRequestOrigin(req: Request): string {
  const host = req.get('host') ?? 'localhost:3001'
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol =
    forwardedProto || (host.includes('ngrok-free.dev') ? 'https' : req.protocol)
  return `${protocol}://${host}`
}

function escapeScriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function renderTelegramRootTokenBridge(token: string): string {
  return [
    '<!doctype html>',
    '<html lang="uk">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Starway</title>',
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style>',
    '</head>',
    '<body>',
    '<div>Відкриваємо Starway...</div>',
    '<script>',
    `const token=${escapeScriptString(token)};`,
    'try{sessionStorage.setItem("starway_pending_deeplink_token",token)}catch{}',
    'location.replace("/auth/telegram/success");',
    '</script>',
    '</body>',
    '</html>',
  ].join('')
}

async function proxyToDevFrontend(req: Request, res: Response) {
  const target = new URL(req.originalUrl || '/', DEV_FRONTEND_PROXY_TARGET)
  const response = await fetch(target, {
    method: req.method,
    headers: {
      accept: req.get('accept') ?? '*/*',
      'user-agent': req.get('user-agent') ?? 'starway-backend-dev-proxy',
    },
  })

  res.status(response.status)
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return
    if (key.toLowerCase() === 'transfer-encoding') return
    res.setHeader(key, value)
  })

  const body = Buffer.from(await response.arrayBuffer())
  return res.send(body)
}

// Routes
import { securityHeaders } from './middleware/securityHeaders.js'
import abTestRoutes from './modules/ab-test/routes.js'
import accessRoutes from './modules/access/routes.js'
import adminRoutes from './modules/admin/routes.js'
import affiliateRoutes from './modules/affiliate/routes.js'
import mentorRoutes from './modules/ai-mentor/routes.js'
import mentorWeeklyAnalysisRoutes from './modules/ai-mentor/weekly-analysis/routes.js'
import aiRoutes from './modules/ai/routes.js'
import analyticsRoutes from './modules/analytics/routes.js'
import assistantRoutes from './modules/assistant/routes.js'
import authRoutes, { telegramRouter } from './modules/auth/api/routes.js'
import { authOrBotRequired } from './modules/auth/middleware/auth-or-bot.js'
import { authRequired } from './modules/auth/middleware/auth.js'
import { bot, coachBot, resolveTelegramWebhookSecretMap } from './lib/telegram.js'
import billingRoutes from './modules/billing/billing.module.js'
import consultationRoutes from './modules/consultation/routes.js'
import dailyRoutes from './modules/daily-cycle/routes.js'
import dbAuditRouter from './modules/debug/db.audit.router.js'
import deeplinkRoutes from './modules/deeplinks/routes.js'
import eventsRoutes from './modules/events/routes.js'
import expertsRoutes from './modules/experts/routes.js'
import fivePointsRoutes from './modules/five-points/routes.js'
import gamificationRoutes from './modules/gamification/routes.js'
import goalsRoutes from './modules/goals/routes.js'
import journalRoutes from './modules/journal/routes.js'
import landingRoutes from './modules/landing/routes.js'
import leadMagnetRoutes from './modules/lead-magnet/routes.js'
import mentorDebugRoutes from './modules/mentor/mentor.debug.router.js'
import mentorshipRoutes from './modules/mentorship/routes.js'
import miniCoursesRoutes from './modules/mini-courses/routes.js'
import notificationsRoutes from './modules/notifications/routes.js'
import onboardingRoutes from './modules/onboarding/routes.js'
import platformRoutes from './modules/platform/platform.routes.js'
import productMembersRoutes from './modules/product-members/routes.js'
import productsRoutes from './modules/products/routes.js'
import progressRoutes from './modules/progress/routes.js'
import quotaRoutes from './modules/quota/routes.js'
import settingsRoutes from './modules/settings/routes.js'
import socialRoutes from './modules/social/routes.js'
import startFlowRoutes from './modules/start-flow/routes.js'
import { renderWayForPayCheckoutPageHandler, resendFocusBlock12DevHandler } from './modules/subscriptions/api/controller.js'
import subscriptionsRoutes from './modules/subscriptions/routes.js'
import trialRoutes from './modules/trial/routes.js'
import userStateRoutes from './modules/user-state/routes.js'
import userRoutes from './modules/user/routes.js'
import visionRoutes from './modules/vision/routes.js'
import webMapRouter from './modules/web-map/web-map.router.js'
import wheelRoutes from './modules/wheel/routes.js'
import zoomRoutes from './modules/zoom/api/routes.js'
import zoomCoachRoutes from './modules/zoom/api/zoom.coach.routes.js'
import audioRoutes from './modules/audio/routes.js'
import {
  getTelegramIdentityParityHandler,
  postTelegramIdentityRepairHandler,
} from './modules/telegram-mentor/runtime/identityParity.js'
import {
  getTelegramRuntimeParityHandler,
  postTelegramRuntimeStateSyncHandler,
} from './modules/telegram-mentor/runtime/parity.js'
import testSyncRoutes from './products/absystem/config/testSync.router.js'
import intelligenceRoutes from './routes/intelligence.routes.js'
import salesAssistantRouter from './routers/salesAssistant.router.js'

type TelegramWebhookTarget = {
  id: 'main' | 'coach'
  secret: string
  handleUpdate: (update: unknown) => Promise<unknown>
}

export function resolveTelegramWebhookTarget(
  incomingSecret: string,
): TelegramWebhookTarget | null {
  const targets: TelegramWebhookTarget[] = [
    {
      id: 'main',
      secret: String(resolveTelegramWebhookSecretMap().main ?? '').trim(),
      handleUpdate: (update) => bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]),
    },
    {
      id: 'coach',
      secret: String(resolveTelegramWebhookSecretMap().coach ?? '').trim(),
      handleUpdate: (update) => coachBot.handleUpdate(update as Parameters<typeof coachBot.handleUpdate>[0]),
    },
  ]

  const normalizedSecret = incomingSecret.trim()
  if (!normalizedSecret) return null

  return targets.find((target) => target.secret && target.secret === normalizedSecret) ?? null
}

function resolveTelegramWebhookUpdateType(update: unknown): string | null {
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    return null
  }

  const candidate = Object.keys(update).find((key) => key !== 'update_id') ?? null
  return candidate
}

export function createApp(): Express {
  const app = express()
  const START_TELEGRAM_BOT = process.env.START_TELEGRAM_BOT === 'true'
  const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() || ''
  const TELEGRAM_WEBHOOK_SECRET =
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || ''
  const isProduction = process.env.NODE_ENV === 'production'
  const corsOriginEnv =
    process.env.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  const vercelUrl = process.env.VERCEL_URL?.trim()
  const vercelOrigin = vercelUrl
    ? `https://${vercelUrl.replace(/^https?:\/\//, '')}`
    : null
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://starway-frontend.vercel.app',
    process.env.FRONTEND_URL?.trim(),
    process.env.PUBLIC_FRONTEND_URL?.trim(),
    vercelOrigin,
    ...corsOriginEnv,
  ].filter((origin): origin is string => Boolean(origin))
  const localNetworkOriginPattern = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/
  const devTunnelOriginPattern =
    /^https:\/\/[a-z0-9-]+\.(?:lhr\.life|localhost\.run|ngrok-free\.dev|trycloudflare\.com)$/i

  const corsOptions = cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      const isDevLocalOrigin =
        !isProduction && localNetworkOriginPattern.test(origin)
      const isDevTunnelOrigin =
        !isProduction && devTunnelOriginPattern.test(origin)
      const isKnownOrigin = allowedOrigins.some((allowed) =>
        origin.startsWith(allowed)
      )

      if (isKnownOrigin || isDevLocalOrigin || isDevTunnelOrigin) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS blocked: ${origin}`))
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })

  // =====================
  // Middleware
  // =====================
  // Webhook endpoints — публічні receivers, CORS не потрібен.
  // WayForPay browser return may arrive with Origin: null, and webhook calls may
  // use an external origin that will never be present in allowedOrigins.
  // він ніколи не буде в allowedOrigins, тому cors({ origin: '*' }) тут.
  const webhookCors = cors({ origin: '*' })
  app.use('/api/payments/wayforpay', webhookCors)
  app.use('/api/subscriptions/payments/wayforpay', webhookCors)

  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api/payments/wayforpay') ||
      req.path.startsWith('/api/subscriptions/payments/wayforpay')
    ) {
      next()
      return
    }

    corsOptions(req, res, next)
  })
  app.options('*', corsOptions)
  app.use(securityHeaders)

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // Public static deliverables must stay доступні без auth/login flows.
  app.use(
    '/deliverables',
    express.static(publicDeliverablesPath, {
      fallthrough: false,
      index: false,
      redirect: false,
    })
  )

  app.get('/api/telegram/webhook/health', (_req: Request, res: Response) => {
    const deliveryMode = resolveTelegramDeliveryMode()
    const enabled = START_TELEGRAM_BOT && deliveryMode === 'webhook'
    return res.status(200).json({
      ok: true,
      webhook: {
        enabled,
        deliveryMode: START_TELEGRAM_BOT ? deliveryMode : 'disabled',
        startTelegramBot: START_TELEGRAM_BOT,
        hasWebhookUrl: Boolean(TELEGRAM_WEBHOOK_URL),
      },
    })
  })

  // Keep webhook route in createApp so it is registered regardless of bootstrap entrypoint.
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    if (!START_TELEGRAM_BOT || resolveTelegramDeliveryMode() !== 'webhook') {
      return res
        .status(404)
        .json({ ok: false, message: 'telegram webhook disabled' })
    }

    const incomingSecret =
      req.get('x-telegram-bot-api-secret-token')?.trim() || ''
    const updateId =
      typeof req.body?.update_id === 'number' || typeof req.body?.update_id === 'string'
        ? req.body.update_id
        : null
    console.log('[TELEGRAM_WEBHOOK_RECEIVED]', {
      updateId,
      hasSecret: Boolean(incomingSecret),
      updateType: resolveTelegramWebhookUpdateType(req.body),
    })
    const webhookTarget = resolveTelegramWebhookTarget(incomingSecret)

    if (!webhookTarget) {
      console.warn('[TELEGRAM_WEBHOOK_REJECTED]', {
        hasIncomingSecret: Boolean(incomingSecret),
        reason: incomingSecret ? 'invalid_secret' : 'missing_secret',
      })
      return res
        .status(401)
        .json({ ok: false, message: incomingSecret ? 'invalid telegram webhook secret' : 'missing telegram webhook secret' })
    }

    console.log('[TELEGRAM_WEBHOOK_ACCEPTED]', {
      botId: webhookTarget.id,
      updateId,
    })

    // ACK immediately to avoid webhook caller timeout/retries;
    // update processing runs in background.
    res.status(200).send('OK')
    setImmediate(() => {
      void webhookTarget.handleUpdate(req.body).catch((error) => {
        console.error('❌ [TELEGRAM WEBHOOK ERROR]', {
          botId: webhookTarget.id,
          error,
        })
      })
    })
    return
  })

  // FIX(18.05.2026): handle telegram root token before request logging — Codex
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path !== '/' || typeof req.query.token !== 'string') {
      next()
      return
    }

    const token = req.query.token.trim()
    if (!token) {
      res.status(204).end()
      return
    }

    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(renderTelegramRootTokenBridge(token))
  })

  // =====================
  // Health check
  // =====================
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    })
  })

  app.get('/health/ready', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.status(200).json({ status: 'ok', db: 'connected' })
    } catch (error) {
      res.status(503).json({
        status: 'error',
        db: 'unavailable',
        message: error instanceof Error ? error.message : 'Database not ready',
      })
    }
  })

  app.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({ alive: true })
  })

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (!shouldProxyToDevFrontend(req)) {
      next()
      return
    }

    try {
      return await proxyToDevFrontend(req, res)
    } catch (error) {
      console.error('[DEV_FRONTEND_PROXY] failed', {
        path: req.originalUrl,
        target: DEV_FRONTEND_PROXY_TARGET,
        message: error instanceof Error ? error.message : String(error),
      })
      next()
    }
  })

  // =====================
  // Routes
  // =====================
  app.use('/api/auth', authRoutes)
  app.use('/api/telegram', telegramRouter)
  app.get('/api/telegram/runtime/identity-parity', authOrBotRequired, getTelegramIdentityParityHandler)
  app.post('/api/telegram/runtime/identity-repair', authOrBotRequired, postTelegramIdentityRepairHandler)
  app.get('/api/telegram/runtime/parity', authOrBotRequired, getTelegramRuntimeParityHandler)
  app.post('/api/telegram/runtime/state-sync', authOrBotRequired, postTelegramRuntimeStateSyncHandler)
  app.use('/api/access', accessRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api/events', eventsRoutes)
  app.use('/api/deeplinks', deeplinkRoutes)
  app.use('/api/experts', expertsRoutes)
  app.use('/api/five-points', fivePointsRoutes)
  app.use('/api/products', productsRoutes)
  app.use('/api/product-members', productMembersRoutes)
  app.use('/api/progress', progressRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/debug', mentorDebugRoutes)
  app.use('/debug', dbAuditRouter)
  app.use('/api/debug', dbAuditRouter)

  app.use('/api/mentor', mentorRoutes)
  app.use('/api/mentor', mentorWeeklyAnalysisRoutes)
  app.use('/api/aIMentor', mentorRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/onboarding', onboardingRoutes)
  app.use('/api/journal', journalRoutes)
  app.use('/api/wheel', wheelRoutes)
  app.use('/api/vision', visionRoutes)
  app.use('/api/goals', goalsRoutes)
  app.use('/api/trial', trialRoutes)
  app.use('/api/user', userStateRoutes)
  app.use('/api/user', userRoutes)
  app.use('/api/quota', quotaRoutes)
  app.use('/api/affiliate', affiliateRoutes)
  app.use('/api/lead-magnet', leadMagnetRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/gamification', gamificationRoutes)
  app.use('/api/start-flow', startFlowRoutes)

  app.use('/api/consultation', consultationRoutes)
  app.use('/api/ab-test', abTestRoutes)
  app.use('/api/test', testSyncRoutes)
  app.use('/api/zoom', zoomRoutes)
  app.use('/api/coach', zoomCoachRoutes)
  app.use('/api/audio', audioRoutes)
  app.use('/api/mentorship', mentorshipRoutes)
  app.use('/api/courses', miniCoursesRoutes)
  app.use('/api/social', socialRoutes)
  app.use('/api/subscriptions', subscriptionsRoutes)
  app.post('/api/user/focus-access', async (req: Request, res: Response) => {
    try {
      const telegramId = req.body?.telegramId
      if (!telegramId) {
        return res.status(400).json({ error: 'telegramId required' })
      }

      const user = await prisma.user.findFirst({
        where: { telegramUserId: String(telegramId) },
        select: { id: true },
      })

      if (!user?.id) {
        return res.json({ userId: null, hasFocus: false })
      }

      const accessState = await getUserAccessState(user.id)

      return res.json({ userId: user.id, hasFocus: accessState.hasFocus })
    } catch {
      return res.status(500).json({ error: 'Server error' })
    }
  })
  app.post('/api/dev/focus/block12/resend', resendFocusBlock12DevHandler)
  app.get(
    '/api/payments/wayforpay/checkout/:token',
    renderWayForPayCheckoutPageHandler
  )
  app.use('/api/landing', landingRoutes)
  app.use('/api/assistant', assistantRoutes)
  app.use('/api/intelligence', intelligenceRoutes)
  app.use('/api/ai/sales-assistant', authRequired, salesAssistantRouter)
  app.use('/api/billing', billingRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/daily', dailyRoutes)
  app.use('/api/platform', platformRoutes)
  app.use('/api/web-map', webMapRouter)

  // =====================
  // 404
  // =====================
  app.use((req: Request, res: Response) => {
    console.log('❌ [404]', { method: req.method, path: req.path })

    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
    })
  })

  // =====================
  // Error handler (ЗАВЖДИ ОСТАННІЙ)
  // =====================
  app.use(errorHandler)

  return app
}

// =====================
// Error handler
// =====================
function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('💥 [ERROR]', {
    path: req.path,
    method: req.method,
    error: error?.message,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
  })

  if (error?.code?.startsWith?.('P')) {
    return res.status(400).json({
      error: 'Database error',
      message:
        process.env.NODE_ENV === 'development' ? error.message : 'Bad request',
      code: error.code,
    })
  }

  return res.status(error?.status || 500).json({
    error: error?.name || 'Internal Server Error',
    message: error?.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error?.stack,
    }),
  })
}

import { requireTelegramBotConfig } from '../../telegram-mentor/runtime/botConfig.js'

const DEFAULT_SENDPULSE_API_URL = 'https://api.sendpulse.com'
const DEFAULT_LEAD_MAGNET_TRIGGER = 'lidmagnet_start'
const DEFAULT_LEAD_MAGNET_STOP_TRIGGER = 'lidmagnet_stop'
const DEFAULT_LEAD_MAGNET_FLOW_ID = 'lead_magnet_1'
const REQUEST_TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 3

export type SendPulseStartFlowPayload = {
  telegramId: string
  flowId: string
}

export type SendPulseMiniCourseFlowKey = 'mini_course_intro'

export type SendPulseMiniCoursePayload = {
  chatId: string
  flowKey: SendPulseMiniCourseFlowKey
  variables?: Record<string, string>
}

type SendPulseConfig = {
  apiUrl: string
  apiToken: string
  leadMagnetTrigger: string
  leadMagnetStopTrigger: string
  leadMagnetFlowId: string
  botUsername: string
}

type SendPulseEndpointConfig = {
  name: 'trigger' | 'flow'
  path: string
  body: Record<string, string>
}

function getSendPulseConfig(): SendPulseConfig {
  return {
    apiUrl: process.env.SENDPULSE_API_URL?.trim() ?? DEFAULT_SENDPULSE_API_URL,
    apiToken:
      process.env.SENDPULSE_API_TOKEN?.trim() ??
      process.env.SENDPULSE_API_KEY?.trim() ??
      '',
    leadMagnetTrigger:
      process.env.SENDPULSE_LEADMAGNET_TRIGGER?.trim() ?? DEFAULT_LEAD_MAGNET_TRIGGER,
    leadMagnetStopTrigger:
      process.env.SENDPULSE_LEADMAGNET_STOP_TRIGGER?.trim() ?? DEFAULT_LEAD_MAGNET_STOP_TRIGGER,
    leadMagnetFlowId:
      process.env.SENDPULSE_LEADMAGNET_FLOW_ID?.trim() ?? DEFAULT_LEAD_MAGNET_FLOW_ID,
    botUsername: requireTelegramBotConfig('sendpulse config').username.replace(/\s+#.*$/, '').trim(),
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function createAbortSignal(timeoutMs: number): {
  signal: AbortSignal
  clear: () => void
} {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

async function requestJson<TResponse>(
  config: SendPulseConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const { signal, clear } = createAbortSignal(REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '')
      throw new Error(`SENDPULSE_REQUEST_FAILED: ${responseBody}`)
    }

    return (await response.json().catch(() => null)) as TResponse
  } finally {
    clear()
  }
}

async function requestWithResilience(
  config: SendPulseConfig,
  endpoint: SendPulseEndpointConfig,
): Promise<boolean> {
  const url = `${config.apiUrl.replace(/\/$/, '')}${endpoint.path}`

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const { signal, clear } = createAbortSignal(REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpoint.body),
        signal,
      })

      clear()

      if (response.ok) {
        console.info('[SendPulse] request succeeded', {
          endpoint: endpoint.name,
          attempt,
          status: response.status,
        })
        return true
      }

      const responseBody = await response.text().catch(() => '')
      console.error('[SendPulse] request failed', {
        endpoint: endpoint.name,
        attempt,
        status: response.status,
        body: responseBody,
      })

      if (!isRetryableStatus(response.status)) {
        return false
      }
    } catch (error) {
      clear()
      console.error('[SendPulse] request error', {
        endpoint: endpoint.name,
        attempt,
        error,
      })
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(300 * attempt)
    }
  }

  return false
}

export function getMentorReturnDeeplink(): string {
  const { botUsername } = getSendPulseConfig()
  return `https://t.me/${botUsername}?start=mentor_return`
}

export async function startSendPulseFlow(payload: SendPulseStartFlowPayload): Promise<void> {
  try {
    const config = getSendPulseConfig()

    if (!config.apiToken) {
      throw new Error('SENDPULSE_NOT_CONFIGURED')
    }

    await requestJson<void>(config, '/chatbots/telegram/flows/trigger', {
      flow_id: payload.flowId,
      external_id: payload.telegramId,
    })
  } catch (error) {
    logger.error('[sendpulse]', error)
  }
}

export async function sendMiniCourseViaSendPulse(
  payload: SendPulseMiniCoursePayload,
): Promise<unknown> {
  try {
    const config = getSendPulseConfig()

    if (!config.apiToken) {
      throw new Error('SENDPULSE_NOT_CONFIGURED')
    }

    return requestJson<unknown>(config, '/telegram/flows/start', {
      ...payload,
      variables: {
        ...payload.variables,
        continueUrl: getMentorReturnDeeplink(),
      },
    })
  } catch (error) {
    logger.error('[sendpulse]', error)
    return null
  }
}

export async function triggerLeadMagnet(telegramChatId: string): Promise<void> {
  try {
    const config = getSendPulseConfig()

    if (!config.apiToken) {
      throw new Error('SENDPULSE_NOT_CONFIGURED')
    }

    const endpoints: SendPulseEndpointConfig[] = [
      {
        name: 'trigger',
        path: '/telegram/send',
        body: {
          chat_id: telegramChatId,
          trigger: config.leadMagnetTrigger,
        },
      },
      {
        name: 'flow',
        path: '/chatbots/telegram/flows/trigger',
        body: {
          flow_id: config.leadMagnetFlowId,
          external_id: telegramChatId,
        },
      },
    ]

    for (const endpoint of endpoints) {
      const ok = await requestWithResilience(config, endpoint)
      if (ok) {
        return
      }
    }

    throw new Error('SENDPULSE_REQUEST_FAILED')
  } catch (error) {
    logger.error('[sendpulse]', error)
  }
}

export async function stopLeadMagnet(telegramChatId: string): Promise<boolean> {
  try {
    const config = getSendPulseConfig()

    if (!config.apiToken || !config.leadMagnetStopTrigger) {
      return false
    }

    return await requestWithResilience(config, {
      name: 'trigger',
      path: '/telegram/send',
      body: {
        chat_id: telegramChatId,
        trigger: config.leadMagnetStopTrigger,
      },
    })
  } catch (error) {
    logger.error('[sendpulse-stop]', error)
    return false
  }
}

export const SendPulseService = {
  getMentorReturnDeeplink,
  sendMiniCourseViaSendPulse,
  startSendPulseFlow,
  triggerLeadMagnet,
  stopLeadMagnet,
}
import { logger } from '../../../utils/logger.js'

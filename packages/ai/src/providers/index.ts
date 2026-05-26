import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

function getGeminiApiKey() {
  return process.env.GOOGLE_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    ''
}

let cachedOpenAi: OpenAI | null = null
let cachedOpenAiKey: string | undefined

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!cachedOpenAi || cachedOpenAiKey !== apiKey) {
    cachedOpenAi = new OpenAI({ apiKey })
    cachedOpenAiKey = apiKey
  }
  return cachedOpenAi
}

let cachedAnthropic: Anthropic | null = null
let cachedAnthropicKey: string | undefined

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!cachedAnthropic || cachedAnthropicKey !== apiKey) {
    cachedAnthropic = new Anthropic({ apiKey })
    cachedAnthropicKey = apiKey
  }
  return cachedAnthropic
}

let cachedGemini: GoogleGenerativeAI | null = null
let cachedGeminiKey: string | undefined

function getGeminiClient() {
  const apiKey = getGeminiApiKey()
  if (!cachedGemini || cachedGeminiKey !== apiKey) {
    cachedGemini = new GoogleGenerativeAI(apiKey)
    cachedGeminiKey = apiKey
  }
  return cachedGemini
}

function lazyClient<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      const client = factory()
      const value = Reflect.get(client, property, receiver)
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}

export const openai = lazyClient<OpenAI>(getOpenAiClient)

export const anthropic = lazyClient<Anthropic>(getAnthropicClient)

export const gemini = lazyClient<GoogleGenerativeAI>(getGeminiClient)

export const AI_PROVIDERS = {
  gpt: openai,
  claude: anthropic,
  gemini,
} as const

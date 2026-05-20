import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const gemini = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY ?? '',
)

export const AI_PROVIDERS = {
  gpt: openai,
  claude: anthropic,
  gemini,
} as const

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from '../providers/index.js'
import { AI_MODELS } from '../providers/models.js'
import { toolRegistry } from '../tools/registry.js'
import type { TelegramSendParams, TelegramSendResult } from '../tools/telegram.tool.js'
import type { Tool } from '../tools/types.js'
import type { Skill, SkillInput, SkillResult } from './types.js'

const SYSTEM_PROMPT = [
  'Ти визначаєш, чи потрібно відправити повідомлення користувачу в Telegram, і яке саме.',
  'Викликай tool тільки коли запит прямо вимагає реального сповіщення або нагадування користувачу.',
  'Якщо надсилання не потрібне, не викликай tool і коротко поясни результат без side effect.',
  'Якщо викликаєш tool, сформулюй готовий текст повідомлення українською мовою.',
].join(' ')

const TELEGRAM_TOOL_NAME = 'telegram_send'
const TELEGRAM_TOOL_ID = 'telegram.send'
const MAX_TOOL_ROUNDS = 3

export const notifySkill: Skill = {
  id: 'notify',
  description: 'Decides whether a Telegram notification should be sent and executes the telegram.send tool via Claude tool use.',
  systemPrompt: SYSTEM_PROMPT,
  allowedTools: [TELEGRAM_TOOL_ID],
  async run(input) {
    const parsedInput = parseSkillInput(input)
    const telegramTool = getTelegramTool()
    const client = getAnthropicClient()
    const toolCalls: string[] = []
    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: `userId: ${parsedInput.userId}\nmessage: ${parsedInput.message}`,
      },
    ]

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await client.messages.create({
        model: AI_MODELS.CLAUDE_MAIN,
        max_tokens: 500,
        system: notifySkill.systemPrompt,
        messages,
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        tools: [buildAnthropicTelegramTool()],
      })

      const toolUseBlocks = response.content.filter(isToolUseBlock)
      if (toolUseBlocks.length === 0) {
        return {
          text: extractText(response.content),
          toolCalls,
        }
      }

      messages.push({
        role: 'assistant',
        content: response.content.map((block) =>
          block.type === 'text'
            ? { type: 'text', text: block.text }
            : block.type === 'tool_use'
              ? { type: 'tool_use', id: block.id, name: block.name, input: block.input }
              : { type: 'text', text: '' },
        ),
      })

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        if (block.name !== TELEGRAM_TOOL_NAME) {
          throw new Error(`Unsupported tool requested by notify skill: ${block.name}`)
        }

        const toolInput = telegramTool.paramsSchema.parse({
          userId: parsedInput.userId,
          ...(isRecord(block.input) ? block.input : {}),
        })

        const delivered = await telegramTool.execute(toolInput)
        toolCalls.push(TELEGRAM_TOOL_ID)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({
            ok: delivered,
            userId: toolInput.userId,
            text: toolInput.text,
          }),
        })
      }

      messages.push({
        role: 'user',
        content: toolResults,
      })
    }

    throw new Error('notify skill exceeded maximum tool rounds')
  },
}

function parseSkillInput(input: SkillInput): SkillInput {
  if (typeof input.userId !== 'string' || !input.userId.trim()) {
    throw new Error('notify skill requires a non-empty userId')
  }

  if (typeof input.message !== 'string' || !input.message.trim()) {
    throw new Error('notify skill requires a non-empty message')
  }

  return {
    userId: input.userId.trim(),
    message: input.message.trim(),
  }
}

function getTelegramTool(): Tool<TelegramSendParams, TelegramSendResult> {
  const tool = toolRegistry.get<TelegramSendParams, TelegramSendResult>(TELEGRAM_TOOL_ID)
  if (!tool) {
    throw new Error(`Required tool is not registered: ${TELEGRAM_TOOL_ID}`)
  }

  return tool
}

function buildAnthropicTelegramTool(): Anthropic.Messages.Tool {
  return {
    name: TELEGRAM_TOOL_NAME,
    description: 'Send a Telegram notification to the specified user when a real reminder or message should be delivered.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The exact Telegram message to send to the user.',
        },
      },
      required: ['text'],
    },
  }
}

function isToolUseBlock(
  block: Anthropic.Messages.ContentBlock,
): block is Anthropic.Messages.ToolUseBlock {
  return block.type === 'tool_use'
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  const text = content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n')

  return text || 'No notification was sent.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

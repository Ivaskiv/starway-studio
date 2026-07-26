import type {
  AnthropicStreamEventLike,
  AnthropicStreamingChunk,
  AnthropicStreamingResult,
  IAnthropicStreamingSupport,
  IAnthropicTokenUsageCalculator,
} from './types.js'
import type { RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages'

export class StreamingSupport implements IAnthropicStreamingSupport {
  constructor(private readonly tokenUsageCalculator: IAnthropicTokenUsageCalculator) {}

  async consume(
    stream: AsyncIterable<AnthropicStreamEventLike | RawMessageStreamEvent>,
    options: {
      onChunk?: (chunk: AnthropicStreamingChunk) => void | Promise<void>
    } = {},
  ): Promise<AnthropicStreamingResult> {
    let content = ''
    let stopReason: string | null | undefined
    let model: string | undefined
    let usage: AnthropicStreamingResult['usage']
    let chunks = 0

    for await (const chunk of stream) {
      chunks += 1
      const message = hasMessage(chunk) ? chunk.message : undefined
      const delta = hasDelta(chunk) ? chunk.delta : undefined
      const chunkUsage = hasUsage(chunk) ? chunk.usage : undefined

      model ??= message?.model
      stopReason ??= getStopReason(delta) ?? message?.stop_reason
      const nextUsage = this.tokenUsageCalculator.calculate(chunkUsage ?? message?.usage ?? undefined)
      if (nextUsage) {
        usage = nextUsage
      }
      const contentDelta = extractDeltaText(chunk)
      if (contentDelta) {
        content += contentDelta
      }

      if (options.onChunk) {
        await options.onChunk({
          contentDelta,
          rawChunk: normalizeRawChunk(chunk),
        })
      }
    }

    return {
      content,
      stopReason,
      model,
      usage,
      chunks,
    }
  }
}

function extractDeltaText(chunk: AnthropicStreamEventLike | RawMessageStreamEvent): string {
  if (
    chunk.type === 'content_block_delta' &&
    hasDelta(chunk) &&
    chunk.delta &&
    typeof chunk.delta === 'object' &&
    'text' in chunk.delta &&
    typeof chunk.delta.text === 'string'
  ) {
    return chunk.delta.text
  }
  return ''
}

function getStopReason(delta: unknown): string | null | undefined {
  if (delta && typeof delta === 'object' && 'stop_reason' in delta) {
    const value = (delta as { stop_reason?: unknown }).stop_reason
    return typeof value === 'string' || value === null ? value : undefined
  }
  return undefined
}

function hasMessage(
  chunk: AnthropicStreamEventLike | RawMessageStreamEvent,
): chunk is (AnthropicStreamEventLike | RawMessageStreamEvent) & { message: { model?: string; stop_reason?: string | null; usage?: unknown } } {
  return 'message' in chunk
}

function hasDelta(
  chunk: AnthropicStreamEventLike | RawMessageStreamEvent,
): chunk is (AnthropicStreamEventLike | RawMessageStreamEvent) & { delta: unknown } {
  return 'delta' in chunk
}

function hasUsage(
  chunk: AnthropicStreamEventLike | RawMessageStreamEvent,
): chunk is (AnthropicStreamEventLike | RawMessageStreamEvent) & { usage: unknown } {
  return 'usage' in chunk
}

function normalizeRawChunk(chunk: AnthropicStreamEventLike | RawMessageStreamEvent): AnthropicStreamEventLike {
  if (!chunk || typeof chunk !== 'object') {
    return {}
  }

  const normalized: AnthropicStreamEventLike = {
    type: 'type' in chunk && typeof chunk.type === 'string' ? chunk.type : undefined,
  }

  if ('message' in chunk) {
    normalized.message = chunk.message as AnthropicStreamEventLike['message']
  }

  if ('delta' in chunk) {
    const delta = chunk.delta
    if (delta && typeof delta === 'object') {
      normalized.delta = {
        text: 'text' in delta && typeof delta.text === 'string' ? delta.text : undefined,
        stop_reason:
          'stop_reason' in delta && (typeof delta.stop_reason === 'string' || delta.stop_reason === null)
            ? delta.stop_reason
            : undefined,
      }
    }
  }

  if ('usage' in chunk) {
    normalized.usage = chunk.usage as AnthropicStreamEventLike['usage']
  }

  return normalized
}

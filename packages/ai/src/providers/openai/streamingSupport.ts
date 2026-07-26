import type {
  IStreamingSupport,
  ITokenUsageCalculator,
  OpenAIChunkLike,
  OpenAIStreamingChunk,
  OpenAIStreamingResult,
} from './types.js'

export class StreamingSupport implements IStreamingSupport {
  constructor(private readonly tokenUsageCalculator: ITokenUsageCalculator) {}

  async consume(
    stream: AsyncIterable<OpenAIChunkLike>,
    options: {
      onChunk?: (chunk: OpenAIStreamingChunk) => void | Promise<void>
    } = {},
  ): Promise<OpenAIStreamingResult> {
    let content = ''
    let finishReason: string | null | undefined
    let model: string | undefined
    let usage: OpenAIStreamingResult['usage']
    let chunks = 0

    for await (const chunk of stream) {
      chunks += 1
      model ??= chunk.model
      finishReason ??= chunk.choices?.[0]?.finish_reason
      usage ??= this.tokenUsageCalculator.calculate(chunk.usage ?? undefined)
      const delta = extractDeltaText(chunk)
      if (delta) {
        content += delta
      }

      if (options.onChunk) {
        await options.onChunk({
          contentDelta: delta,
          rawChunk: chunk,
        })
      }
    }

    return {
      content,
      finishReason,
      model,
      usage,
      chunks,
    }
  }
}

function extractDeltaText(chunk: OpenAIChunkLike): string {
  const content = chunk.choices?.[0]?.delta?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('')
  }

  return ''
}

import type {
  GeminiResponseLike,
  GeminiStreamingChunk,
  GeminiStreamingResult,
  IGeminiStreamingSupport,
  IGeminiTokenUsageCalculator,
} from './types.js'

export class StreamingSupport implements IGeminiStreamingSupport {
  constructor(private readonly tokenUsageCalculator: IGeminiTokenUsageCalculator) {}

  async consume(
    stream: AsyncIterable<GeminiResponseLike>,
    options: {
      onChunk?: (chunk: GeminiStreamingChunk) => void | Promise<void>
    } = {},
  ): Promise<GeminiStreamingResult> {
    let content = ''
    let usage: GeminiStreamingResult['usage']
    let model: string | undefined
    let chunks = 0

    for await (const chunk of stream) {
      chunks += 1
      const contentDelta = extractText(chunk)
      if (contentDelta) {
        content += contentDelta
      }

      const nextUsage = this.tokenUsageCalculator.calculate(chunk.usageMetadata)
      if (nextUsage) {
        usage = nextUsage
      }

      if (options.onChunk) {
        await options.onChunk({
          contentDelta,
          rawChunk: chunk,
        })
      }
    }

    return {
      content,
      usage,
      model,
      chunks,
    }
  }
}

function extractText(response: GeminiResponseLike): string {
  if (typeof response.text === 'function') {
    return response.text()
  }

  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('') ?? ''
  )
}

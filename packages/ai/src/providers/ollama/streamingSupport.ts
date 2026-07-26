import type {
  IOllamaStreamingSupport,
  IOllamaTokenUsageCalculator,
  OllamaChunkLike,
  OllamaStreamingResult,
} from './types.js'

export class StreamingSupport implements IOllamaStreamingSupport {
  constructor(private readonly tokenUsageCalculator: IOllamaTokenUsageCalculator) {}

  async consume(
    stream: AsyncIterable<OllamaChunkLike>,
    options?: {
      onChunk?: (chunk: import('./types.js').OllamaStreamingChunk) => void | Promise<void>
    },
  ): Promise<OllamaStreamingResult> {
    let content = ''
    let usage: OllamaStreamingResult['usage']
    let model: string | undefined
    let chunks = 0

    for await (const chunk of stream) {
      chunks += 1
      if (typeof chunk.model === 'string' && chunk.model.trim()) {
        model = chunk.model
      }
      const delta = typeof chunk.response === 'string' ? chunk.response : ''
      content += delta
      usage = this.tokenUsageCalculator.calculate(chunk) ?? usage
      if (options?.onChunk) {
        await options.onChunk({
          contentDelta: delta || undefined,
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


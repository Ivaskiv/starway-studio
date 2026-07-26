import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type {
  GeminiProviderMetadata,
  GeminiProviderRequest,
  GeminiResponseLike,
  GeminiStreamingResult,
  IGeminiResponseMapper,
  IGeminiStructuredOutputParser,
  IGeminiTokenUsageCalculator,
} from './types.js'

export class GeminiResponseMapper implements IGeminiResponseMapper {
  constructor(
    private readonly tokenUsageCalculator: IGeminiTokenUsageCalculator,
    private readonly structuredOutputParser: IGeminiStructuredOutputParser,
  ) {}

  mapResponse(input: {
    response: GeminiResponseLike
    request: GeminiProviderRequest
  }): AIProviderResponse {
    const content = extractText(input.response)
    const structuredOutput = this.structuredOutputParser.parse({
      content,
      structuredOutput: input.request.executionOptions.structuredOutput,
    })

    return {
      content,
      structuredOutput,
      metadata: this.buildMetadata({
        response: input.response,
        streamed: false,
      }),
    }
  }

  mapStreamingResult(input: {
    result: GeminiStreamingResult
    request: GeminiProviderRequest
  }): AIProviderResponse {
    const content = input.result.content
    const structuredOutput = this.structuredOutputParser.parse({
      content,
      structuredOutput: input.request.executionOptions.structuredOutput,
    })

    return {
      content,
      structuredOutput,
      metadata: {
        provider: 'gemini',
        streamed: true,
        model: input.result.model,
        tokenUsage: input.result.usage,
        chunks: input.result.chunks,
      } satisfies GeminiProviderMetadata,
    }
  }

  private buildMetadata(input: {
    response: GeminiResponseLike
    streamed: boolean
  }): GeminiProviderMetadata {
    return {
      provider: 'gemini',
      streamed: input.streamed,
      tokenUsage: this.tokenUsageCalculator.calculate(input.response.usageMetadata),
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

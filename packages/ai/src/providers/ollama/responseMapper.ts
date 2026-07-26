import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type {
  IOllamaResponseMapper,
  IOllamaStructuredOutputParser,
  IOllamaTokenUsageCalculator,
  OllamaProviderMetadata,
  OllamaProviderRequest,
  OllamaResponseLike,
  OllamaStreamingResult,
} from './types.js'

export class OllamaResponseMapper implements IOllamaResponseMapper {
  constructor(
    private readonly tokenUsageCalculator: IOllamaTokenUsageCalculator,
    private readonly structuredOutputParser: IOllamaStructuredOutputParser,
  ) {}

  mapResponse(input: {
    response: OllamaResponseLike
    request: OllamaProviderRequest
  }): AIProviderResponse {
    const content = extractText(input.response)
    const structuredOutput = this.structuredOutputParser.parse({
      content,
      structuredOutput: input.request.executionOptions.structuredOutput,
    })

    return {
      content,
      structuredOutput,
      metadata: {
        provider: 'ollama',
        streamed: false,
        model: input.response.model,
        tokenUsage: this.tokenUsageCalculator.calculate(input.response),
      } satisfies OllamaProviderMetadata,
    }
  }

  mapStreamingResult(input: {
    result: OllamaStreamingResult
    request: OllamaProviderRequest
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
        provider: 'ollama',
        streamed: true,
        model: input.result.model,
        tokenUsage: input.result.usage,
        chunks: input.result.chunks,
      } satisfies OllamaProviderMetadata,
    }
  }
}

function extractText(response: OllamaResponseLike): string {
  return typeof response.response === 'string' ? response.response : ''
}


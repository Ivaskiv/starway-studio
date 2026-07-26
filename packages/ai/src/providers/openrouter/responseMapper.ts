import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type {
  IOpenRouterResponseMapper,
  IOpenRouterStructuredOutputParser,
  IOpenRouterTokenUsageCalculator,
  OpenRouterCompletionLike,
  OpenRouterProviderMetadata,
  OpenRouterProviderRequest,
  OpenRouterStreamingResult,
} from './types.js'

export class OpenRouterResponseMapper implements IOpenRouterResponseMapper {
  constructor(
    private readonly tokenUsageCalculator: IOpenRouterTokenUsageCalculator,
    private readonly structuredOutputParser: IOpenRouterStructuredOutputParser,
  ) {}

  mapCompletion(input: {
    response: OpenRouterCompletionLike
    request: OpenRouterProviderRequest
  }): AIProviderResponse {
    const content = extractMessageContent(input.response)
    const structuredOutput = this.structuredOutputParser.parse({
      content,
      structuredOutput: input.request.executionOptions.structuredOutput,
    })

    return {
      content,
      structuredOutput,
      metadata: this.buildMetadata({
        response: input.response,
        request: input.request,
        streamed: false,
      }),
    }
  }

  mapStreamingResult(input: {
    result: OpenRouterStreamingResult
    request: OpenRouterProviderRequest
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
        provider: 'openrouter',
        streamed: true,
        route: input.request.executionOptions.route,
        finishReason: input.result.finishReason,
        model: input.result.model,
        tokenUsage: input.result.usage,
        chunks: input.result.chunks,
      } satisfies OpenRouterProviderMetadata,
    }
  }

  private buildMetadata(input: {
    response: OpenRouterCompletionLike
    request: OpenRouterProviderRequest
    streamed: boolean
  }): OpenRouterProviderMetadata {
    return {
      provider: 'openrouter',
      streamed: input.streamed,
      route: input.request.executionOptions.route,
      model: input.response.model,
      finishReason: input.response.choices?.[0]?.finish_reason,
      tokenUsage: this.tokenUsageCalculator.calculate(input.response.usage),
    }
  }
}

function extractMessageContent(response: OpenRouterCompletionLike): string {
  const content = response.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('')
  }

  return ''
}


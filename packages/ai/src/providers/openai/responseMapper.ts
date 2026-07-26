import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type {
  IOpenAIResponseMapper,
  IStructuredOutputParser,
  ITokenUsageCalculator,
  OpenAICompletionLike,
  OpenAIProviderMetadata,
  OpenAIProviderRequest,
  OpenAIStreamingResult,
} from './types.js'

export class OpenAIResponseMapper implements IOpenAIResponseMapper {
  constructor(
    private readonly tokenUsageCalculator: ITokenUsageCalculator,
    private readonly structuredOutputParser: IStructuredOutputParser,
  ) {}

  mapCompletion(input: {
    response: OpenAICompletionLike
    request: OpenAIProviderRequest
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
        streamed: false,
      }),
    }
  }

  mapStreamingResult(input: {
    result: OpenAIStreamingResult
    request: OpenAIProviderRequest
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
        provider: 'openai',
        streamed: true,
        finishReason: input.result.finishReason,
        model: input.result.model,
        tokenUsage: input.result.usage,
        chunks: input.result.chunks,
      } satisfies OpenAIProviderMetadata,
    }
  }

  private buildMetadata(input: {
    response: OpenAICompletionLike
    streamed: boolean
  }): OpenAIProviderMetadata {
    return {
      provider: 'openai',
      streamed: input.streamed,
      model: input.response.model,
      finishReason: input.response.choices?.[0]?.finish_reason,
      tokenUsage: this.tokenUsageCalculator.calculate(input.response.usage),
    }
  }
}

function extractMessageContent(response: OpenAICompletionLike): string {
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

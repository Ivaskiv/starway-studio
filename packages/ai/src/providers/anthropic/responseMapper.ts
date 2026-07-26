import type { AIProviderResponse } from '../../runtime/agent-runner/types.js'
import type {
  AnthropicMessageLike,
  AnthropicProviderMetadata,
  AnthropicProviderRequest,
  AnthropicStreamingResult,
  IAnthropicResponseMapper,
  IAnthropicStructuredOutputParser,
  IAnthropicTokenUsageCalculator,
} from './types.js'

export class AnthropicResponseMapper implements IAnthropicResponseMapper {
  constructor(
    private readonly tokenUsageCalculator: IAnthropicTokenUsageCalculator,
    private readonly structuredOutputParser: IAnthropicStructuredOutputParser,
  ) {}

  mapMessage(input: {
    response: AnthropicMessageLike
    request: AnthropicProviderRequest
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
    result: AnthropicStreamingResult
    request: AnthropicProviderRequest
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
        provider: 'anthropic',
        streamed: true,
        stopReason: input.result.stopReason,
        model: input.result.model,
        tokenUsage: input.result.usage,
        chunks: input.result.chunks,
      } satisfies AnthropicProviderMetadata,
    }
  }

  private buildMetadata(input: {
    response: AnthropicMessageLike
    streamed: boolean
  }): AnthropicProviderMetadata {
    return {
      provider: 'anthropic',
      streamed: input.streamed,
      model: input.response.model,
      stopReason: input.response.stop_reason,
      tokenUsage: this.tokenUsageCalculator.calculate(input.response.usage),
    }
  }
}

function extractMessageContent(response: AnthropicMessageLike): string {
  return (
    response.content
      ?.map((part) => {
        if (part?.type === 'text' && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('') ?? ''
  )
}

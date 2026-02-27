/**
 * AI SERVICE
 * Головний сервіс для роботи з OpenAI API
 */

import type {
  AIContext,
  AIPrompt,
  AIResponse,
  PromptType,
} from '../../ai-mentor/types/mentor.types';
import { buildSystemContext } from '../prompts/system.prompt';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  TEMPERATURE: 0.3, // низька для більшої консистентності
  MAX_TOKENS: 500, // короткі відповіді
  API_URL: '/api/ai/chat', // проксі через backend
} as const;

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class AIService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = AI_CONFIG.API_URL;
  }

  /**
   * Головний метод для отримання відповіді від AI
   */
  async getResponse(prompt: AIPrompt): Promise<AIResponse> {
    try {
      const systemMessage = this.buildSystemMessage(prompt.userContext);
      const userMessage = this.buildUserMessage(prompt);

      const response = await this.callOpenAI([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ]);

      return {
        type: prompt.type,
        response: response.choices[0].message.content,
        metadata: {
          model: AI_CONFIG.MODEL,
          tokens: response.usage.total_tokens,
          finishReason: response.choices[0].finish_reason,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(
        `Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Стрімінгова відповідь (для довших діалогів)
   */
  async getStreamingResponse(
    prompt: AIPrompt,
    onChunk: (chunk: string) => void,
  ): Promise<AIResponse> {
    try {
      const systemMessage = this.buildSystemMessage(prompt.userContext);
      const userMessage = this.buildUserMessage(prompt);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: AI_CONFIG.TEMPERATURE,
          max_tokens: AI_CONFIG.MAX_TOKENS,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              console.error('Failed to parse streaming chunk:', e);
            }
          }
        }
      }

      return {
        type: prompt.type,
        response: fullResponse,
        metadata: {
          model: AI_CONFIG.MODEL,
          streaming: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AI Streaming Error:', error);
      throw new Error(
        `Failed to get streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Batch обробка (для аналітики, дзеркал)
   */
  async batchProcess(prompts: AIPrompt[]): Promise<AIResponse[]> {
    const results = await Promise.allSettled(prompts.map(prompt => this.getResponse(prompt)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch prompt ${index} failed:`, result.reason);
        return {
          type: prompts[index].type,
          response: 'Помилка обробки. Спробуйте ще раз.',
          metadata: { error: true },
          timestamp: new Date().toISOString(),
        };
      }
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildSystemMessage(context: AIContext): string {
    const baseSystem = buildSystemContext(context.accessLevel);

    // Додаємо контекст про поточний стан користувача
    let contextAddition = '';

    if (context.trialDay) {
      contextAddition += `\nTrial день: ${context.trialDay}/7`;
    }

    if (context.onboardingStage && context.onboardingStage !== 'COMPLETED') {
      contextAddition += `\nOnboarding етап: ${context.onboardingStage}`;
    }

    if (context.wheelData) {
      contextAddition += `\nКолесо: слабка сфера - ${context.wheelData.weakestSphere}, фокус - ${context.wheelData.focusSphere}`;
    }

    if (context.primaryGoal) {
      contextAddition += `\nГоловна ціль: ${context.primaryGoal}`;
    }

    if (context.recentPatterns) {
      contextAddition += `\nПатерни: streak ${context.recentPatterns.stabilityStreak} днів, зливів ${context.recentPatterns.drainCount}`;
    }

    return baseSystem + contextAddition;
  }

  private buildUserMessage(prompt: AIPrompt): string {
    // Тут specialMessage вже побудований в окремих промптах
    return prompt.systemMessage;
  }

  private async callOpenAI(messages: ChatMessage[]): Promise<OpenAIResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages,
        temperature: AI_CONFIG.TEMPERATURE,
        max_tokens: AI_CONFIG.MAX_TOKENS,
      } as OpenAIRequest),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return response.json();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new AIService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Швидкий доступ для простих запитів
 */
export async function askAI(
  promptType: PromptType,
  message: string,
  context: AIContext,
): Promise<string> {
  const prompt: AIPrompt = {
    type: promptType,
    systemMessage: message,
    userContext: context,
  };

  const response = await aiService.getResponse(prompt);
  return response.response;
}

/**
 * Стрімінг для інтерактивних відповідей
 */
export async function streamAI(
  promptType: PromptType,
  message: string,
  context: AIContext,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const prompt: AIPrompt = {
    type: promptType,
    systemMessage: message,
    userContext: context,
  };

  const response = await aiService.getStreamingResponse(prompt, onChunk);
  return response.response;
}

export default aiService;

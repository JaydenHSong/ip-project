// Claude API Client — Anthropic SDK 래퍼
// Sonnet(Worker), Opus(Teacher), Haiku(Monitor) 통합 호출

import Anthropic from '@anthropic-ai/sdk'
import type {
  ClaudeCallOptions,
  ClaudeClient,
  ClaudeContentBlock,
  ClaudeResponse,
} from '@/types/ai'

const CLAUDE_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryOn: [429, 500, 502, 503, 529],
} as const

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

const shouldRetry = (status: number): boolean =>
  (CLAUDE_RETRY_OPTIONS.retryOn as readonly number[]).includes(status)

const createClaudeClient = (apiKey: string): ClaudeClient => {
  const anthropic = new Anthropic({ apiKey })

  const callApi = async (options: ClaudeCallOptions): Promise<ClaudeResponse> => {
    const {
      model,
      systemPrompt,
      messages,
      maxTokens = 4096,
      temperature = 0.3,
      cacheSystemPrompt = true,
    } = options

    const startTime = Date.now()
    let lastError: unknown = null

    for (let attempt = 0; attempt <= CLAUDE_RETRY_OPTIONS.maxRetries; attempt++) {
      try {
        const system: Anthropic.TextBlockParam[] = [{
          type: 'text' as const,
          text: systemPrompt,
          ...(cacheSystemPrompt ? { cache_control: { type: 'ephemeral' as const } } : {}),
        }]

        const apiMessages: Anthropic.MessageParam[] = messages.map(msg => {
          if (typeof msg.content === 'string') {
            return { role: msg.role, content: msg.content }
          }
          return {
            role: msg.role,
            content: msg.content.map((block: ClaudeContentBlock) => {
              if (block.type === 'text') {
                return { type: 'text' as const, text: block.text }
              }
              return {
                type: 'image' as const,
                source: block.source,
              }
            }),
          }
        })

        const response = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: apiMessages,
        })

        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('')

        const cacheHit = response.usage
          ? 'cache_read_input_tokens' in response.usage &&
            ((response.usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0) > 0
          : false

        return {
          content: textContent,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheHit,
          model,
          duration: Date.now() - startTime,
        }
      } catch (error: unknown) {
        lastError = error
        const status = error instanceof Anthropic.APIError ? error.status : 0
        if (attempt < CLAUDE_RETRY_OPTIONS.maxRetries && shouldRetry(status)) {
          const delay = Math.min(
            CLAUDE_RETRY_OPTIONS.baseDelay * Math.pow(2, attempt),
            CLAUDE_RETRY_OPTIONS.maxDelay,
          )
          await sleep(delay)
          continue
        }
        throw error
      }
    }

    throw lastError
  }

  return {
    call: callApi,

    callWithImages: async (options) => {
      const { images, ...rest } = options
      const imageBlocks: ClaudeContentBlock[] = images.map(img => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          data: img.base64,
        },
      }))

      const lastMessage = rest.messages[rest.messages.length - 1]
      const textContent = typeof lastMessage.content === 'string'
        ? [{ type: 'text' as const, text: lastMessage.content }]
        : lastMessage.content

      const updatedMessages = [
        ...rest.messages.slice(0, -1),
        {
          role: lastMessage.role,
          content: [...imageBlocks, ...textContent],
        },
      ]

      return callApi({ ...rest, messages: updatedMessages })
    },
  }
}

export { createClaudeClient }

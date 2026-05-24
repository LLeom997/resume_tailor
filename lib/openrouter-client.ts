import { createOpenAI } from '@ai-sdk/openai'

export function createOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY environment variable is not set. ' +
      'Please add your OpenRouter API key to your environment variables.'
    )
  }

  return createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Resume Builder with AI',
    },
  })
}

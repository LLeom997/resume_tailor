import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenRouterClient } from '@/lib/openrouter-client'

export async function POST(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const { text, instruction, context, model = 'openai/gpt-4o-mini' } = await request.json()

    if (!text || !instruction) {
      return NextResponse.json({ error: 'Original text and instruction are required' }, { status: 400 })
    }

    const openrouterClient = createOpenRouterClient()

    let prompt = `Original Text:\n"${text}"\n\nInstruction:\n"${instruction}"`
    if (context) {
      prompt += `\n\nTarget Job Context:\n${context}`
    }

    const SYSTEM_PROMPT = `You are a precise text editor.
Your task is to modify a specific word, phrase, or section inside the provided text/paragraph based strictly and exclusively on the user's instructions.

CRITICAL RULES:
1. STRICT TEXT CONSERVATION: You must leave the REST of the paragraph completely untouched. Every single word, sentence, punctuation mark, and space that you were not asked to change MUST remain exactly the same, letter-for-letter, as in the original text. Do NOT optimize, do NOT rewrite, and do NOT touch any unasked parts.
2. REMOVAL/DELETION: If asked to remove, delete, or omit a word or phrase, simply output the exact original paragraph with ONLY that specific word or phrase deleted. All other words, sentences, and punctuation must remain 100% identical.
3. REPHRASING: If asked to rephrase a specific part of the text, change ONLY that specific part. The surrounding text and the rest of the paragraph must remain 100% identical word-for-word.
4. Return Format: Return ONLY the modified paragraph itself. Do not write introductions, explanations, or wrap in quotes/backticks.`

    const startTime = Date.now()
    const { text: rewrittenText, usage } = await generateText({
      model: openrouterClient(model),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    })
    const endTime = Date.now()
    const latencySec = (endTime - startTime) / 1000
    const speed = usage ? Math.round((usage as any).totalTokens / latencySec) : 0

    return NextResponse.json({
      rewrittenText: rewrittenText.trim(),
      performance: {
        model,
        latency: latencySec.toFixed(1) + 's',
        promptTokens: (usage as any)?.promptTokens || 0,
        completionTokens: (usage as any)?.completionTokens || 0,
        totalTokens: (usage as any)?.totalTokens || 0,
        speed: speed + ' t/s'
      }
    })
  } catch (error) {
    console.error('Error in POST /api/ai-rewrite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rewrite text' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenRouterClient } from '@/lib/openrouter-client'

export async function POST(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const { text, instruction, context } = await request.json()

    if (!text || !instruction) {
      return NextResponse.json({ error: 'Original text and instruction are required' }, { status: 400 })
    }

    const openrouterClient = createOpenRouterClient()

    let prompt = `Original Text:\n"${text}"\n\nInstruction:\n"${instruction}"`
    if (context) {
      prompt += `\n\nTarget Job Context:\n${context}`
    }

    const SYSTEM_PROMPT = `You are an expert resume writer and career coach.
Your task is to rewrite the provided resume text based on the user's instruction.

Core Guidelines:
1. Grounding: Rely ONLY on the facts provided in the original text. Do NOT invent new companies, roles, dates, tools, or metrics that are not already present or strongly implied in the text.
2. Action-oriented: Use strong, professional action verbs and ensure impactful phrasing.
3. Alignment: If target job context is provided, align the phrasing with the requirements and keywords of that job without fabricating experience.
4. Formatting: Keep the output concise and ready to be pasted directly into a resume.
5. Return ONLY the rewritten text. Do NOT include any introductory or explanatory text, quotes, or markdown wraps (like backticks).`

    const { text: rewrittenText } = await generateText({
      model: openrouterClient('openai/gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    })

    return NextResponse.json({ rewrittenText: rewrittenText.trim() })
  } catch (error) {
    console.error('Error in POST /api/ai-rewrite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rewrite text' },
      { status: 500 }
    )
  }
}

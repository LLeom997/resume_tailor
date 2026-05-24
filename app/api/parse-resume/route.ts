import { resumeContentSchema } from "@/lib/resume-ai-schemas"
import { createOpenRouterClient } from "@/lib/openrouter-client"
import { generateObject } from "ai"
import { NextRequest, NextResponse } from "next/server"

const PARSE_RESUME_PROMPT = `You are a resume parsing assistant. Convert the provided resume text into structured JSON.

Rules:
- Return JSON that exactly matches the supplied schema.
- Generate a unique id for every array item (use stable short ids like exp-1, edu-1, skill-1).
- Preserve factual information; do not invent employers, dates, or metrics.
- Use YYYY-MM for dates when possible, or keep the original format (e.g. Jul 2023, Present).
- For experience summary, keep bullet-style content as plain text with blank lines between logical groups.
- Group skills into categories with keywords arrays.
- Populate every schema field; use empty strings or empty arrays when unknown.`

/**
 * Parses raw resume text into structured ResumeContent using AI.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const body = await request.json()
    const rawText = typeof body.rawText === "string" ? body.rawText.trim() : ""

    if (!rawText || rawText.length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short. Paste or upload a fuller resume." },
        { status: 400 }
      )
    }

    const openrouter = createOpenRouterClient()
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini")

    const { object } = await generateObject({
      model,
      schema: resumeContentSchema,
      system: PARSE_RESUME_PROMPT,
      prompt: `Resume text to parse:\n\n${rawText.slice(0, 50000)}`,
    })

    return NextResponse.json({ content: object })
  } catch (error) {
    console.error("Error in POST /api/parse-resume:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse resume" },
      { status: 500 }
    )
  }
}

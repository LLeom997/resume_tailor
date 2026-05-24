import { createClient } from '@/lib/supabase/server'
import { ProposedResumeChange, ResumeContent, ResumeWorkflowAnalysis } from '@/lib/types'
import { proposedChangeSchema, resumeContentSchema, workflowAnalysisSchema } from '@/lib/resume-ai-schemas'
import { buildResumeExportBaseName, buildVariantNameFromAnalysis } from '@/lib/resume-filename'
import { generateObject } from 'ai'
import { createOpenRouterClient } from '@/lib/openrouter-client'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const RESUME_OPTIMIZATION_GUIDELINES = `You are a professional resume optimization expert specializing in tailoring resumes to specific job descriptions. Your goal is to optimize my resume and provide actionable suggestions for improvement to align with the target role.

Guidelines:
1. Relevance:
- Prioritize experiences, skills, and achievements most relevant to the job description.
- Reorder, rewrite, and de-emphasize less relevant details instead of deleting them.
- Preserve the master resume's overall content depth unless the user explicitly asks for a shorter resume.
- Do not reduce the total resume content by more than 40% compared with the master resume.
- Keep all roles from the master resume by default. Only remove a role if it is clearly irrelevant and the final content would still preserve at least 60% of the master resume.
- Preserve most bullets/impact statements under each role. Condense wording, but do not aggressively cut achievements.

2. Summary Preservation:
- Preserve the depth and positioning strength of the original professional summary.
- Do not overly compress the summary into generic buzzwords.
- Maintain a strong technical and leadership narrative aligned with the candidate’s experience level.
- Keep the summary concise but information-dense, typically 3–5 lines for a one-page resume.
- Prioritize domain expertise, years of experience, technical ownership, cross-functional collaboration, and measurable impact.
- Rewrite the summary for ATS alignment without losing specificity or technical credibility.

3. Action-Driven Results:
- Use strong action verbs and quantifiable results, such as percentages, revenue, and efficiency improvements, to highlight impact.

4. Keyword Optimization:
- Integrate keywords and phrases from the job description naturally to optimize for ATS.
- Do not keyword-stuff or force unnatural phrasing.

5. Additional Suggestions:
- If gaps exist, suggest technical or soft skills that could strengthen alignment.
- Recommend certifications or courses to bridge gaps.
- Suggest specific projects or experiences that would better align with the role.

6. Formatting:
- Prefer the existing two-column layout. If one page is too tight, preserve important content rather than cutting below 60% of the master resume.
- Do not invent experience, metrics, tools, or certifications not supported by the input.`

const ANALYSIS_PROMPT = `${RESUME_OPTIMIZATION_GUIDELINES}

Run this structured workflow:
1. Parse the job description into role, seniority, responsibilities, required skills, and preferred skills.
2. Extract keywords and hiring intent.
3. Compare the job description against the master resume.
4. Return specific proposed resume changes for a user review screen.
5. Include additional suggestions for skills, certifications/courses, and projects if gaps exist.

Rules:
- Return JSON that exactly matches the supplied schema, not Markdown.
- Proposed changes must be grounded in the master resume and job description.
- Prefer high-impact changes that help a two-column resume while preserving content depth.
- Do not propose aggressive deletions. The total proposed reduction must stay under 40% of the master resume content.
- Keep proposed text concise and resume-ready.
- Use stable ids such as change-1, change-2.
- Populate every schema field. Use empty strings for unknown text fields and empty arrays for unknown lists.`

const FINAL_RESUME_PROMPT = `${RESUME_OPTIMIZATION_GUIDELINES}

Generate the final approved resume using only the approved proposed changes and any user inline edits to those changes.

Rules:
- Return JSON that exactly matches the supplied resume schema, not Markdown.
- Preserve factual accuracy from the master resume.
- Optimize for a two-column, one-page PDF.
- Preserve at least 60% of the master resume's content volume.
- Keep all master resume roles by default. Do not reduce to only 2-3 roles unless the master resume already has 2-3 roles or the user explicitly requested a shorter version.
- Keep most role impacts. Tighten wording and reorder relevance, but do not remove more than 40% of the source content.
- Use strong action verbs and supported quantifiable outcomes.
- Incorporate job-description keywords naturally for ATS.
- Do not invent employers, titles, dates, education, certifications, tools, or metrics.
- Populate every schema field; use empty strings for unknown text fields and empty arrays for unknown lists.`

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const body = await request.json()
    const action = body.action || 'analyze'

    if (!body.master_resume_id || !body.job_description) {
      return NextResponse.json(
        { error: 'master_resume_id and job_description are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: masterResume, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', body.master_resume_id)
      .eq('session_id', sessionId)
      .single()

    if (fetchError || !masterResume) {
      return NextResponse.json({ error: 'Master resume not found' }, { status: 404 })
    }

    if (action === 'analyze') {
      const analysis = await analyzeJobDescription(masterResume.content, body.job_description)
      return NextResponse.json({ analysis })
    }

    if (action === 'finalize') {
      const approvedChanges = z.array(proposedChangeSchema).parse(body.approved_changes || [])
      if (approvedChanges.length === 0) {
        return NextResponse.json({ error: 'Approve at least one proposed change' }, { status: 400 })
      }

      const content = await generateFinalResume(
        masterResume.content,
        body.job_description,
        approvedChanges,
        body.analysis
      )

      const analysis = body.analysis as ResumeWorkflowAnalysis | undefined
      const namingInput = buildVariantNameFromAnalysis(analysis, masterResume.content.basics.headline)
      const variantName = buildResumeExportBaseName(namingInput)

      const generatedResume = {
        session_id: sessionId,
        name: variantName,
        content,
        is_master: false,
      }

      const { data: savedResume, error: saveError } = await supabase
        .from('resumes')
        .insert(generatedResume)
        .select()
        .single()

      if (saveError) {
        console.error('Error saving generated resume:', saveError)
        return NextResponse.json({ error: 'Failed to save generated resume' }, { status: 500 })
      }

      await supabase.from('job_applications').insert({
        session_id: sessionId,
        master_resume_id: body.master_resume_id,
        job_description: body.job_description,
        generated_resume_id: savedResume.id,
        ai_suggestions: {
          workflow: 'jd_parse_keyword_intent_gap_suggestions_review_final_resume',
          analysis: body.analysis,
          approved_changes: approvedChanges,
          export_naming: namingInput,
        },
      })

      return NextResponse.json(savedResume, { status: 201 })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/generate-resume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate resume' },
      { status: 500 }
    )
  }
}

async function analyzeJobDescription(
  masterResume: ResumeContent,
  jobDescription: string
): Promise<ResumeWorkflowAnalysis> {
  const openrouterClient = createOpenRouterClient()
  const { object } = await generateObject({
    model: openrouterClient('openai/gpt-4o-mini'),
    system: ANALYSIS_PROMPT,
    prompt: `Master Resume JSON:\n${JSON.stringify(masterResume, null, 2)}\n\nJob Description:\n${jobDescription}`,
    schema: workflowAnalysisSchema,
  })

  return object
}

async function generateFinalResume(
  masterResume: ResumeContent,
  jobDescription: string,
  approvedChanges: ProposedResumeChange[],
  analysis?: ResumeWorkflowAnalysis
): Promise<ResumeContent> {
  const openrouterClient = createOpenRouterClient()
  const { object } = await generateObject({
    model: openrouterClient('openai/gpt-4o-mini'),
    system: FINAL_RESUME_PROMPT,
    prompt: [
      `Master Resume JSON:\n${JSON.stringify(masterResume, null, 2)}`,
      `Job Description:\n${jobDescription}`,
      `Workflow Analysis:\n${JSON.stringify(analysis || {}, null, 2)}`,
      `Approved Proposed Changes:\n${JSON.stringify(approvedChanges, null, 2)}`,
    ].join('\n\n'),
    schema: resumeContentSchema,
  })

  return object
}

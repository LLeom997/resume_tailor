import { createClient } from '@/lib/supabase/server'
import { ProposedResumeChange, ResumeContent, ResumeWorkflowAnalysis } from '@/lib/types'
import { proposedChangeSchema, resumeContentSchema, workflowAnalysisSchema } from '@/lib/resume-ai-schemas'
import { buildResumeExportBaseName, buildMonthYearSuffix, buildVariantNameFromAnalysis } from '@/lib/resume-filename'
import { collectHighlightKeywords } from '@/lib/resume-highlight-terms'
import { ResumeExportMeta } from '@/lib/types'
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
    const sessionId = "default-workspace-session"

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
      const { analysis, performance } = await analyzeJobDescription(masterResume.content, body.job_description, body.model)
      return NextResponse.json({ analysis, performance })
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
      const monthYear = buildMonthYearSuffix()
      const variantName = buildResumeExportBaseName({ ...namingInput, monthYear })

      const highlightKeywords = collectHighlightKeywords(
        analysis,
        approvedChanges.flatMap((change) => change.keywords)
      )

      const exportMeta: ResumeExportMeta = {
        company: namingInput.company,
        role: namingInput.role,
        monthYear,
        keywords: highlightKeywords,
        profile_id: body.profile_id || null,
        profile_name: body.profile_name || null,
      }

      const generatedResume: Record<string, unknown> = {
        session_id: sessionId,
        name: variantName,
        content,
        is_master: false,
        export_meta: exportMeta,
      }

      if (body.profile_id) {
        generatedResume.profile_id = body.profile_id
      }

      const { data: savedResume, error: saveError } = await supabase
        .from('resumes')
        .insert(generatedResume)
        .select()
        .single()

      if (saveError) {
        const fallbackResume = {
          session_id: sessionId,
          name: variantName,
          content,
          is_master: false,
        }
        const { data: fallbackSaved, error: fallbackError } = await supabase
          .from('resumes')
          .insert(fallbackResume)
          .select()
          .single()

        if (fallbackError) {
          console.error('Error saving generated resume:', saveError, fallbackError)
          return NextResponse.json({ error: 'Failed to save generated resume' }, { status: 500 })
        }

        // Also save to resume_variations for Workspace OS tracking if profile_id is provided
        if (body.profile_id) {
          try {
            await supabase.from('resume_variations').insert({
              id: fallbackSaved.id,
              session_id: sessionId,
              persona_id: body.profile_id,
              master_resume_id: body.master_resume_id || null,
              company_name: namingInput.company || 'Company',
              role_title: namingInput.role || 'Role',
              status: 'tailored',
              version: 1,
              jd_text: body.job_description || '',
              resume_content: content,
              status_updated_at: new Date().toISOString(),
            })

            await supabase.from('resume_activity').insert({
              session_id: sessionId,
              persona_id: body.profile_id,
              variation_id: fallbackSaved.id,
              action_type: 'optimize',
              metadata: {
                company: namingInput.company,
                role: namingInput.role,
              },
            })
          } catch (varError) {
            console.warn('Failed to insert fallback resume variation:', varError)
          }
        }

        await supabase.from('job_applications').insert({
          session_id: sessionId,
          master_resume_id: body.master_resume_id,
          job_description: body.job_description,
          generated_resume_id: fallbackSaved.id,
          ai_suggestions: {
            workflow: 'jd_parse_keyword_intent_gap_suggestions_review_final_resume',
            analysis: body.analysis,
            approved_changes: approvedChanges,
            export_naming: namingInput,
            export_meta: exportMeta,
            highlight_keywords: highlightKeywords,
          },
        })

        return NextResponse.json(
          {
            ...fallbackSaved,
            export_meta: exportMeta,
          },
          { status: 201 }
        )
      }

      // Also save to resume_variations for Workspace OS tracking if profile_id is provided
      if (body.profile_id) {
        try {
          await supabase.from('resume_variations').insert({
            id: savedResume.id,
            session_id: sessionId,
            persona_id: body.profile_id,
            master_resume_id: body.master_resume_id || null,
            company_name: namingInput.company || 'Company',
            role_title: namingInput.role || 'Role',
            status: 'tailored',
            version: 1,
            jd_text: body.job_description || '',
            resume_content: content,
            status_updated_at: new Date().toISOString(),
          })

          await supabase.from('resume_activity').insert({
            session_id: sessionId,
            persona_id: body.profile_id,
            variation_id: savedResume.id,
            action_type: 'optimize',
            metadata: {
              company: namingInput.company,
              role: namingInput.role,
            },
          })
        } catch (varError) {
          console.warn('Failed to insert resume variation:', varError)
        }
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
          export_meta: exportMeta,
          highlight_keywords: highlightKeywords,
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
  jobDescription: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<{ analysis: ResumeWorkflowAnalysis; performance: any }> {
  const openrouterClient = createOpenRouterClient()
  const startTime = Date.now()
  const { object, usage } = await generateObject({
    model: openrouterClient(model),
    system: ANALYSIS_PROMPT,
    prompt: `Master Resume JSON:\n${JSON.stringify(masterResume, null, 2)}\n\nJob Description:\n${jobDescription}`,
    schema: workflowAnalysisSchema,
  })
  const endTime = Date.now()
  const latencyMs = endTime - startTime
  const latencySec = latencyMs / 1000
  const speed = usage ? Math.round((usage as any).totalTokens / latencySec) : 0

  return {
    analysis: object,
    performance: {
      model,
      latency: latencySec.toFixed(1) + 's',
      promptTokens: (usage as any)?.promptTokens || 0,
      completionTokens: (usage as any)?.completionTokens || 0,
      totalTokens: (usage as any)?.totalTokens || 0,
      speed: speed + ' t/s'
    }
  }
}

async function generateFinalResume(
  masterResume: ResumeContent,
  jobDescription: string,
  approvedChanges: any[],
  analysis?: any
): Promise<ResumeContent> {
  // 1. Deep clone the master resume content to guarantee 100% item retention
  const finalResume: ResumeContent = JSON.parse(JSON.stringify(masterResume))

  // 2. Normalize and format bullet point headers to bold label format if needed
  const formatBulletLabel = (bulletText: string): string => {
    const trimmed = bulletText.trim()
    // Check if the bullet starts with a header followed by a colon (e.g. "FEA Validation: Led structural...")
    // and doesn't already contain the visual split separator " - "
    const colonMatch = trimmed.match(/^([^:]+):\s+(.+)$/)
    if (colonMatch && !trimmed.includes(" - ")) {
      const header = colonMatch[1].trim()
      const body = colonMatch[2].trim()
      return `${header} - ${body}`
    }
    return trimmed
  }

  // Helper to format all summaries/descriptions in the cloned resume
  if (finalResume.summary) {
    finalResume.summary = finalResume.summary.split('\n').map(formatBulletLabel).join('\n')
  }

  if (finalResume.experience) {
    finalResume.experience.forEach(exp => {
      if (exp.summary) {
        exp.summary = exp.summary.split('\n').map(formatBulletLabel).join('\n')
      }
    })
  }

  if (finalResume.projects) {
    finalResume.projects.forEach(proj => {
      if (proj.description) {
        proj.description = formatBulletLabel(proj.description)
      }
    })
  }

  // 3. Programmatically apply each approved proposed change
  for (const change of approvedChanges) {
    const section = change.section
    const current = change.currentText.trim()
    const proposed = formatBulletLabel(change.proposedText.trim())

    if (section === 'summary') {
      if (finalResume.summary && finalResume.summary.includes(current)) {
        finalResume.summary = finalResume.summary.replace(current, proposed)
      } else {
        finalResume.summary = proposed
      }
    } else if (section === 'experience' && finalResume.experience) {
      for (const exp of finalResume.experience) {
        if (exp.summary) {
          const lines = exp.summary.split('\n')
          const index = lines.findIndex(line => {
            const cleanLine = line.trim().replace(/^[-*•\s]+/, '')
            const cleanCurrent = current.replace(/^[-*•\s]+/, '')
            return cleanLine.includes(cleanCurrent) || cleanCurrent.includes(cleanLine)
          })

          if (index !== -1) {
            const symbolMatch = lines[index].match(/^([-*•\s]+)/)
            const symbol = symbolMatch ? symbolMatch[1] : ''
            lines[index] = `${symbol}${proposed}`
            exp.summary = lines.join('\n')
            break
          } else if (exp.summary.includes(current)) {
            exp.summary = exp.summary.replace(current, proposed)
            break
          }
        }
      }
    } else if (section === 'projects' && finalResume.projects) {
      for (const proj of finalResume.projects) {
        if (proj.description) {
          if (proj.description.includes(current)) {
            proj.description = proj.description.replace(current, proposed)
            break
          }
        }
      }
    } else if (section === 'skills' && finalResume.skills) {
      for (const skill of finalResume.skills) {
        if (skill.name.toLowerCase() === current.toLowerCase()) {
          skill.name = proposed
          break
        }
        const kwIndex = skill.keywords.findIndex(kw => kw.toLowerCase() === current.toLowerCase())
        if (kwIndex !== -1) {
          skill.keywords[kwIndex] = proposed
          break
        }
      }
    }
  }

  return finalResume
}

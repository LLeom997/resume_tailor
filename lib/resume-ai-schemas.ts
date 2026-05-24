import { z } from 'zod'

export const resumeContentSchema = z.object({
  basics: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    website: z.string(),
    picture: z.string(),
  }),
  summary: z.string(),
  experience: z.array(z.object({
    id: z.string(),
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    summary: z.string(),
  })),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string(),
    studyType: z.string(),
    area: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.string(),
    keywords: z.array(z.string()),
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  languages: z.array(z.string()),
})

export const proposedChangeSchema = z.object({
  id: z.string(),
  section: z.string(),
  type: z.enum(['add', 'rewrite', 'reorder', 'emphasize', 'remove']),
  priority: z.enum(['high', 'medium', 'low']),
  currentText: z.string(),
  proposedText: z.string(),
  rationale: z.string(),
  keywords: z.array(z.string()),
})

export const workflowAnalysisSchema = z.object({
  jdParser: z.object({
    targetRole: z.string(),
    company: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requiredSkills: z.array(z.string()),
    preferredSkills: z.array(z.string()),
  }),
  keywordExtraction: z.object({
    hardSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    domainKeywords: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  intentExtraction: z.object({
    hiringIntent: z.string(),
    roleFocus: z.array(z.string()),
    successSignals: z.array(z.string()),
  }),
  gapAnalysis: z.object({
    matchedStrengths: z.array(z.string()),
    missingOrWeakSignals: z.array(z.string()),
    risks: z.array(z.string()),
  }),
  additionalSuggestions: z.object({
    skills: z.array(z.string()),
    certifications: z.array(z.string()),
    projects: z.array(z.string()),
  }),
  proposedChanges: z.array(proposedChangeSchema).min(1).max(12),
})

export type ResumeContentOutput = z.infer<typeof resumeContentSchema>
export type ProposedChangeOutput = z.infer<typeof proposedChangeSchema>
export type WorkflowAnalysisOutput = z.infer<typeof workflowAnalysisSchema>

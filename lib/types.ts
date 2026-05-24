export interface ResumeContent {
  basics: {
    name: string
    headline: string
    email: string
    phone: string
    location: string
    website: string
    picture: string
  }
  summary: string
  experience: Array<{
    id: string
    company: string
    position: string
    startDate: string
    endDate: string
    summary: string
  }>
  education: Array<{
    id: string
    institution: string
    studyType: string
    area: string
    startDate: string
    endDate: string
  }>
  skills: Array<{
    id: string
    name: string
    level: string
    keywords: string[]
  }>
  projects: Array<{
    id: string
    name: string
    description: string
    url: string
    startDate: string
    endDate: string
  }>
  certifications: Array<{
    id: string
    name: string
  }>
  languages: string[]
}

export interface ResumeExportMeta {
  company: string
  role: string
  monthYear: string
  keywords: string[]
  profile_id?: string | null
  profile_name?: string | null
}

export interface CareerProfile {
  id: string
  session_id: string
  name: string
  slug: string
  description: string | null
  master_resume_id: string | null
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  session_id: string
  name: string
  content: ResumeContent
  is_master: boolean
  profile_id?: string | null
  export_meta?: ResumeExportMeta | null
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  session_id: string
  master_resume_id: string
  job_description: string
  generated_resume_id?: string
  ai_suggestions?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GenerateResumeRequest {
  master_resume_id: string
  job_description: string
}

export interface GenerateResumeResponse {
  success: boolean
  resume?: Resume
  error?: string
}

export interface ProposedResumeChange {
  id: string
  section: string
  type: 'add' | 'rewrite' | 'reorder' | 'emphasize' | 'remove'
  priority: 'high' | 'medium' | 'low'
  currentText: string
  proposedText: string
  rationale: string
  keywords: string[]
}

export interface ResumeWorkflowAnalysis {
  jdParser: {
    targetRole: string
    company: string
    seniority: string
    responsibilities: string[]
    requiredSkills: string[]
    preferredSkills: string[]
  }
  keywordExtraction: {
    hardSkills: string[]
    softSkills: string[]
    domainKeywords: string[]
    tools: string[]
  }
  intentExtraction: {
    hiringIntent: string
    roleFocus: string[]
    successSignals: string[]
  }
  gapAnalysis: {
    matchedStrengths: string[]
    missingOrWeakSignals: string[]
    risks: string[]
  }
  additionalSuggestions: {
    skills: string[]
    certifications: string[]
    projects: string[]
  }
  proposedChanges: ProposedResumeChange[]
}

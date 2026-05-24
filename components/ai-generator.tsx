'use client'

import { useEffect, useState } from 'react'
import { CareerProfile, ProposedResumeChange, Resume, ResumeWorkflowAnalysis } from '@/lib/types'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { InteractiveProgress } from '@/components/interactive-progress'
import { useWorkspaceStore } from '@/hooks/use-workspace-store'

interface AIGeneratorProps {
  masterResume: Resume
  profileId?: string
  onGenerateComplete?: (generatedResume: Resume) => void
}

export function AIGenerator({ masterResume, profileId: initialProfileId, onGenerateComplete }: AIGeneratorProps) {
  const { sessionId } = useSession()
  const [jobDescription, setJobDescription] = useState('')
  const [profiles, setProfiles] = useState<CareerProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState(initialProfileId || '')
  const [analysis, setAnalysis] = useState<ResumeWorkflowAnalysis | null>(null)
  const [approvedChangeIds, setApprovedChangeIds] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzeCompleted, setIsAnalyzeCompleted] = useState(false)
  const [isGenerateCompleted, setIsGenerateCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const store = useWorkspaceStore()
  const activeTask = store.activeTask

  useEffect(() => {
    if (!activeTask) return

    if (activeTask.type === 'analyze') {
      if (activeTask.status === 'running') {
        setIsAnalyzing(true)
        setIsAnalyzeCompleted(false)
      } else if (activeTask.status === 'completed') {
        setIsAnalyzeCompleted(true)
        if (activeTask.metadata?.analysis) {
          setAnalysis(activeTask.metadata.analysis)
          if (activeTask.metadata.jobDescription) {
            setJobDescription(activeTask.metadata.jobDescription)
          }
          setApprovedChangeIds(new Set(activeTask.metadata.analysis.proposedChanges.map((c: any) => c.id)))
        }
      } else if (activeTask.status === 'error') {
        setIsAnalyzeCompleted(true)
        setError(activeTask.metadata?.error || 'Analysis failed')
      }
    } else if (activeTask.type === 'generate') {
      if (activeTask.status === 'running') {
        setIsGenerating(true)
        setIsGenerateCompleted(false)
      } else if (activeTask.status === 'completed') {
        setIsGenerateCompleted(true)
        if (activeTask.metadata?.generatedResume) {
          onGenerateComplete?.(activeTask.metadata.generatedResume)
          store.dismissTask()
        }
      } else if (activeTask.status === 'error') {
        setIsGenerateCompleted(true)
        setError(activeTask.metadata?.error || 'Generation failed')
      }
    }
  }, [activeTask])

  useEffect(() => {
    if (!sessionId) return

    const loadProfiles = async () => {
      try {
        const response = await fetch('/api/personas', {
          headers: { 'x-session-id': sessionId },
        })
        if (response.ok) {
          const data: CareerProfile[] = await response.json()
          setProfiles(data)
          if (initialProfileId) {
            setSelectedProfileId(initialProfileId)
          } else if (data.length > 0) {
            setSelectedProfileId(data[0].id)
          }
        }
      } catch (loadError) {
        console.error('Error loading profiles:', loadError)
      }
    }

    loadProfiles()
  }, [sessionId, initialProfileId])

  const handleAnalyze = async () => {
    if (!sessionId || !jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setIsAnalyzeCompleted(false)
    store.runAnalyzeJob(sessionId, masterResume.id, jobDescription)
  }

  const handleFinalize = async () => {
    if (!sessionId || !analysis) return

    const approvedChanges = analysis.proposedChanges.filter((change) => approvedChangeIds.has(change.id))
    if (approvedChanges.length === 0) {
      setError('Approve at least one proposed change before generating the final resume')
      return
    }

    setError(null)
    setIsGenerating(true)
    setIsGenerateCompleted(false)
    
    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId)
    store.runFinalizeJob(
      sessionId,
      masterResume.id,
      jobDescription,
      analysis,
      approvedChanges,
      selectedProfileId || null,
      selectedProfile?.name || null
    )
  }

  const toggleChange = (id: string) => {
    const next = new Set(approvedChangeIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setApprovedChangeIds(next)
  }

  const updateProposedChangeText = (id: string, proposedText: string) => {
    if (!analysis) return

    setAnalysis({
      ...analysis,
      proposedChanges: analysis.proposedChanges.map((change) =>
        change.id === id ? { ...change, proposedText } : change
      ),
    })
  }

  const resetWorkflow = () => {
    setAnalysis(null)
    setApprovedChangeIds(new Set())
    setError(null)
  }

  return (
    <>
      {isAnalyzing && (
        <InteractiveProgress
          title="Analyzing Job Description"
          subtitle="AI is scanning JD parameters, extracting domain keywords, and identifying gaps"
          isCompleted={isAnalyzeCompleted}
          onClose={() => {
            setIsAnalyzing(false)
            store.dismissTask()
          }}
          onMinimize={() => setIsAnalyzing(false)}
          estimatedDurationMs={9000}
        />
      )}
      {isGenerating && (
        <InteractiveProgress
          title="Synthesizing Tailored Resume"
          subtitle="AI is assembling approved modifications and building print-perfect layout structures"
          isCompleted={isGenerateCompleted}
          onClose={() => {
            setIsGenerating(false)
            store.dismissTask()
          }}
          onMinimize={() => setIsGenerating(false)}
          estimatedDurationMs={7000}
        />
      )}
      <Card>
      <CardHeader>
        <CardTitle>AI Resume Tailor</CardTitle>
        <CardDescription>
          Master resume plus job description becomes a reviewed, approved, two-column PDF-ready resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <WorkflowBar activeStep={analysis ? 6 : 1} />

        {!analysis ? (
          <div className="space-y-4">
            {profiles.length > 0 && (
              <div>
                <label className="text-sm font-medium">Career profile</label>
                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  disabled={isAnalyzing}
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Job Description</label>
              <Textarea
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value)
                  setError(null)
                }}
                placeholder="Paste the complete job description here..."
                rows={10}
                disabled={isAnalyzing}
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jobDescription.trim()}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing JD and building proposed changes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze JD and Review Changes
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <AnalysisSummary analysis={analysis} />
            <ProposedChanges
              changes={analysis.proposedChanges}
              approvedChangeIds={approvedChangeIds}
              onToggle={toggleChange}
              onUpdateText={updateProposedChangeText}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={resetWorkflow} disabled={isGenerating} className="sm:w-auto">
                <RotateCcw className="w-4 h-4 mr-2" />
                Edit JD
              </Button>
              <Button onClick={handleFinalize} disabled={isGenerating} className="flex-1">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating final resume...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Generate Final Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}

function WorkflowBar({ activeStep }: { activeStep: number }) {
  const steps = ['Master Resume', 'JD Parser', 'Keywords + Intent', 'Gap Analysis', 'Suggestions', 'Review', 'Final PDF']

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {steps.map((step, index) => {
        const isActive = index + 1 <= activeStep
        return (
          <div
            key={step}
            className={`rounded-md border px-2 py-2 text-center text-[11px] font-medium ${
              isActive ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500'
            }`}
          >
            {step}
          </div>
        )
      })}
    </div>
  )
}

function AnalysisSummary({ analysis }: { analysis: ResumeWorkflowAnalysis }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SummaryBlock
        title="JD Parser"
        lines={[
          `Role: ${analysis.jdParser.targetRole}`,
          `Seniority: ${analysis.jdParser.seniority}`,
          ...analysis.jdParser.responsibilities.slice(0, 3),
        ]}
      />
      <SummaryBlock
        title="Keyword + Intent Extraction"
        lines={[
          ...analysis.keywordExtraction.hardSkills.slice(0, 5),
          ...analysis.keywordExtraction.tools.slice(0, 4),
          analysis.intentExtraction.hiringIntent,
        ]}
      />
      <SummaryBlock title="Matched Strengths" lines={analysis.gapAnalysis.matchedStrengths.slice(0, 5)} />
      <SummaryBlock title="Gaps / Weak Signals" lines={analysis.gapAnalysis.missingOrWeakSignals.slice(0, 5)} />
      <SummaryBlock
        title="Additional Suggestions"
        lines={[
          ...analysis.additionalSuggestions.skills.slice(0, 3),
          ...analysis.additionalSuggestions.certifications.slice(0, 2),
          ...analysis.additionalSuggestions.projects.slice(0, 2),
        ]}
      />
    </div>
  )
}

function SummaryBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <p className="text-sm font-semibold text-zinc-950">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-zinc-600">
        {lines.filter(Boolean).map((line, index) => (
          <li key={`${title}-${index}-${line}`}>- {line}</li>
        ))}
      </ul>
    </div>
  )
}

function ProposedChanges({
  changes,
  approvedChangeIds,
  onToggle,
  onUpdateText,
}: {
  changes: ProposedResumeChange[]
  approvedChangeIds: Set<string>
  onToggle: (id: string) => void
  onUpdateText: (id: string, proposedText: string) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Proposed Changes Review</h2>
        <p className="text-sm text-zinc-500">{approvedChangeIds.size} approved</p>
      </div>
      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Variants preserve the master resume by default. Avoid approving removal-heavy edits unless you explicitly want a shorter resume; final generation is instructed not to reduce source content by more than 40%.
      </div>
      <div className="space-y-3">
        {changes.map((change) => (
          <div key={change.id} className="rounded-md border border-zinc-200 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={approvedChangeIds.has(change.id)}
                onCheckedChange={() => onToggle(change.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-950">{change.section}</p>
                  <Badge variant="secondary">{change.type}</Badge>
                  <Badge variant={change.priority === 'high' ? 'default' : 'outline'}>{change.priority}</Badge>
                </div>
                {change.currentText && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Current: {change.currentText}
                  </p>
                )}
                <div className="mt-2">
                  <label className="text-xs font-medium text-zinc-500">Proposed edit</label>
                  <Textarea
                    value={change.proposedText}
                    onChange={(event) => onUpdateText(change.id, event.target.value)}
                    className="mt-1 min-h-20 text-sm"
                  />
                </div>
                <p className="mt-2 text-sm text-zinc-600">Why: {change.rationale}</p>
                {change.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {change.keywords.map((keyword, index) => (
                      <span key={`${change.id}-${index}-${keyword}`} className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

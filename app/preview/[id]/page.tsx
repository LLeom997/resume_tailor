'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Resume } from '@/lib/types'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Printer, ChevronDown, ChevronUp, History, Settings, Sparkles, Send, Check, Undo2 } from 'lucide-react'
import { exportResumePdf } from '@/lib/export-resume-pdf'
import { applyResumeScale, clearResumeScale } from '@/lib/resume-export-scale'
import {
  buildResumeExportBaseName,
  buildResumeExportFileName,
  parseResumeExportBaseName,
  sanitizeFilePart,
} from '@/lib/resume-filename'

export default function PreviewPage() {
  const router = useRouter()
  const params = useParams()
  const { sessionId, isLoading } = useSession()
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoadingResume, setIsLoadingResume] = useState(true)
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic')
  const [companyName, setCompanyName] = useState('')
  const [roleName, setRoleName] = useState('')
  const [monthYear, setMonthYear] = useState('')
  const [highlightKeywords, setHighlightKeywords] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const skipAutoSaveRef = useRef(true)

  const id = params.id as string

  const [activeTab, setActiveTab] = useState<'edit' | 'ai' | 'history'>('edit')
  const [historyList, setHistoryList] = useState<any[]>([])
  
  // Basic states for editing sections
  const [editedBasics, setEditedBasics] = useState<any>(null)
  const [editedSummary, setEditedSummary] = useState("")
  const [editedSkills, setEditedSkills] = useState<any[]>([])
  const [editedExperience, setEditedExperience] = useState<any[]>([])
  const [editedProjects, setEditedProjects] = useState<any[]>([])
  
  // AI Co-Pilot states
  const [aiTarget, setAiTarget] = useState<string>('summary')
  const [aiPrompt, setAiPrompt] = useState<string>('')
  const [aiIsGenerating, setAiIsGenerating] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // ATS Keyword Highlights states
  const [isKeywordHighlightActive, setIsKeywordHighlightActive] = useState(true)
  const [newKeywordInput, setNewKeywordInput] = useState('')

  // Section expand toggle
  const [expandedSection, setExpandedSection] = useState<string | null>('basics')

  useEffect(() => {
    if (!sessionId || isLoading || !id) return

    fetchResume()
  }, [sessionId, isLoading, id])

  const fetchResume = async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/resumes/${id}`, {
        headers: {
          'x-session-id': sessionId,
        },
      })

      if (response.ok) {
        const data: Resume = await response.json()
        setResume(data)
        skipAutoSaveRef.current = true

        if (!data.is_master) {
          const meta = data.export_meta
          if (meta) {
            setCompanyName(meta.company)
            setRoleName(meta.role)
            setMonthYear(meta.monthYear)
            setHighlightKeywords(meta.keywords || [])
          } else {
            const parsed = parseResumeExportBaseName(data.name)
            if (parsed) {
              setCompanyName(parsed.company)
              setRoleName(parsed.role)
              setMonthYear(parsed.monthYear)
            }
          }
        }
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching resume:', error)
      router.push('/dashboard')
    } finally {
      setIsLoadingResume(false)
      setTimeout(() => {
        skipAutoSaveRef.current = false
      }, 0)
    }
  }
  // Set up initial edit states and fetch history log when resume loads
  useEffect(() => {
    if (resume) {
      setEditedBasics(resume.content.basics || { name: '', email: '', phone: '', location: '', website: '', headline: '' })
      setEditedSummary(resume.content.summary || '')
      setEditedSkills(resume.content.skills || [])
      setEditedExperience(resume.content.experience || [])
      setEditedProjects(resume.content.projects || [])
      fetchHistory()
    }
  }, [resume])

  const fetchHistory = async () => {
    if (!sessionId || !id) return
    try {
      const res = await fetch(`/api/resumes/${id}/history`, {
        headers: { 'x-session-id': sessionId }
      })
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveSectionChanges = async (sectionName: string, updatedContent: any, description: string) => {
    if (!sessionId || !resume) return
    
    // Construct the new full resume content
    const newContent = {
      ...resume.content,
      ...updatedContent
    }

    setSaveStatus('saving')
    try {
      // 1. Save updated resume content to database
      const resumeRes = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          name: resume.name,
          content: newContent,
          export_meta: resume.export_meta
        })
      })

      if (!resumeRes.ok) {
        throw new Error('Failed to update resume content')
      }

      const updatedResume = await resumeRes.json()
      
      // 2. Save history entry to database
      await fetch(`/api/resumes/${resume.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          change_description: description,
          previous_content: resume.content,
          new_content: newContent
        })
      })

      // Update state and refresh history timeline
      setResume(updatedResume)
      setSaveStatus('saved')
      fetchHistory()
    } catch (error) {
      console.error('Failed to save section changes:', error)
      setSaveStatus('error')
    }
  }

  const handleSaveBasics = () => {
    saveSectionChanges('basics', { basics: editedBasics }, 'Updated contact details and headline')
  }

  const handleSaveSummary = () => {
    saveSectionChanges('summary', { summary: editedSummary }, 'Updated professional summary description')
  }

  const handleSaveSkills = (skillId: string, index: number, field: 'name' | 'keywords', value: string) => {
    const updated = editedSkills.map((s) => {
      if (s.id === skillId) {
        if (field === 'keywords') {
          return { ...s, keywords: value.split(',').map(k => k.trim()).filter(Boolean) }
        }
        return { ...s, [field]: value }
      }
      return s
    })
    setEditedSkills(updated)
  }

  const handleCommitSkills = () => {
    saveSectionChanges('skills', { skills: editedSkills }, 'Updated technical proficiency skill groups')
  }

  const handleSaveExperience = (expId: string, value: string) => {
    const updated = editedExperience.map((e) => {
      if (e.id === expId) {
        return { ...e, summary: value }
      }
      return e
    })
    setEditedExperience(updated)
  }

  const handleCommitExperience = (expCompany: string) => {
    saveSectionChanges('experience', { experience: editedExperience }, `Updated work experience description for ${expCompany}`)
  }

  const handleSaveProjects = (projId: string, value: string) => {
    const updated = editedProjects.map((p) => {
      if (p.id === projId) {
        return { ...p, description: value }
      }
      return p
    })
    setEditedProjects(updated)
  }

  const handleCommitProjects = (projName: string) => {
    saveSectionChanges('projects', { projects: editedProjects }, `Updated project description for ${projName}`)
  }

  const handleRestoreVersion = async (historyItem: any) => {
    if (!sessionId || !resume) return
    const confirmRestore = confirm(`Are you sure you want to restore the resume to this version ("${historyItem.change_description}")?`)
    if (!confirmRestore) return

    setSaveStatus('saving')
    try {
      // 1. Save restored content to resumes table
      const resumeRes = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          name: resume.name,
          content: historyItem.new_content,
          export_meta: resume.export_meta
        })
      })

      if (!resumeRes.ok) {
        throw new Error('Failed to restore resume content')
      }

      const updatedResume = await resumeRes.json()

      // 2. Log a restoration action in the history table
      await fetch(`/api/resumes/${resume.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          change_description: `Restored to version: "${historyItem.change_description}"`,
          previous_content: resume.content,
          new_content: historyItem.new_content
        })
      })

      setResume(updatedResume)
      setSaveStatus('saved')
      fetchHistory()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAiRewrite = async () => {
    if (!sessionId) return
    setAiIsGenerating(true)
    setAiError(null)
    setAiSuggestion(null)

    let currentText = ''
    if (aiTarget === 'summary') {
      currentText = editedSummary
    } else if (aiTarget.startsWith('experience-')) {
      const id = aiTarget.replace('experience-', '')
      currentText = editedExperience.find(e => e.id === id)?.summary || ''
    } else if (aiTarget.startsWith('projects-')) {
      const id = aiTarget.replace('projects-', '')
      currentText = editedProjects.find(p => p.id === id)?.description || ''
    }

    try {
      const response = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          text: currentText,
          instruction: aiPrompt,
          context: resume?.jd_text || ''
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rewrite')
      }

      setAiSuggestion(data.rewrittenText)
    } catch (e: any) {
      console.error(e)
      setAiError(e.message || 'Error occurred while calling AI rewrite API')
    } finally {
      setAiIsGenerating(false)
    }
  }

  const handleApplyAiRewrite = () => {
    if (!aiSuggestion) return

    if (aiTarget === 'summary') {
      setEditedSummary(aiSuggestion)
      saveSectionChanges('summary', { summary: aiSuggestion }, 'AI Rewrite: Professional Summary')
    } else if (aiTarget.startsWith('experience-')) {
      const id = aiTarget.replace('experience-', '')
      const expItem = editedExperience.find(e => e.id === id)
      const company = expItem?.company || 'Company'
      const updated = editedExperience.map((e) => {
        if (e.id === id) {
          return { ...e, summary: aiSuggestion }
        }
        return e
      })
      setEditedExperience(updated)
      saveSectionChanges('experience', { experience: updated }, `AI Rewrite: Work Experience at ${company}`)
    } else if (aiTarget.startsWith('projects-')) {
      const id = aiTarget.replace('projects-', '')
      const projItem = editedProjects.find(p => p.id === id)
      const name = projItem?.name || 'Project'
      const updated = editedProjects.map((p) => {
        if (p.id === id) {
          return { ...p, description: aiSuggestion }
        }
        return p
      })
      setEditedProjects(updated)
      saveSectionChanges('projects', { projects: updated }, `AI Rewrite: Project ${name}`)
    }

    setAiSuggestion(null)
    setAiPrompt('')
  }

  const handleAddKeyword = async () => {
    if (!newKeywordInput.trim() || !resume) return
    const cleaned = newKeywordInput.trim()
    if (highlightKeywords.includes(cleaned)) {
      setNewKeywordInput('')
      return
    }

    const updatedKeywords = [...highlightKeywords, cleaned]
    setHighlightKeywords(updatedKeywords)
    setNewKeywordInput('')

    await saveKeywordsToDb(updatedKeywords)
  }

  const handleRemoveKeyword = async (keywordToRemove: string) => {
    if (!resume) return
    const updatedKeywords = highlightKeywords.filter(k => k !== keywordToRemove)
    setHighlightKeywords(updatedKeywords)

    await saveKeywordsToDb(updatedKeywords)
  }

  const saveKeywordsToDb = async (updatedKeywords: string[]) => {
    if (!sessionId || !resume) return
    
    const currentMeta = resume.export_meta || {}
    const updatedMeta = {
      ...currentMeta,
      keywords: updatedKeywords
    }

    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          name: resume.name,
          content: resume.content,
          export_meta: updatedMeta,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save keywords')
      }

      const updatedResume = await response.json()
      setResume(updatedResume)
      setSaveStatus('saved')
    } catch (e) {
      console.error(e)
      setSaveStatus('error')
    }
  }

  const saveVariantName = useCallback(async () => {
    if (!sessionId || !resume || resume.is_master) return

    const company = companyName.trim() || 'Company'
    const role = roleName.trim() || resume.content.basics.headline.split('|')[0]?.trim() || 'Role'
    const resolvedMonthYear = monthYear || parseResumeExportBaseName(resume.name)?.monthYear || ''
    const newName = buildResumeExportBaseName({ company, role, monthYear: resolvedMonthYear })

    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          name: newName,
          content: resume.content,
          export_meta: {
            company,
            role,
            monthYear: resolvedMonthYear,
            keywords: highlightKeywords,
            profile_id: resume.export_meta?.profile_id ?? resume.profile_id ?? null,
            profile_name: resume.export_meta?.profile_name ?? null,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save resume name')
      }

      const updated = await response.json()
      setResume(updated)
      setSaveStatus('saved')
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveStatus('error')
    }
  }, [sessionId, resume, companyName, roleName, monthYear, highlightKeywords])


  const createFileName = () => {
    if (!resume) return

    if (resume.is_master) {
      const namePart = sanitizeFilePart(resume.content.basics.name || 'Master')
      return `${namePart}_Master_Resume.pdf`
    }

    const company = companyName.trim() || 'Company'
    const role = roleName.trim() || resume.content.basics.headline.split('|')[0]?.trim() || 'Role'

    return buildResumeExportFileName({ company, role, monthYear: monthYear || undefined })
  }

  const handleDownload = async () => {
    const resumeElement = document.getElementById('resume-document')
    const filename = createFileName()
    if (!resumeElement || !resume || !filename) return

    setIsDownloading(true)
    setDownloadError(null)
    try {
      await exportResumePdf({ element: resumeElement, filename })
    } catch (error) {
      console.error('PDF download failed:', error)
      setDownloadError(
        error instanceof Error ? error.message : 'PDF download failed. Please try again or use Print.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    const resumeElement = document.getElementById('resume-document')
    if (!resumeElement) {
      window.print()
      return
    }

    applyResumeScale(resumeElement)

    const cleanup = () => {
      clearResumeScale(resumeElement)
      window.removeEventListener('afterprint', cleanup)
    }

    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  if (isLoading || isLoadingResume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Resume not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 bg-white rounded-lg shadow p-5 sticky top-0 z-10 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{resume.name}</h1>
                <p className="text-sm text-zinc-500">
                  Preview and export final resume
                  {resume.export_meta?.profile_name && (
                    <span> · Profile: {resume.export_meta.profile_name}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Preparing...' : 'PDF Download'}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {!resume.is_master && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="grid gap-3 md:grid-cols-2 flex-1 min-w-[280px]">
                <Input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Company for file name"
                />
                <Input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="Role for file name"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={saveVariantName} 
                  disabled={saveStatus === 'saving'}
                  variant="secondary"
                  size="sm"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Update Name'}
                </Button>
                <div className="text-xs text-zinc-500 min-w-[80px]">
                  {saveStatus === 'saving' && <span className="text-zinc-500">Saving...</span>}
                  {saveStatus === 'saved' && <span className="text-green-600 font-medium">✓ Saved</span>}
                  {saveStatus === 'error' && <span className="text-red-600 font-medium">✗ Failed</span>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={template === 'classic' ? 'default' : 'outline'}
              onClick={() => setTemplate('classic')}
            >
              Minimal
            </Button>
            <Button
              variant={template === 'modern' ? 'default' : 'outline'}
              onClick={() => setTemplate('modern')}
            >
              Enhanced
            </Button>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2 text-sm">
            {sectionLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 text-xs text-zinc-500">
            File pattern: {createFileName()}
            {!resume.is_master && highlightKeywords.length > 0 && (
              <span> · Keywords & KPIs highlighted in preview</span>
            )}
          </div>
          {downloadError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {downloadError}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Main Resume Sheet Preview on the left/center (takes 2 cols on lg screens) */}
          <div
            id="resume-print-root"
            className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden print:rounded-none print:shadow-none print:overflow-hidden"
          >
            <div className="print:p-0 p-4 flex justify-center">
              <ResumePreview
                content={resume.content}
                template={template}
                highlightKeywords={!resume.is_master && isKeywordHighlightActive ? highlightKeywords : []}
              />
            </div>
          </div>
          
          {/* Live Section Editor & Change History Sidebar on the right */}
          <div className="space-y-6 print:hidden">
            <Card className="shadow-sm border-zinc-200 bg-white">
              <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-800">Workspace Editor</CardTitle>
                  <CardDescription className="text-[10px] mt-0.5 font-medium">Refine resume details with AI or snapshot logs</CardDescription>
                </div>
                <div className="flex bg-zinc-100 p-0.5 rounded-md border border-zinc-200">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`text-xs px-2 py-1 rounded-sm font-medium transition-all cursor-pointer ${
                      activeTab === 'edit'
                        ? 'bg-white shadow-xs text-zinc-900 font-semibold border border-zinc-150'
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`text-xs px-2 py-1 rounded-sm font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      activeTab === 'ai'
                        ? 'bg-white shadow-xs text-zinc-900 font-semibold border border-zinc-150'
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" /> AI Assist
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`text-xs px-2 py-1 rounded-sm font-medium transition-all cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-white shadow-xs text-zinc-900 font-semibold border border-zinc-150'
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    History ({historyList.length})
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {activeTab === 'edit' ? (
                  <div className="space-y-3">
                    {/* Basics Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'basics' ? null : 'basics')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Personal Details</span>
                        {expandedSection === 'basics' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedSection === 'basics' && editedBasics && (
                        <div className="p-3 space-y-2 text-[11px] bg-white">
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-650">Full Name</label>
                            <Input
                              value={editedBasics.name}
                              onChange={(e) => setEditedBasics({ ...editedBasics, name: e.target.value })}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-650">Headline</label>
                            <Input
                              value={editedBasics.headline}
                              onChange={(e) => setEditedBasics({ ...editedBasics, headline: e.target.value })}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="font-semibold text-zinc-650">Email</label>
                              <Input
                                value={editedBasics.email || ''}
                                onChange={(e) => setEditedBasics({ ...editedBasics, email: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-zinc-650">Phone</label>
                              <Input
                                value={editedBasics.phone || ''}
                                onChange={(e) => setEditedBasics({ ...editedBasics, phone: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                          <Button size="xs" onClick={handleSaveBasics} className="w-full mt-2 bg-zinc-900 text-white hover:bg-zinc-800">
                            Save Section Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Summary Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Professional Summary</span>
                        {expandedSection === 'summary' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedSection === 'summary' && (
                        <div className="p-3 space-y-2 text-[11px] bg-white">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="font-semibold text-zinc-650">Summary Text</label>
                              <button
                                onClick={() => {
                                  setAiTarget('summary')
                                  setActiveTab('ai')
                                }}
                                className="text-[10px] text-blue-650 hover:text-blue-750 flex items-center gap-1 font-semibold cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-blue-500" /> AI Rewrite
                              </button>
                            </div>
                            <textarea
                              value={editedSummary}
                              onChange={(e) => setEditedSummary(e.target.value)}
                              rows={5}
                              className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                            />
                          </div>
                          <Button size="xs" onClick={handleSaveSummary} className="w-full mt-1 bg-zinc-900 text-white hover:bg-zinc-800">
                            Save Section Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Experience Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'experience' ? null : 'experience')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Work Experience Bullets</span>
                        {expandedSection === 'experience' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedSection === 'experience' && (
                        <div className="p-3 space-y-3 text-[11px] bg-white font-sans">
                          {editedExperience.map((exp) => (
                            <div key={exp.id} className="space-y-1.5 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-800">{exp.company} | {exp.position}</span>
                                <button
                                  onClick={() => {
                                    setAiTarget(`experience-${exp.id}`)
                                    setActiveTab('ai')
                                  }}
                                  className="text-[10px] text-blue-650 hover:text-blue-750 flex items-center gap-1 font-semibold cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-blue-500" /> AI Rewrite
                                </button>
                              </div>
                              <textarea
                                value={exp.summary}
                                onChange={(e) => handleSaveExperience(exp.id, e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 text-[11px] border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white font-mono"
                              />
                              <Button size="xs" onClick={() => handleCommitExperience(exp.company)} className="mt-1 bg-zinc-800 text-white hover:bg-zinc-700">
                                Save Bullets for {exp.company}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Technical Proficiency Groups</span>
                        {expandedSection === 'skills' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedSection === 'skills' && (
                        <div className="p-3 space-y-3 text-[11px] bg-white font-sans">
                          {editedSkills.map((skill, index) => (
                            <div key={skill.id} className="space-y-1.5 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                              <span className="font-bold text-zinc-800">{skill.name}</span>
                              <textarea
                                value={skill.keywords.join(', ')}
                                onChange={(e) => handleSaveSkills(skill.id, index, 'keywords', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 text-[11px] border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                                placeholder="Comma separated list"
                              />
                            </div>
                          ))}
                          <Button size="xs" onClick={handleCommitSkills} className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                            Save Skill Groups
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Projects Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Projects</span>
                        {expandedSection === 'projects' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedSection === 'projects' && (
                        <div className="p-3 space-y-3 text-[11px] bg-white font-sans">
                          {editedProjects.map((proj) => (
                            <div key={proj.id} className="space-y-1.5 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-800">{proj.name}</span>
                                <button
                                  onClick={() => {
                                    setAiTarget(`projects-${proj.id}`)
                                    setActiveTab('ai')
                                  }}
                                  className="text-[10px] text-blue-650 hover:text-blue-750 flex items-center gap-1 font-semibold cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-blue-500" /> AI Rewrite
                                </button>
                              </div>
                              <textarea
                                value={proj.description}
                                onChange={(e) => handleSaveProjects(proj.id, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-[11px] border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                              />
                              <Button size="xs" onClick={() => handleCommitProjects(proj.name)} className="mt-1 bg-zinc-800 text-white hover:bg-zinc-700">
                                Save Project Bullets
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'ai' ? (
                  <div className="space-y-4 text-xs font-medium">
                    {/* TARGET BLOCK SELECTOR */}
                    <div className="space-y-1">
                      <label className="text-zinc-650 font-semibold">Target Section / Block</label>
                      <select
                        value={aiTarget}
                        onChange={(e) => {
                          setAiTarget(e.target.value)
                          setAiSuggestion(null)
                        }}
                        className="w-full h-8 rounded-md border border-zinc-350 bg-white px-2 text-xs font-semibold text-zinc-800"
                      >
                        <option value="summary">✍️ Professional Summary</option>
                        {editedExperience.map((exp) => (
                          <option key={exp.id} value={`experience-${exp.id}`}>
                            💼 Experience: {exp.company || 'Unnamed Company'} ({exp.position || 'No Title'})
                          </option>
                        ))}
                        {editedProjects.map((proj) => (
                          <option key={proj.id} value={`projects-${proj.id}`}>
                            📁 Project: {proj.name || 'Unnamed Project'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CURRENT TEXT PREVIEW */}
                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Current Text Block</label>
                      <div className="bg-zinc-50 p-2.5 border border-zinc-200 rounded-md max-h-32 overflow-y-auto text-[10px] font-mono text-zinc-600 leading-normal select-all">
                        {aiTarget === 'summary' ? (
                          editedSummary || '(Empty)'
                        ) : aiTarget.startsWith('experience-') ? (
                          editedExperience.find(e => e.id === aiTarget.replace('experience-', ''))?.summary || '(Empty)'
                        ) : aiTarget.startsWith('projects-') ? (
                          editedProjects.find(p => p.id === aiTarget.replace('projects-', ''))?.description || '(Empty)'
                        ) : '(Select Target)'}
                      </div>
                    </div>

                    {/* AI INSTRUCTION INPUT */}
                    <div className="space-y-1.5">
                      <label className="text-zinc-650 font-semibold">AI Assistant Instructions</label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g. Rewrite to sound more technical, add engineering outcomes, or make shorter..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs border border-zinc-350 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                      />
                    </div>

                    {/* PRESET TAG BUTTONS */}
                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Preset Prompt Templates</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setAiPrompt("Rewrite this to be highly result-driven, adding measurable metrics, percentages, and financial or operational impact outcomes.")}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded text-[10px] font-medium border border-zinc-250 transition cursor-pointer"
                        >
                          📈 Add Metrics & Impact
                        </button>
                        <button
                          onClick={() => setAiPrompt("Rewrite this to sound more technically advanced, emphasizing technical architecture, domain-specific tools, and expert methodologies.")}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded text-[10px] font-medium border border-zinc-250 transition cursor-pointer"
                        >
                          💻 Make More Technical
                        </button>
                        <button
                          onClick={() => setAiPrompt("Rewrite this to be extremely concise, punchy, and clear while retaining all key achievements.")}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded text-[10px] font-medium border border-zinc-250 transition cursor-pointer"
                        >
                          ✂️ Shorten & Condense
                        </button>
                        <button
                          onClick={() => setAiPrompt("Optimize this statement to organically integrate high-impact domain keywords relevant to standard ATS filtering.")}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded text-[10px] font-medium border border-zinc-250 transition cursor-pointer"
                        >
                          🎯 ATS Keywords
                        </button>
                      </div>
                    </div>

                    {/* ACTION TRIGGERS */}
                    {aiError && (
                      <p className="text-[11px] text-red-650 bg-red-50 p-2 rounded border border-red-200 leading-normal">
                        ⚠️ {aiError}
                      </p>
                    )}

                    <Button
                      onClick={handleAiRewrite}
                      disabled={aiIsGenerating || !aiPrompt.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md cursor-pointer h-9 text-xs"
                    >
                      {aiIsGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Streaming Co-Pilot rewrite...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Run AI Optimization
                        </>
                      )}
                    </Button>

                    {/* AI REWRITE DRAFT PREVIEW (DIFF CARD) */}
                    {aiSuggestion && (
                      <div className="border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50/10 shadow-lg animate-in fade-in duration-300">
                        <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          <span>✨ AI Optimize Draft Proposal</span>
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-mono">100% facts-grounded</span>
                        </div>
                        <div className="p-3 text-[11px] text-zinc-700 leading-relaxed font-sans whitespace-pre-line bg-white border-b border-emerald-100">
                          {(() => {
                            let currentText = ''
                            if (aiTarget === 'summary') {
                              currentText = editedSummary
                            } else if (aiTarget.startsWith('experience-')) {
                              const id = aiTarget.replace('experience-', '')
                              currentText = editedExperience.find(e => e.id === id)?.summary || ''
                            } else if (aiTarget.startsWith('projects-')) {
                              const id = aiTarget.replace('projects-', '')
                              currentText = editedProjects.find(p => p.id === id)?.description || ''
                            }
                            return getHighlightedDiff(currentText, aiSuggestion)
                          })()}
                        </div>
                        <div className="flex gap-2 p-2 bg-emerald-50/30">
                          <button
                            onClick={() => setAiSuggestion(null)}
                            className="flex-1 bg-white hover:bg-zinc-150 border border-zinc-300 text-zinc-700 h-8 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3 text-zinc-500" /> Discard
                          </button>
                          <button
                            onClick={handleApplyAiRewrite}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Check className="w-3 h-3 text-white" /> Apply Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.length === 0 ? (
                      <p className="text-xs text-zinc-400 text-center py-6">No changes recorded yet. Edits made in the editor panel will be logged here.</p>
                    ) : (
                      <div className="space-y-3">
                        {historyList.map((item) => (
                          <div key={item.id} className="p-3 border border-zinc-150 rounded-lg space-y-2 bg-zinc-50/30 hover:border-zinc-300 transition duration-150">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-zinc-800 text-[11px]">{item.change_description}</span>
                              <span className="text-[9px] text-zinc-400 whitespace-nowrap">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-dashed border-zinc-200">
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              <button
                                onClick={() => handleRestoreVersion(item)}
                                className="text-blue-650 font-semibold hover:underline cursor-pointer"
                              >
                                Restore
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ATS KEYWORD HIGHLIGHTS CARD */}
            {!resume.is_master && (
              <Card className="shadow-sm border-zinc-200 bg-white">
                <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-800">ATS Keyword Highlights</CardTitle>
                    <CardDescription className="text-[10px] mt-0.5 font-medium">Verify keyword presence inside the A4 template</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0.5">
                    {highlightKeywords.length} terms
                  </Badge>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* TOGGLE VISUAL HIGHLIGHTS */}
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-zinc-100">
                    <span className="font-semibold text-zinc-700">Highlight matched terms in preview</span>
                    <button
                      onClick={() => setIsKeywordHighlightActive(!isKeywordHighlightActive)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isKeywordHighlightActive ? 'bg-blue-600' : 'bg-zinc-250'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isKeywordHighlightActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* ADD DYNAMIC KEYWORD FORM */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-zinc-650">Add custom keyword to highlight</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. ROS2, TypeScript, API..."
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddKeyword()
                          }
                        }}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        size="xs"
                        onClick={handleAddKeyword}
                        disabled={!newKeywordInput.trim()}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 px-3 cursor-pointer h-8 text-[11px] font-semibold"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* ACTIVE KEYWORDS CLUSTER */}
                  <div className="space-y-2 border-t border-zinc-100 pt-3">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Matched Active Keywords</span>
                    {highlightKeywords.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        No keywords currently selected. Type custom keywords above to highlight matches in real-time.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {highlightKeywords.map((kw, i) => (
                          <span
                            key={`${kw}-${i}`}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-100 transition"
                          >
                            <span>{kw}</span>
                            <button
                              onClick={() => handleRemoveKeyword(kw)}
                              className="text-blue-400 hover:text-blue-600 font-bold text-[9px] w-3 h-3 rounded-full hover:bg-blue-100/50 flex items-center justify-center cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const sectionLinks = [
  { id: 'technical-proficiency', label: 'Technical' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'experience', label: 'Experience' },
  { id: 'languages', label: 'Languages' },
]

function getHighlightedDiff(original: string, rewritten: string) {
  if (!original) return <span>{rewritten}</span>

  const origWords = original
    .split(/\s+/)
    .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase())
    .filter(Boolean)
  const origSet = new Set(origWords)

  const rewrittenTokens = rewritten.split(/(\s+)/)

  return (
    <>
      {rewrittenTokens.map((token, index) => {
        if (token.trim() === '') {
          return <span key={index}>{token}</span>
        }

        const cleanWord = token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase()

        if (cleanWord && !origSet.has(cleanWord)) {
          return (
            <mark key={index} className="bg-yellow-200 text-zinc-900 px-0.5 rounded font-semibold">
              {token}
            </mark>
          )
        }

        return <span key={index}>{token}</span>
      })}
    </>
  )
}

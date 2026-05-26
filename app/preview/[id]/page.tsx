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
import { ArrowLeft, Download, Loader2, Printer, ChevronDown, ChevronUp, History, Settings, Sparkles, Send, Check, Undo2, ChevronLeft, ChevronRight } from 'lucide-react'
import { exportResumePdf } from '@/lib/export-resume-pdf'
import { toast } from '@/components/ui/use-toast'
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
  const [aiModel, setAiModel] = useState<string>('openai/gpt-4o-mini')
  const [aiPerformance, setAiPerformance] = useState<any>(null)

  // ATS Keyword Highlights states
  const [isKeywordHighlightActive, setIsKeywordHighlightActive] = useState(false)
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [zoom, setZoom] = useState(85) // Dynamic screen scale factor (default 85%)

  // Selection & Inline Editor states
  const [selectedText, setSelectedText] = useState<string>('')
  const [selectionCoords, setSelectionCoords] = useState<{ x: number, y: number } | null>(null)
  const [showPromptInput, setShowPromptInput] = useState(false)
  const [inlinePrompt, setInlinePrompt] = useState('')
  const [inlineIsGenerating, setInlineIsGenerating] = useState(false)
  const [inlineSuggestion, setInlineSuggestion] = useState<string | null>(null)
  const [inlinePerformance, setInlinePerformance] = useState<any>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [inlineModel, setInlineModel] = useState<string>('openai/gpt-4o-mini')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inline_editor_model')
      if (saved) {
        setInlineModel(saved)
      }
    }
  }, [])

  const handleModelChange = (modelName: string) => {
    setInlineModel(modelName)
    if (typeof window !== 'undefined') {
      localStorage.setItem('inline_editor_model', modelName)
    }
  }

  // Collapsible layout states
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [inlinePlacement, setInlinePlacement] = useState<'top' | 'bottom'>('top')

  // Recursive utility to search and replace text in a JSON structure
  const replaceTextInJson = (obj: any, targetText: string, replacementText: string): any => {
    if (typeof obj === 'string') {
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim()
      const normOriginal = normalize(obj)
      const normTarget = normalize(targetText)

      if (normOriginal === normTarget) {
        return replacementText
      }

      // Escape regex special chars
      const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Make any spaces or formatting characters match flexibly
      const pattern = escaped.replace(/\s+/g, '\\s+')

      try {
        const regex = new RegExp(pattern, 'g')
        if (regex.test(obj)) {
          return obj.replace(regex, replacementText)
        }
      } catch (e) {
        console.error("Regex inline replacement failed:", e)
      }

      // Direct fallback
      if (obj.includes(targetText)) {
        return obj.replace(targetText, replacementText)
      }

      return obj
    }
    if (Array.isArray(obj)) {
      return obj.map(item => replaceTextInJson(item, targetText, replacementText))
    }
    if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {}
      for (const key in obj) {
        newObj[key] = replaceTextInJson(obj[key], targetText, replacementText)
      }
      return newObj
    }
    return obj
  }

  // Section expand toggle
  const [expandedSection, setExpandedSection] = useState<string | null>('basics')

  // Register Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')

      if (isInput) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveVariantName()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handlePrint()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        handleDownload()
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        handleResetToMaster()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resume, companyName, roleName, monthYear, highlightKeywords, zoom])

  const handleResetToMaster = async () => {
    if (!resume) return
    const confirmReset = confirm("Are you sure you want to reset this tailored variation back to the Master Resume source? All custom edits for this company/role will be wiped.")
    if (!confirmReset) return

    setSaveStatus('saving')
    try {
      // 1. Fetch master resume
      const res = await fetch('/api/resumes')
      if (!res.ok) throw new Error('Failed to fetch resumes list')
      const resumes = await res.json()
      const master = resumes.find((r: any) => r.is_master)
      if (!master) {
        throw new Error('Master resume not found in database')
      }

      // 2. Overwrite current content with master content
      const resumeRes = await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'default-workspace-session'
        },
        body: JSON.stringify({
          name: resume.name,
          content: master.content,
          export_meta: resume.export_meta
        })
      })

      if (!resumeRes.ok) {
        throw new Error('Failed to reset resume content')
      }

      const updatedResume = await resumeRes.json()

      // 3. Log a restoration in history
      await fetch(`/api/resumes/${resume.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'default-workspace-session'
        },
        body: JSON.stringify({
          change_description: 'Reset to Master Resume primary source',
          previous_content: resume.content,
          new_content: master.content
        })
      })

      setResume(updatedResume)
      setSaveStatus('saved')
      fetchHistory()
      toast({
        title: "Reset Completed",
        description: "Your tailored variation has been reset back to the primary Master Resume content.",
      })
    } catch (e: any) {
      console.error(e)
      setSaveStatus('error')
      toast({
        title: "Reset Failed",
        description: e.message || "An error occurred during reset.",
        variant: "destructive",
      })
    }
  }

  const handleSelection = () => {
    if (typeof window === 'undefined') return
    const selection = window.getSelection()
    const text = selection ? selection.toString().trim() : ''
    if (text && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      const popupHalfWidth = 160
      const safeLeft = window.scrollX + popupHalfWidth + 20
      const safeRight = window.scrollX + window.innerWidth - popupHalfWidth - 20
      const rawX = rect.left + rect.width / 2 + window.scrollX
      const clampedX = Math.max(safeLeft, Math.min(safeRight, rawX))

      const popupHeight = 300
      const isNearTop = rect.top < popupHeight
      setInlinePlacement(isNearTop ? 'bottom' : 'top')

      const finalY = isNearTop
        ? rect.bottom + window.scrollY + 10
        : rect.top + window.scrollY - 10

      setSelectionCoords({
        x: clampedX,
        y: finalY
      })
      setSelectedText(text)
      setShowPromptInput(false)
      setInlineSuggestion(null)
      setInlineError(null)
      setInlinePerformance(null)
    }
  }

  const handleInlineRewrite = async () => {
    if (!sessionId || !selectedText || !inlinePrompt.trim()) return
    setInlineIsGenerating(true)
    setInlineError(null)
    setInlineSuggestion(null)
    setInlinePerformance(null)

    try {
      const response = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          text: selectedText,
          instruction: inlinePrompt,
          context: (resume as any)?.jd_text || '',
          model: inlineModel,
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rewrite')
      }

      if (data.performance) {
        setInlinePerformance(data.performance)
      }

      const fullText = data.rewrittenText || ''
      const words = fullText.split(' ')
      let currentIdx = 0
      setInlineSuggestion('')

      const intervalId = setInterval(() => {
        setInlineSuggestion(prev => {
          if (currentIdx < words.length) {
            const nextWord = words[currentIdx]
            currentIdx++
            return prev ? prev + ' ' + nextWord : nextWord
          } else {
            clearInterval(intervalId)
            return prev
          }
        })
      }, 35)

    } catch (e: any) {
      console.error(e)
      setInlineError(e.message || 'Error occurred during inline AI rewrite')
    } finally {
      setInlineIsGenerating(false)
    }
  }

  const handleApplyInlineRewrite = () => {
    if (!inlineSuggestion || !resume || !selectedText) return

    const updatedContent = replaceTextInJson(resume.content, selectedText, inlineSuggestion)
    
    if (updatedContent.summary !== resume.content.summary) {
      setEditedSummary(updatedContent.summary)
    }
    if (updatedContent.experience) {
      setEditedExperience(updatedContent.experience)
    }
    if (updatedContent.projects) {
      setEditedProjects(updatedContent.projects)
    }
    if (updatedContent.basics) {
      setEditedBasics(updatedContent.basics)
    }
    if (updatedContent.skills) {
      setEditedSkills(updatedContent.skills)
    }

    saveSectionChanges('custom-selection', updatedContent, `AI Selection Rewrite: "${selectedText.substring(0, 20)}..."`)
    
    setSelectedText('')
    setSelectionCoords(null)
    setShowPromptInput(false)
    setInlinePrompt('')
    setInlineSuggestion(null)
    setInlinePerformance(null)
  }

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
    setAiPerformance(null)

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
          context: (resume as any)?.jd_text || '',
          model: aiModel,
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rewrite')
      }

      setAiSuggestion(data.rewrittenText)
      if (data.performance) {
        setAiPerformance(data.performance)
      }
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
    <div className="min-h-screen bg-zinc-50 flex print:bg-white print:block">
      {/* 1. LEFT SIDEBAR (COLLAPSIBLE) */}
      <div
        className={`bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 print:hidden ${
          leftSidebarCollapsed ? 'w-14' : 'w-80'
        } h-screen sticky top-0`}
      >
        {/* Toggle & Branding */}
        <div className="p-3 border-b border-zinc-150 flex items-center justify-between">
          {!leftSidebarCollapsed && (
            <div className="flex items-center gap-2 truncate">
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-zinc-800 tracking-tight truncate">
                {resume.name}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="ml-auto w-8 h-8 shrink-0"
          >
            {leftSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Sidebar Options */}
        {leftSidebarCollapsed ? (
          <div className="flex-1 py-4 flex flex-col items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} title="Back to Dashboard" className="hover:bg-zinc-100">
              <ArrowLeft className="w-4 h-4 text-zinc-650" />
            </Button>
            <div className="h-[1px] w-8 bg-zinc-200" />
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloading} title="Download PDF" className="hover:bg-zinc-100">
              <Download className="w-4 h-4 text-zinc-650" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print Resume" className="hover:bg-zinc-100">
              <Printer className="w-4 h-4 text-zinc-650" />
            </Button>
            <div className="h-[1px] w-8 bg-zinc-200" />
            <Button variant="ghost" size="icon" onClick={handleResetToMaster} className="text-red-500 hover:text-red-650 hover:bg-red-50" title="Reset to Master">
              <Undo2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Document Actions</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="flex-1 text-xs py-1.5 h-8">
                  <Download className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                  PDF Export
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 text-xs py-1.5 h-8">
                  <Printer className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                  Print
                </Button>
              </div>
            </div>

            {!resume.is_master && (
              <div className="space-y-3 pt-3 border-t border-zinc-150">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tailoring Details</label>
                <div className="space-y-2">
                  <div>
                    <label className="font-semibold text-zinc-650 block mb-1">Target Company</label>
                    <Input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="e.g. Google"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-650 block mb-1">Target Role</label>
                    <Input
                      value={roleName}
                      onChange={(event) => setRoleName(event.target.value)}
                      placeholder="e.g. Senior Engineer"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <Button
                    onClick={saveVariantName}
                    disabled={saveStatus === 'saving'}
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-semibold h-8"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Update Variation'}
                  </Button>
                  <div className="text-[10px] text-zinc-500 text-center font-medium h-4">
                    {saveStatus === 'saved' && <span className="text-green-600">✓ Changes Saved</span>}
                    {saveStatus === 'error' && <span className="text-red-600">✗ Update Failed</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-3 border-t border-zinc-150">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Style Template</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={template === 'classic' ? 'default' : 'outline'}
                  onClick={() => setTemplate('classic')}
                  size="sm"
                  className="text-xs font-semibold cursor-pointer h-8"
                >
                  Minimal
                </Button>
                <Button
                  variant={template === 'modern' ? 'default' : 'outline'}
                  onClick={() => setTemplate('modern')}
                  size="sm"
                  className="text-xs font-semibold cursor-pointer h-8"
                >
                  Enhanced
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-zinc-150">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Zoom Scaling</label>
              <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded-md space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-650 font-mono">
                  <span>Scale factor</span>
                  <span>{zoom}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="120"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-zinc-850"
                />
                <div className="flex justify-between gap-1">
                  <Button size="xs" variant="ghost" onClick={() => setZoom(Math.max(50, zoom - 5))} className="w-5 h-5 p-0 text-[10px] cursor-pointer">-</Button>
                  <Button size="xs" variant="ghost" onClick={() => setZoom(100)} className="h-5 px-1 text-[10px] cursor-pointer">Reset</Button>
                  <Button size="xs" variant="ghost" onClick={() => setZoom(Math.min(120, zoom + 5))} className="w-5 h-5 p-0 text-[10px] cursor-pointer">+</Button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-150 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToMaster}
                className="w-full text-xs font-semibold text-red-650 hover:bg-red-50 border-red-200 cursor-pointer h-8"
              >
                Reset to Master Source
              </Button>
              <div className="text-[10px] text-zinc-400 font-mono break-all leading-normal text-center">
                File: {createFileName()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. CENTER PANEL (MAIN RESUME CANVAS AREA) */}
      <div className="flex-1 bg-zinc-100/50 min-h-screen flex flex-col relative overflow-y-auto print:bg-white print:p-0">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-5 py-2.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            {leftSidebarCollapsed && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLeftSidebarCollapsed(false)}
                className="w-8 h-8 shrink-0 hover:bg-zinc-100"
              >
                <ChevronRight className="w-4 h-4 text-zinc-650" />
              </Button>
            )}
            <span className="text-xs text-zinc-500 font-medium">
              {!resume.is_master ? `Tailoring Variation for Company/Role` : "Master Resume Source"}
            </span>
          </div>

          {rightSidebarCollapsed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRightSidebarCollapsed(false)}
              className="text-xs font-semibold flex items-center gap-1.5 h-8 hover:bg-zinc-100"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              Expand Workspace Editor
            </Button>
          )}
        </div>

        {/* Sheet Center Canvas */}
        <div className="flex-1 p-8 flex justify-center items-start print:p-0">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: '794px',
              height: `${1123 * (zoom / 100)}px`,
              transition: 'transform 0.15s ease-out'
            }}
            className="print:transform-none print:w-full print:h-auto"
          >
            <div onMouseUp={handleSelection} className="cursor-text bg-white shadow-xl rounded-lg overflow-hidden border border-zinc-200/50 print:border-none print:shadow-none print:rounded-none">
              <ResumePreview
                content={resume.content}
                template={template}
                highlightKeywords={!resume.is_master && isKeywordHighlightActive ? highlightKeywords : []}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR (COLLAPSIBLE WORKSPACE EDITOR) */}
      <div
        className={`bg-white border-l border-zinc-200 flex flex-col transition-all duration-300 print:hidden ${
          rightSidebarCollapsed ? 'w-12' : 'w-[400px]'
        } h-screen sticky top-0`}
      >
        <div className="p-3 border-b border-zinc-150 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
            className="w-8 h-8 shrink-0 hover:bg-zinc-100"
          >
            {rightSidebarCollapsed ? <ChevronLeft className="w-4 h-4 text-zinc-650" /> : <ChevronRight className="w-4 h-4 text-zinc-650" />}
          </Button>
          {!rightSidebarCollapsed && (
            <span className="font-bold text-zinc-800 text-xs tracking-tight ml-2 mr-auto">
              Workspace Editor
            </span>
          )}
        </div>

        {rightSidebarCollapsed ? (
          <div className="flex-1 flex flex-col items-center py-6 gap-6 cursor-pointer hover:bg-zinc-50/50 transition-colors" onClick={() => setRightSidebarCollapsed(false)}>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest vertical-rl select-none transform rotate-90 my-8">
              Workspace Editor
            </span>
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse mt-4" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            <Card className="shadow-none border-none bg-white">
              <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between px-0 pt-0">
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-850">Workspace Editor</CardTitle>
                  <CardDescription className="text-[10px] mt-0.5 font-medium">Refine resume details with AI or snapshot logs</CardDescription>
                </div>
                <div className="flex bg-zinc-100 p-0.5 rounded-md border border-zinc-200 shrink-0">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`text-[11px] px-2 py-1 rounded-sm font-semibold transition-all cursor-pointer ${activeTab === 'edit'
                      ? 'bg-white shadow-xs text-zinc-900 border border-zinc-150'
                      : 'text-zinc-500 hover:text-zinc-850'
                      }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`text-[11px] px-2 py-1 rounded-sm font-semibold transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'ai'
                      ? 'bg-white shadow-xs text-zinc-900 border border-zinc-150'
                      : 'text-zinc-500 hover:text-zinc-850'
                      }`}
                  >
                    <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" /> AI Assist
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`text-[11px] px-2 py-1 rounded-sm font-semibold transition-all cursor-pointer ${activeTab === 'history'
                      ? 'bg-white shadow-xs text-zinc-900 border border-zinc-150'
                      : 'text-zinc-500 hover:text-zinc-850'
                      }`}
                  >
                    History
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 px-0 pb-0 space-y-4">
                {activeTab === 'edit' ? (
                  <div className="space-y-3">
                    {/* Basics Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'basics' ? null : 'basics')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-850 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
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
                          <Button size="xs" onClick={handleSaveBasics} className="w-full mt-2 bg-zinc-900 text-white hover:bg-zinc-800 h-7 text-xs font-semibold">
                            Save Section Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Summary Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-850 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
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
                          <Button size="xs" onClick={handleSaveSummary} className="w-full mt-1 bg-zinc-900 text-white hover:bg-zinc-800 h-7 text-xs font-semibold">
                            Save Section Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Experience Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'experience' ? null : 'experience')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-855 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
                      >
                        <span>Work Experience Bullets</span>
                        {expandedSection === 'experience' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {expandedSection === 'experience' && (
                        <div className="p-3 space-y-3 text-[11px] bg-white font-sans">
                          {editedExperience.map((exp) => (
                            <div key={exp.id} className="space-y-1.5 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-800 truncate max-w-[200px]">{exp.company} | {exp.position}</span>
                                <button
                                  onClick={() => {
                                    setAiTarget(`experience-${exp.id}`)
                                    setActiveTab('ai')
                                  }}
                                  className="text-[10px] text-blue-650 hover:text-blue-750 flex items-center gap-1 font-semibold cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition shrink-0"
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
                              <Button size="xs" onClick={() => handleCommitExperience(exp.company)} className="mt-1 bg-zinc-800 text-white hover:bg-zinc-700 h-7 text-xs font-semibold">
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
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-850 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
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
                          <Button size="xs" onClick={handleCommitSkills} className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-7 text-xs font-semibold">
                            Save Skill Groups
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Projects Accordion */}
                    <div className="border border-zinc-150 rounded-md overflow-hidden bg-zinc-50/20">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-850 bg-zinc-50 border-b border-zinc-150 hover:bg-zinc-100/70"
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
                                  className="text-[10px] text-blue-650 hover:text-blue-750 flex items-center gap-1 font-semibold cursor-pointer bg-blue-50/50 hover:bg-blue-50 px-1.5 py-0.5 rounded transition shrink-0"
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
                              <Button size="xs" onClick={() => handleCommitProjects(proj.name)} className="mt-1 bg-zinc-800 text-white hover:bg-zinc-700 h-7 text-xs font-semibold">
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
                          setAiPerformance(null)
                        }}
                        className="w-full h-8 rounded-md border border-zinc-350 bg-white px-2 text-xs font-semibold text-zinc-800 focus:outline-none"
                      >
                        <option value="summary">✍️ Professional Summary</option>
                        {editedExperience.map((exp) => (
                          <option key={exp.id} value={`experience-${exp.id}`}>
                            💼 Experience: {exp.company || 'Unnamed Company'}
                          </option>
                        ))}
                        {editedProjects.map((proj) => (
                          <option key={proj.id} value={`projects-${proj.id}`}>
                            📁 Project: {proj.name || 'Unnamed Project'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* AI REWRITE MODEL SELECTOR */}
                    <div className="space-y-1">
                      <label className="text-zinc-650 font-semibold">LLM Rewrite Model</label>
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full h-8 rounded-md border border-zinc-350 bg-white px-2 text-xs font-semibold text-zinc-800 focus:outline-none"
                      >
                        <option value="openai/gpt-4o-mini">GPT-4o Mini (Default)</option>
                        <option value="google/gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                        <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
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
                        placeholder="e.g. Rewrite to sound more technical, add engineering outcomes..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs border border-zinc-355 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                      />
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
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md cursor-pointer h-9 text-xs font-semibold"
                    >
                      {aiIsGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Running rewrite...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Optimize Block
                        </>
                      )}
                    </Button>

                    {/* AI REWRITE DRAFT PREVIEW (DIFF CARD) */}
                    {aiSuggestion && (
                      <div className="border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50/10 shadow-lg animate-in fade-in duration-300">
                        <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          <span>✨ Proposal Draft</span>
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

                        {aiPerformance && (
                          <div className="bg-zinc-50 border-b border-emerald-100 px-3 py-2 text-[9px] text-zinc-500 font-mono space-y-1">
                            <div className="flex justify-between">
                              <span className="font-semibold text-zinc-400">LLM KPIs:</span>
                              <span className="text-zinc-650 font-bold">{aiPerformance.model}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-dashed border-zinc-200 text-center">
                              <div>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase">Latency</p>
                                <p className="font-bold text-zinc-700">{aiPerformance.latency}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase">Speed</p>
                                <p className="font-bold text-zinc-700">{aiPerformance.speed}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase">Tokens</p>
                                <p className="font-bold text-zinc-700">{aiPerformance.totalTokens}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 p-2 bg-emerald-50/30">
                          <button
                            onClick={() => {
                              setAiSuggestion(null)
                              setAiPerformance(null)
                            }}
                            className="flex-1 bg-white hover:bg-zinc-150 border border-zinc-300 text-zinc-700 h-8 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3 text-zinc-500" /> Discard
                          </button>
                          <button
                            onClick={handleApplyAiRewrite}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Check className="w-3 h-3 text-white" /> Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.length === 0 ? (
                      <p className="text-xs text-zinc-400 text-center py-6">No history records logged yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {historyList.map((item) => (
                          <div key={item.id} className="p-3 border border-zinc-150 rounded-lg space-y-2 bg-zinc-50/30 hover:border-zinc-300 transition duration-150">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-zinc-800 text-[11px] leading-normal">{item.change_description}</span>
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
          </div>
        )}
      </div>
      
      {/* Selection & Inline Editor floating elements */}
      {selectedText && selectionCoords && !showPromptInput && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
            transform: inlinePlacement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            zIndex: 50,
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-500 rounded-full py-1 px-3 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            onClick={() => setShowPromptInput(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Edit Selection</span>
          </Button>
        </div>
      )}

      {selectedText && selectionCoords && showPromptInput && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
            transform: inlinePlacement === 'bottom' ? 'translate(-50%, 5%)' : 'translate(-50%, -105%)',
            zIndex: 50,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setSelectedText('')
              setSelectionCoords(null)
              setShowPromptInput(false)
            }
          }}
          className="w-80 bg-white border border-zinc-200 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 print:hidden text-xs"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>Inline AI Editor</span>
            </div>
            <button
              onClick={() => {
                setSelectedText('')
                setSelectionCoords(null)
                setShowPromptInput(false)
              }}
              className="text-zinc-400 hover:text-zinc-650 font-bold text-sm cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Model selector & prompt input */}
          {!inlineSuggestion && !inlineIsGenerating && (
            <>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">Rewrite Model</label>
                <Input
                  value={inlineModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder="Enter custom OpenRouter model..."
                  className="h-7 text-[11px] bg-white px-2 py-0"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    onClick={() => handleModelChange('openai/gpt-4o-mini')}
                    className="text-[9px] text-zinc-650 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 rounded transition border border-zinc-200 cursor-pointer"
                  >
                    4o-Mini
                  </button>
                  <button
                    onClick={() => handleModelChange('google/gemini-2.0-flash-exp')}
                    className="text-[9px] text-zinc-650 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 rounded transition border border-zinc-200 cursor-pointer"
                  >
                    Gemini 2.0
                  </button>
                  <button
                    onClick={() => handleModelChange('anthropic/claude-3.5-sonnet')}
                    className="text-[9px] text-zinc-650 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 rounded transition border border-zinc-200 cursor-pointer"
                  >
                    Sonnet 3.5
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">Instructions</label>
                  <span className="text-[8px] text-zinc-400 font-medium font-sans">Press Enter to Run</span>
                </div>
                <textarea
                  value={inlinePrompt}
                  onChange={(e) => setInlinePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (inlinePrompt.trim()) {
                        handleInlineRewrite()
                      }
                    }
                  }}
                  autoFocus
                  placeholder="How would you like to improve this section?"
                  rows={2}
                  className="w-full px-2 py-1.5 text-[11px] border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                />
              </div>

              {/* Ready-made Preset Badges */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block">Quick Instructions</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setInlinePrompt('Remove this word/words')}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 transition cursor-pointer"
                  >
                    ✂️ Remove word
                  </button>
                  <button
                    onClick={() => setInlinePrompt('Rephrase this cleanly, keeping the exact word count same')}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 transition cursor-pointer"
                  >
                    ✍️ Rephrase
                  </button>
                  <button
                    onClick={() => setInlinePrompt('Enhance to emphasize measurable outcome metrics and results')}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 transition cursor-pointer"
                  >
                    📈 Metrics
                  </button>
                  <button
                    onClick={() => setInlinePrompt('Add professional domain terms and technical keywords')}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 transition cursor-pointer"
                  >
                    💻 Technical
                  </button>
                </div>
              </div>

              {inlineError && (
                <p className="text-[10px] text-red-650 bg-red-50 p-1.5 rounded border border-red-200 leading-normal">
                  ⚠️ {inlineError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedText('')
                    setSelectionCoords(null)
                    setShowPromptInput(false)
                  }}
                  className="flex-1 bg-white hover:bg-zinc-100 border border-zinc-250 text-zinc-750 h-8 rounded text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInlineRewrite}
                  disabled={!inlinePrompt.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </>
          )}

          {/* Loading State */}
          {inlineIsGenerating && (
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-zinc-500 font-semibold animate-pulse">Rewriting selection...</span>
            </div>
          )}

          {/* Suggestion Draft / Diff Preview & KPIs */}
          {inlineSuggestion && !inlineIsGenerating && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-emerald-700">Proposal Draft</label>
                <div className="bg-emerald-50/10 border border-emerald-100 rounded p-2 max-h-24 overflow-y-auto text-[10px] text-zinc-700 leading-normal bg-white">
                  {getHighlightedDiff(selectedText, inlineSuggestion)}
                </div>
              </div>

              {inlinePerformance && (
                <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-[8px] text-zinc-500 font-mono space-y-1">
                  <div className="flex justify-between font-bold text-[7px] text-zinc-400 uppercase tracking-wider">
                    <span>Performance Metrics</span>
                    <span>{inlinePerformance.model}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-zinc-200 text-center">
                    <div>
                      <span className="block font-bold text-zinc-400 uppercase text-[7px]">Latency</span>
                      <span className="font-bold text-zinc-700">{inlinePerformance.latency}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-zinc-400 uppercase text-[7px]">Speed</span>
                      <span className="font-bold text-zinc-700">{inlinePerformance.speed}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-zinc-400 uppercase text-[7px]">Tokens</span>
                      <span className="font-bold text-zinc-700">{inlinePerformance.totalTokens}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setInlineSuggestion(null)
                    setInlinePerformance(null)
                  }}
                  className="flex-1 bg-white hover:bg-zinc-100 border border-zinc-250 text-zinc-750 h-8 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5 text-zinc-500" /> Discard
                </button>
                <button
                  onClick={handleApplyInlineRewrite}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-white" /> Approve & Replace
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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

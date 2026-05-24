import { create } from "zustand"
import { buildVariantNameFromAnalysis, buildMonthYearSuffix } from "@/lib/resume-filename"

const getSessionId = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("resumeBuilderSessionId") || ""
  }
  return ""
}

export type ResumeStatus =
  | "draft"
  | "tailored"
  | "applied"
  | "interview"
  | "shortlisted"
  | "rejected"
  | "offer"
  | "closed"

export interface Persona {
  id: string
  name: string
  description: string
  icon: string
  color: string
  usageCount: number
  lastAccessedAt: string
  created_at: string
  updated_at: string
}

export interface ResumeVariation {
  id: string
  persona_id: string
  master_resume_id: string | null
  company_name: string
  role_title: string
  status: ResumeStatus
  version: number
  jd_text: string
  resume_content: any
  created_at: string
  updated_at: string
  status_updated_at: string
  job_id?: string
  job_link?: string
}

export interface ResumeActivity {
  id: string
  persona_id: string
  variation_id: string
  action_type: string
  metadata: any
  created_at: string
}

export interface BackgroundTask {
  id: string
  type: "analyze" | "generate"
  title: string
  subtitle: string
  progress: number
  isCompleted: boolean
  estimatedDurationMs: number
  targetUrl?: string
  status: "running" | "completed" | "error"
  metadata?: any
}

interface WorkspaceState {
  personas: Persona[]
  variations: ResumeVariation[]
  activity: ResumeActivity[]
  isLoading: boolean
  sortBy: "name" | "recent" | "usage"
  filterStatus: ResumeStatus | "all"
  
  // Actions
  loadInitialData: (data: {
    personas: Persona[]
    variations: ResumeVariation[]
    activity: ResumeActivity[]
  }) => void
  
  addPersona: (name: string, description: string, icon?: string, color?: string) => Promise<Persona | null>
  incrementPersonaUsage: (personaId: string) => Promise<void>
  deletePersona: (personaId: string) => Promise<void>
  addResumeVariation: (variation: Partial<ResumeVariation>) => Promise<ResumeVariation | null>
  updateResumeStatus: (variationId: string, status: ResumeStatus) => Promise<void>
  updateVariationDetails: (
    variationId: string,
    details: {
      company_name?: string
      role_title?: string
      job_id?: string
      job_link?: string
    }
  ) => Promise<void>
  trackActivity: (personaId: string, variationId: string, actionType: string, metadata?: any) => Promise<void>
  setSortBy: (sortBy: "name" | "recent" | "usage") => void
  setFilterStatus: (status: ResumeStatus | "all") => void
  activeTask: BackgroundTask | null
  setActiveTask: (task: BackgroundTask | null) => void
  updateTaskProgress: (progress: number, isCompleted?: boolean, status?: "running" | "completed" | "error") => void
  runAnalyzeJob: (
    sessionId: string,
    masterResumeId: string,
    jobDescription: string
  ) => Promise<void>
  runFinalizeJob: (
    sessionId: string,
    masterResumeId: string,
    jobDescription: string,
    analysis: any,
    approvedChanges: any[],
    profileId: string | null,
    profileName: string | null
  ) => Promise<void>
  dismissTask: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  personas: [],
  variations: [],
  activity: [],
  isLoading: false,
  activeTask: null,
  sortBy: "recent",
  filterStatus: "all",

  loadInitialData: (data) => {
    set({
      personas: data.personas || [],
      variations: data.variations || [],
      activity: data.activity || [],
    })
  },

  addPersona: async (name, description, icon = "Briefcase", color = "zinc") => {
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": getSessionId()
        },
        body: JSON.stringify({ name, description, icon, color }),
      })
      if (response.ok) {
        const newPersona = await response.json()
        set((state) => ({ personas: [...state.personas, newPersona] }))
        // Log activity
        await get().trackActivity(newPersona.id, "", "create_persona", { name })
        return newPersona
      }
    } catch (error) {
      console.error("Failed to add persona:", error)
    }
    return null
  },

  deletePersona: async (personaId) => {
    // Optimistic Update
    set((state) => ({
      personas: state.personas.filter((p) => p.id !== personaId),
      variations: state.variations.filter((v) => v.persona_id !== personaId),
      activity: state.activity.filter((a) => a.persona_id !== personaId),
    }))

    try {
      await fetch(`/api/personas/${personaId}`, {
        method: "DELETE",
        headers: {
          "x-session-id": getSessionId()
        }
      })
    } catch (error) {
      console.error("Failed to delete persona:", error)
    }
  },

  incrementPersonaUsage: async (personaId) => {
    // Optimistic Update
    const now = new Date().toISOString()
    set((state) => ({
      personas: state.personas.map((p) =>
        p.id === personaId
          ? { ...p, usageCount: (p.usageCount || 0) + 1, lastAccessedAt: now }
          : p
      ),
    }))

    try {
      await fetch(`/api/personas/${personaId}/usage`, {
        method: "POST",
        headers: {
          "x-session-id": getSessionId()
        }
      })
    } catch (error) {
      console.error("Failed to sync persona usage:", error)
    }
  },

  addResumeVariation: async (variation) => {
    try {
      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": getSessionId()
        },
        body: JSON.stringify(variation),
      })
      if (response.ok) {
        const newVar = await response.json()
        set((state) => ({ variations: [newVar, ...state.variations] }))
        await get().trackActivity(newVar.persona_id, newVar.id, "optimize", {
          company: newVar.company_name,
          role: newVar.role_title,
        })
        return newVar
      }
    } catch (error) {
      console.error("Failed to add variation:", error)
    }
    return null
  },

  updateResumeStatus: async (variationId, status) => {
    const now = new Date().toISOString()
    let personaId = ""
    
    // Optimistic Update
    set((state) => {
      const vars = state.variations.map((v) => {
        if (v.id === variationId) {
          personaId = v.persona_id
          return { ...v, status, status_updated_at: now }
        }
        return v
      })
      return { variations: vars }
    })

    try {
      await fetch(`/api/variations/${variationId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": getSessionId()
        },
        body: JSON.stringify({ status }),
      })
      if (personaId) {
        await get().trackActivity(personaId, variationId, "update_status", { status })
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  },

  trackActivity: async (personaId, variationId, actionType, metadata = null) => {
    try {
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": getSessionId()
        },
        body: JSON.stringify({ persona_id: personaId, variation_id: variationId, action_type: actionType, metadata }),
      })
      if (response.ok) {
        const newAct = await response.json()
        set((state) => ({ activity: [newAct, ...state.activity] }))
      }
    } catch (error) {
      console.error("Failed to track activity:", error)
    }
  },

  updateVariationDetails: async (variationId, details) => {
    // Optimistic Update
    set((state) => ({
      variations: state.variations.map((v) =>
        v.id === variationId ? { ...v, ...details } : v
      ),
    }))

    try {
      await fetch(`/api/variations/${variationId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": getSessionId()
        },
        body: JSON.stringify(details),
      })
    } catch (error) {
      console.error("Failed to update variation details:", error)
    }
  },

  setSortBy: (sortBy) => set({ sortBy }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setActiveTask: (activeTask) => set({ activeTask }),
  updateTaskProgress: (progress, isCompleted = false, status = "running") => set((state) => {
    if (!state.activeTask) return {}
    return {
      activeTask: {
        ...state.activeTask,
        progress,
        isCompleted,
        status
      }
    }
  }),
  dismissTask: () => set({ activeTask: null }),

  runAnalyzeJob: async (sessionId, masterResumeId, jobDescription) => {
    const taskId = `analyze-${masterResumeId}-${Date.now()}`
    
    set({
      activeTask: {
        id: taskId,
        type: "analyze",
        title: "Analyzing Job Description",
        subtitle: "AI is scanning JD parameters, extracting domain keywords, and identifying gaps",
        progress: 0,
        isCompleted: false,
        estimatedDurationMs: 9000,
        status: "running",
        targetUrl: `/generate/${masterResumeId}`
      }
    })

    // Simulate progress ticking
    let currentProgress = 0
    const intervalTime = 90 // 9000ms / 100
    const progressInterval = setInterval(() => {
      const active = get().activeTask
      if (!active || active.status !== "running") {
        clearInterval(progressInterval)
        return
      }

      if (currentProgress >= 92) {
        currentProgress = Math.min(97, currentProgress + 0.04)
      } else {
        const remaining = 92 - currentProgress
        const step = Math.max(0.15, remaining / 20)
        currentProgress += step
      }

      set((state) => ({
        activeTask: state.activeTask ? { ...state.activeTask, progress: currentProgress } : null
      }))
    }, intervalTime)

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          action: 'analyze',
          master_resume_id: masterResumeId,
          job_description: jobDescription,
        }),
      })

      const data = await response.json()
      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze')
      }

      // Smooth transition to 100%
      set((state) => ({
        activeTask: state.activeTask ? {
          ...state.activeTask,
          progress: 100,
          isCompleted: true,
          status: "completed",
          targetUrl: `/generate/${masterResumeId}`,
          metadata: {
            analysis: data.analysis,
            jobDescription
          }
        } : null
      }))
    } catch (error: any) {
      clearInterval(progressInterval)
      console.error(error)
      set((state) => ({
        activeTask: state.activeTask ? {
          ...state.activeTask,
          status: "error",
          metadata: { error: error.message || "Failed to analyze" }
        } : null
      }))
    }
  },

  runFinalizeJob: async (sessionId, masterResumeId, jobDescription, analysis, approvedChanges, profileId, profileName) => {
    const taskId = `finalize-${masterResumeId}-${Date.now()}`
    
    set({
      activeTask: {
        id: taskId,
        type: "generate",
        title: "Synthesizing Tailored Resume",
        subtitle: "AI is assembling approved modifications and building print-perfect layouts",
        progress: 0,
        isCompleted: false,
        estimatedDurationMs: 7000,
        status: "running",
        targetUrl: `/preview/pending` // We will overwrite this once we get the ID!
      }
    })

    // Simulate progress ticking
    let currentProgress = 0
    const intervalTime = 70 // 7000ms / 100
    const progressInterval = setInterval(() => {
      const active = get().activeTask
      if (!active || active.status !== "running") {
        clearInterval(progressInterval)
        return
      }

      if (currentProgress >= 92) {
        currentProgress = Math.min(97, currentProgress + 0.04)
      } else {
        const remaining = 92 - currentProgress
        const step = Math.max(0.15, remaining / 20)
        currentProgress += step
      }

      set((state) => ({
        activeTask: state.activeTask ? { ...state.activeTask, progress: currentProgress } : null
      }))
    }, intervalTime)

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          action: 'finalize',
          master_resume_id: masterResumeId,
          job_description: jobDescription,
          analysis,
          approved_changes: approvedChanges,
          profile_id: profileId,
          profile_name: profileName,
        }),
      })

      const generatedResume = await response.json()
      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(generatedResume.error || 'Failed to generate')
      }

      // Add variant to store optimistically if profileId is present
      if (profileId) {
        const namingInput = buildVariantNameFromAnalysis(analysis, generatedResume.content.basics.headline)
        const monthYear = buildMonthYearSuffix()
        
        const newVariation: ResumeVariation = {
          id: generatedResume.id,
          persona_id: profileId,
          master_resume_id: masterResumeId,
          company_name: namingInput.company || 'Company',
          role_title: namingInput.role || 'Role',
          status: 'tailored',
          version: 1,
          jd_text: jobDescription,
          resume_content: generatedResume.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString(),
        }

        const newActivity: ResumeActivity = {
          id: `act-${Date.now()}`,
          persona_id: profileId,
          variation_id: generatedResume.id,
          action_type: 'optimize',
          metadata: {
            company: namingInput.company,
            role: namingInput.role,
          },
          created_at: new Date().toISOString()
        }

        set((state) => ({
          variations: [...state.variations.filter(v => v.id !== generatedResume.id), newVariation],
          activity: [newActivity, ...state.activity]
        }))
      }

      // Smooth transition to 100%
      set((state) => ({
        activeTask: state.activeTask ? {
          ...state.activeTask,
          progress: 100,
          isCompleted: true,
          status: "completed",
          targetUrl: `/preview/${generatedResume.id}`,
          metadata: {
            generatedResume
          }
        } : null
      }))
    } catch (error: any) {
      clearInterval(progressInterval)
      console.error(error)
      set((state) => ({
        activeTask: state.activeTask ? {
          ...state.activeTask,
          status: "error",
          metadata: { error: error.message || "Failed to generate" }
        } : null
      }))
    }
  },
}))

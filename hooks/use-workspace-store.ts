import { create } from "zustand"

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
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  personas: [],
  variations: [],
  activity: [],
  isLoading: false,
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
        headers: { "Content-Type": "application/json" },
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
      })
    } catch (error) {
      console.error("Failed to sync persona usage:", error)
    }
  },

  addResumeVariation: async (variation) => {
    try {
      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      })
    } catch (error) {
      console.error("Failed to update variation details:", error)
    }
  },

  setSortBy: (sortBy) => set({ sortBy }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
}))

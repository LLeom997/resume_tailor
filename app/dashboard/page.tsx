'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/session-context'
import { useWorkspaceStore, Persona, ResumeVariation, ResumeActivity } from '@/hooks/use-workspace-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Briefcase, 
  FileText, 
  Sparkles, 
  BarChart3, 
  Activity, 
  FolderKanban, 
  Plus, 
  Zap, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Trash2
} from 'lucide-react'

export default function DashboardPage() {
  const { sessionId, isLoading } = useSession()
  const store = useWorkspaceStore()
  
  const [masterResume, setMasterResume] = useState<any>(null)
  const [isLoadingMaster, setIsLoadingMaster] = useState(true)

  // Fetch all initial workspace data
  useEffect(() => {
    if (!sessionId || isLoading) return

    const loadWorkspaceData = async () => {
      try {
        const [personasRes, variationsRes, activityRes, masterRes] = await Promise.all([
          fetch('/api/personas', { headers: { 'x-session-id': sessionId } }),
          fetch('/api/variations', { headers: { 'x-session-id': sessionId } }),
          fetch('/api/activity', { headers: { 'x-session-id': sessionId } }),
          fetch('/api/resumes', { headers: { 'x-session-id': sessionId } }),
        ])

        let personasList: Persona[] = []
        let variationsList: ResumeVariation[] = []
        let activityList: ResumeActivity[] = []

        if (personasRes.ok) personasList = await personasRes.json()
        if (variationsRes.ok) variationsList = await variationsRes.json()
        if (activityRes.ok) activityList = await activityRes.json()



        // Initialize Zustand Store
        store.loadInitialData({
          personas: personasList,
          variations: variationsList,
          activity: activityList,
        })

        if (masterRes.ok) {
          const resumes = await masterRes.json()
          setMasterResume(resumes.find((r: any) => r.is_master) || null)
        }
      } catch (error) {
        console.error('Error loading initial workspace data:', error)
      } finally {
        setIsLoadingMaster(false)
      }
    }

    loadWorkspaceData()
  }, [sessionId, isLoading])

  if (isLoading || isLoadingMaster) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 animate-spin text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">Initializing Workspace OS...</p>
        </div>
      </div>
    )
  }

  // Analytics Math
  const totalResumes = store.variations.length
  const totalApplications = store.variations.filter(v => v.status === 'applied' || v.status === 'interview' || v.status === 'offer').length
  const totalInterviews = store.variations.filter(v => v.status === 'interview').length
  const totalOffers = store.variations.filter(v => v.status === 'offer').length
  const successRate = totalApplications > 0 ? Math.round(((totalOffers + totalInterviews) / totalApplications) * 100) : 0

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-zinc-200">
      {/* Upper Navigation / Ribbon */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-6 h-6 text-zinc-800" />
            <span className="font-bold text-lg tracking-tight">Workspace OS</span>
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold px-2 py-0.5 tracking-wider">
              Professional v2
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {masterResume && (
              <Link href={`/preview/${masterResume.id}`}>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 shadow-sm">
                  <FileText className="w-3.5 h-3.5" /> Preview & Download
                </Button>
              </Link>
            )}
            {masterResume ? (
              <Link href={`/editor/${masterResume.id}`}>
                <Button size="sm" className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">
                  Edit Master Source
                </Button>
              </Link>
            ) : (
              <Link href="/editor">
                <Button size="sm" className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">
                  Create Master Resume
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* OVERVIEW STATS SECTION */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Variations</CardTitle>
              <FileText className="w-4 h-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{totalResumes}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Across all dynamic personas</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Applications Submitted</CardTitle>
              <Briefcase className="w-4 h-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{totalApplications}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Sustained tracking active</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Interviews & Offers</CardTitle>
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {totalInterviews} <span className="text-zinc-300 font-light">/</span> {totalOffers}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Active feedback pipelines</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Conversion rate</CardTitle>
              <BarChart3 className="w-4 h-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight flex items-baseline gap-1">
                {successRate}%
                <TrendingUp className="w-3 h-3 text-emerald-500 inline" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Shortlist / Application ratio</p>
            </CardContent>
          </Card>
        </section>

        {/* WORKSPACE CONTENT GRID */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Personas Workspace list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-zinc-800">Dynamic Career Personas</h2>
              <Button size="xs" variant="outline" className="gap-1.5 text-xs text-zinc-600">
                <Plus className="w-3 h-3" /> Add Persona
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {store.personas.map((persona) => {
                const variantsCount = store.variations.filter(v => v.persona_id === persona.id).length
                const appsCount = store.variations.filter(v => v.persona_id === persona.id && (v.status === 'applied' || v.status === 'interview' || v.status === 'offer')).length
                const ivsCount = store.variations.filter(v => v.persona_id === persona.id && v.status === 'interview').length
                
                return (
                  <Link href={`/personas/${persona.id}`} key={persona.id} className="block group">
                    <Card className="shadow-sm border-zinc-200 hover:border-zinc-400 hover:shadow transition duration-200 cursor-pointer h-full flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0 pr-2">
                            <CardTitle className="text-sm font-bold group-hover:text-blue-600 transition flex items-center gap-2 truncate">
                              <Briefcase className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                              <span className="truncate">{persona.name}</span>
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-2">{persona.description || 'No description provided.'}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <Button
                              size="xs"
                              variant="ghost"
                              className="w-7 h-7 p-0 text-zinc-400 hover:text-red-650 hover:bg-red-50"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete the "${persona.name}" persona and all its variations?`)) {
                                  await store.deletePersona(persona.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {persona.usageCount > 0 && (
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                Used {persona.usageCount}x
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded p-2 text-center text-xs border border-zinc-100">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Resumes</p>
                            <p className="font-extrabold text-zinc-800 mt-0.5">{variantsCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Applied</p>
                            <p className="font-extrabold text-zinc-800 mt-0.5">{appsCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Interviews</p>
                            <p className="font-extrabold text-zinc-800 mt-0.5">{ivsCount}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-zinc-900 transition">
                          <span>Open Persona Workspace</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* RIGHT: Recent Activity Feed & Status Pipeline Summary */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-800">Workspace Activity Feed</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time optimization events</p>
            </div>

            <Card className="shadow-sm border-zinc-200">
              <CardContent className="p-4 space-y-4 max-h-[360px] overflow-y-auto">
                {store.activity.length > 0 ? (
                  store.activity.map((act) => {
                    const persona = store.personas.find(p => p.id === act.persona_id)
                    return (
                      <div key={act.id} className="flex gap-3 text-xs leading-normal">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 mt-0.5">
                          <Activity className="w-2.5 h-2.5 text-zinc-600" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-medium text-zinc-800">
                            {act.action_type === 'create_persona' && `Created persona "${act.metadata?.name || 'New'}"`}
                            {act.action_type === 'optimize' && `Optimized variation for ${act.metadata?.company || 'Company'}`}
                            {act.action_type === 'update_status' && `Updated status to "${act.metadata?.status || 'draft'}"`}
                            {act.action_type === 'export_pdf' && `Downloaded PDF version`}
                          </p>
                          {persona && (
                            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                              Track: {persona.name}
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-400">
                            {new Date(act.created_at).toLocaleDateString()} at {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    <Activity className="w-6 h-6 mx-auto text-zinc-300 mb-2" />
                    No recent optimization activity.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PIPELINE SUMMARY */}
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-800">Resume Pipeline</h2>
            </div>
            
            <Card className="shadow-sm border-zinc-200 p-4 space-y-3">
              {(['draft', 'tailored', 'applied', 'interview', 'offer'] as const).map(status => {
                const count = store.variations.filter(v => v.status === status).length
                const percentage = totalResumes > 0 ? Math.round((count / totalResumes) * 100) : 0
                
                const colors = {
                  draft: 'bg-zinc-400',
                  tailored: 'bg-blue-500',
                  applied: 'bg-amber-500',
                  interview: 'bg-purple-500',
                  offer: 'bg-emerald-500'
                }
                
                return (
                  <div key={status} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-zinc-700 font-medium">
                      <span className="capitalize">{status}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-zinc-150 h-1.5 rounded-full overflow-hidden border border-zinc-100">
                      <div className={`${colors[status]} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

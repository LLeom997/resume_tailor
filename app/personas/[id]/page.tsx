'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { useWorkspaceStore, ResumeStatus, ResumeVariation, Persona } from '@/hooks/use-workspace-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { parseResumeExportBaseName } from '@/lib/resume-filename'
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Briefcase, 
  Sparkles, 
  Plus, 
  Zap, 
  Trash2,
  Share2,
  ExternalLink,
  ChevronDown,
  Settings
} from 'lucide-react'

export default function PersonaWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { sessionId, isLoading } = useSession()
  const store = useWorkspaceStore()
  
  const personaId = params.id as string
  const [persona, setPersona] = useState<Persona | null>(() => {
    return store.personas.find(p => p.id === personaId) || null
  })
  const [globalMaster, setGlobalMaster] = useState<any>(null)
  
  const hasCachedVariations = store.variations.some(v => v.persona_id === personaId)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(!hasCachedVariations)
  const [resumesList, setResumesList] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [editingVariation, setEditingVariation] = useState<ResumeVariation | null>(null)
  const [editJobId, setEditJobId] = useState("")
  const [editJobLink, setEditJobLink] = useState("")
  const [editCompany, setEditCompany] = useState("")
  const [editRole, setEditRole] = useState("")
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [copiedSync, setCopiedSync] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('persona_view_mode')
    if (saved === 'card' || saved === 'table') {
      setViewMode(saved)
    }
  }, [])

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode)
    localStorage.setItem('persona_view_mode', mode)
  }

  useEffect(() => {
    if (!sessionId || isLoading || !personaId) return

    const loadWorkspace = async () => {
      try {
        const [personaRes, variationsRes, masterRes] = await Promise.all([
          fetch(`/api/personas`, { headers: { 'x-session-id': sessionId } }),
          fetch(`/api/variations?persona_id=${personaId}`, { headers: { 'x-session-id': sessionId } }),
          fetch('/api/resumes', { headers: { 'x-session-id': sessionId } }),
        ])

        if (variationsRes.ok) {
          const variations: ResumeVariation[] = await variationsRes.json()
          
          if (personaRes.ok) {
            const list: Persona[] = await personaRes.json()
            const found = list.find(p => p.id === personaId)
            setPersona(found || null)
            
            // Increment usage count on enter
            if (found) {
              await fetch(`/api/personas/${personaId}/usage`, { method: 'POST' })
            }
          }

          store.loadInitialData({
            personas: store.personas.length > 0 ? store.personas : [],
            variations: variations,
            activity: store.activity,
          })
        }

        if (masterRes.ok) {
          const resumes = await masterRes.json()
          setResumesList(resumes)
          setGlobalMaster(resumes.find((r: any) => r.is_master) || null)
        }
      } catch (error) {
        console.error('Error loading workspace:', error)
      } finally {
        setIsLoadingWorkspace(false)
      }
    }

    loadWorkspace()
  }, [sessionId, isLoading, personaId])

  if (isLoading || isLoadingWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 animate-spin text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">Opening Workspace...</p>
        </div>
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-center space-y-3">
          <p className="text-zinc-600">Workspace not found.</p>
          <Link href="/dashboard">
            <Button size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Filter variations for this persona
  const variations = store.variations.filter(v => v.persona_id === personaId)

  // Helper to resolve company name and role title from resume table dynamically
  const getVariationDisplayDetails = (v: ResumeVariation) => {
    const matchingResume = resumesList.find((r) => r.id === v.id)
    let companyName = v.company_name
    let roleTitle = v.role_title
    let jobId = v.job_id || ""
    let jobLink = v.job_link || ""

    if (matchingResume) {
      if (matchingResume.export_meta) {
        companyName = matchingResume.export_meta.company || companyName
        roleTitle = matchingResume.export_meta.role || roleTitle
        jobId = matchingResume.export_meta.job_id || jobId
        jobLink = matchingResume.export_meta.job_link || jobLink
      } else {
        const parsed = parseResumeExportBaseName(matchingResume.name)
        if (parsed) {
          companyName = parsed.company || companyName
          roleTitle = parsed.role || roleTitle
        }
      }
    }

    return { companyName, roleTitle, jobId, jobLink }
  }

  // Analytics row metrics
  const totalVariants = variations.length
  const activeApplications = variations.filter(v => ['applied', 'interview', 'offer'].includes(v.status)).length
  const successCount = variations.filter(v => v.status === 'offer').length
  
  // Find most targeted company using dynamically resolved company names
  const companyCounts = variations.reduce((acc, v) => {
    const { companyName } = getVariationDisplayDetails(v)
    if (companyName) {
      acc[companyName] = (acc[companyName] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  let mostTargetedCompany = 'None'
  let maxCount = 0
  Object.entries(companyCounts).forEach(([company, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostTargetedCompany = company
    }
  })

  // Status Badges & Colors mapping
  const statusColors: Record<ResumeStatus, string> = {
    draft: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    tailored: 'bg-blue-50 text-blue-800 border-blue-200',
    applied: 'bg-amber-50 text-amber-800 border-amber-200',
    interview: 'bg-purple-50 text-purple-800 border-purple-200',
    shortlisted: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    offer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    closed: 'bg-zinc-200 text-zinc-700 border-zinc-300',
  }

  const handleStatusChange = async (variationId: string, status: ResumeStatus) => {
    await store.updateResumeStatus(variationId, status)
    // Refresh page data
    const res = await fetch(`/api/variations?persona_id=${personaId}`, { headers: { 'x-session-id': sessionId! } })
    if (res.ok) {
      const list = await res.json()
      store.loadInitialData({
        personas: store.personas,
        variations: list,
        activity: store.activity
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume variation?')) return
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId! }
      })
      if (res.ok) {
        // Refresh local store
        const variationsRes = await fetch(`/api/variations?persona_id=${personaId}`, { headers: { 'x-session-id': sessionId! } })
        if (variationsRes.ok) {
          const list = await variationsRes.json()
          store.loadInitialData({
            personas: store.personas,
            variations: list,
            activity: store.activity
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenEditModal = (v: ResumeVariation) => {
    const details = getVariationDisplayDetails(v)
    setEditingVariation(v)
    setEditJobId(details.jobId)
    setEditJobLink(details.jobLink)
    setEditCompany(details.companyName)
    setEditRole(details.roleTitle)
  }

  const handleSaveDetails = async () => {
    if (!editingVariation) return
    setIsSavingDetails(true)
    try {
      await store.updateVariationDetails(editingVariation.id, {
        company_name: editCompany,
        role_title: editRole,
        job_id: editJobId,
        job_link: editJobLink
      })
      
      // Update local state list as well
      const updatedResumes = resumesList.map((r) => {
        if (r.id === editingVariation.id) {
          return {
            ...r,
            export_meta: {
              ...(r.export_meta || {}),
              company: editCompany,
              role: editRole,
              job_id: editJobId,
              job_link: editJobLink
            }
          }
        }
        return r
      })
      setResumesList(updatedResumes)
      
      // Refresh page data
      const res = await fetch(`/api/variations?persona_id=${personaId}`, { headers: { 'x-session-id': sessionId! } })
      if (res.ok) {
        const list = await res.json()
        store.loadInitialData({
          personas: store.personas,
          variations: list,
          activity: store.activity
        })
      }
      setEditingVariation(null)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSavingDetails(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-zinc-700" />
                <h1 className="font-bold text-lg tracking-tight">{persona.name} Workspace</h1>
              </div>
              <p className="text-xs text-zinc-500">{persona.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 shadow-sm border-zinc-200 text-zinc-650 hover:bg-zinc-50"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.origin)
                  url.search = `?session=${sessionId || ''}`
                  navigator.clipboard.writeText(url.toString())
                  setCopiedSync(true)
                  setTimeout(() => setCopiedSync(false), 2000)
                }
              }}
            >
              <Share2 className="w-3.5 h-3.5 text-zinc-500" />
              {copiedSync ? 'Sync URL Copied!' : 'Sync to Vercel'}
            </Button>
            {globalMaster ? (
              <Link href={`/generate/${globalMaster.id}?profile_id=${personaId}`}>
                <Button size="sm" className="text-xs gap-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5" /> Optimize New Resume
                </Button>
              </Link>
            ) : (
              <Link href="/editor">
                <Button size="sm" className="text-xs">Create Master First</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        
        {/* TOP SECTION: PERSONA ANALYTICS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{totalVariants}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Versions created for this persona</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Pipelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{activeApplications}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Submitted or in interviews</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Top Target Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight truncate text-zinc-800">{mostTargetedCompany}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Company targeted the most</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Offers Obtained</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight flex items-baseline gap-1">
                {successCount}
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 inline" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Offer letters received</p>
            </CardContent>
          </Card>
        </section>

        {/* MIDDLE SECTION: RESUME CARDS GRID OR TRACKING TABLE */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
            <h2 className="text-base font-bold tracking-tight text-zinc-800">Resume Variations</h2>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200 self-start sm:self-auto">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => handleViewModeChange('card')}
                className={`text-xs px-3 h-7 rounded-md transition-all ${
                  viewMode === 'card'
                    ? 'bg-white shadow-sm font-semibold text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Card View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => handleViewModeChange('table')}
                className={`text-xs px-3 h-7 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white shadow-sm font-semibold text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Table View
              </Button>
            </div>
          </div>
          
          {variations.length > 0 || globalMaster ? (
            viewMode === 'card' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-200">
                {globalMaster && (
                  <Card className="shadow-sm border-blue-200 bg-blue-50/5 hover:border-blue-400 hover:shadow transition duration-200 flex flex-col justify-between border-dashed relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <CardTitle className="text-sm font-bold truncate text-blue-900">{globalMaster.name}</CardTitle>
                          <CardDescription className="text-xs font-semibold text-blue-600">Global Master Resume</CardDescription>
                        </div>
                        <Badge className="bg-blue-600 text-white font-semibold text-[10px] px-2 py-0.5">
                          Master
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] text-blue-500 font-semibold uppercase tracking-wider">
                        <span>Foundational Source</span>
                        <span>Created: {new Date(globalMaster.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2">
                          <Link href={`/preview/${globalMaster.id}`} className="flex-1">
                            <Button size="xs" variant="outline" className="w-full text-[11px] gap-1 border-blue-200 text-blue-700 hover:bg-blue-50/50">
                              <ExternalLink className="w-3 h-3" /> Preview & Download
                            </Button>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/editor/${globalMaster.id}`} className="flex-1">
                            <Button size="xs" variant="secondary" className="w-full text-[11px] gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800">
                              Edit Source
                            </Button>
                          </Link>
                          <Link href={`/generate/${globalMaster.id}?profile_id=${personaId}`}>
                            <Button size="xs" className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px] flex-1">
                              <Zap className="w-3 h-3" /> Optimize
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {variations.map((v) => {
                  const { companyName, roleTitle, jobId, jobLink } = getVariationDisplayDetails(v)
                  return (
                    <Card key={v.id} className="shadow-sm border-zinc-200 hover:border-zinc-400 hover:shadow transition duration-200 flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <CardTitle className="text-sm font-bold truncate text-zinc-800">{roleTitle}</CardTitle>
                            <CardDescription className="text-xs truncate font-medium text-zinc-500">{companyName}</CardDescription>
                          </div>
                          <Badge variant="outline" className={`text-[10px] capitalize px-2 py-0.5 font-semibold ${statusColors[v.status] || ''}`}>
                            {v.status === 'closed' ? 'position closed' : v.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                          <span>Version: v{v.version || 1}</span>
                          <span>Updated: {new Date(v.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        {(jobId || jobLink) && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] border-t border-zinc-150 pt-2.5">
                            {jobId && (
                              <span className="font-semibold bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-650 border border-zinc-200">
                                ID: {jobId}
                              </span>
                            )}
                            {jobLink && (
                              <a 
                                href={jobLink.startsWith('http') ? jobLink : `https://${jobLink}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Job Link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 mt-2">
                          <Link href={`/preview/${v.id}`} className="flex-1">
                            <Button size="xs" variant="outline" className="w-full text-[11px] gap-1">
                              <ExternalLink className="w-3 h-3" /> Preview
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="xs" variant="secondary" className="gap-1 text-[11px] cursor-pointer">
                                Status <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              {(['draft', 'tailored', 'applied', 'interview', 'offer', 'closed'] as ResumeStatus[]).map((statusOption) => (
                                <DropdownMenuItem 
                                  key={statusOption} 
                                  onClick={() => handleStatusChange(v.id, statusOption)}
                                  className="capitalize cursor-pointer"
                                >
                                  {statusOption === 'closed' ? 'position closed' : statusOption}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button 
                            size="xs" 
                            variant="ghost" 
                            onClick={() => handleOpenEditModal(v)} 
                            className="text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                            title="Edit Job Details"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </Button>

                          <Button 
                            size="xs" 
                            variant="ghost" 
                            onClick={() => handleDelete(v.id)} 
                            className="text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="shadow-sm border-zinc-200 overflow-hidden animate-in fade-in duration-200">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Updated</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Version</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {globalMaster && (
                      <TableRow className="bg-blue-50/5 hover:bg-blue-50/10 font-medium">
                        <TableCell className="font-bold text-blue-900">Global Master Source</TableCell>
                        <TableCell className="text-blue-700 font-semibold">{globalMaster.name}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-600 text-white hover:bg-blue-600 font-semibold text-[9px] px-1.5 py-0.5">Master</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-500">{new Date(globalMaster.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-zinc-400">Foundation</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1.5">
                          <Link href={`/preview/${globalMaster.id}`}>
                            <Button size="xs" variant="outline" className="text-[10px] py-1 border-blue-200 text-blue-705 hover:bg-blue-50">Preview & Download</Button>
                          </Link>
                          <Link href={`/editor/${globalMaster.id}`}>
                            <Button size="xs" variant="ghost" className="text-[10px] py-1 text-zinc-500 hover:text-zinc-800">Edit</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )}
                    {variations.map((v) => {
                      const { companyName, roleTitle, jobId, jobLink } = getVariationDisplayDetails(v)
                      return (
                        <TableRow key={v.id} className="hover:bg-zinc-50/50">
                          <TableCell className="font-semibold text-zinc-900">
                            <div className="space-y-0.5">
                              <div>{companyName}</div>
                              {jobId && <div className="text-[10px] font-normal text-zinc-400">ID: {jobId}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-650">
                            <div className="space-y-0.5">
                              <div>{roleTitle}</div>
                              {jobLink && (
                                <a 
                                  href={jobLink.startsWith('http') ? jobLink : `https://${jobLink}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-500 hover:underline text-[10px] inline-flex items-center gap-0.5"
                                >
                                  Link <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="xs" 
                                  className={`capitalize px-2 py-0.5 font-semibold text-[10px] h-6 flex items-center gap-1.5 cursor-pointer shadow-xs ${statusColors[v.status] || ''}`}
                                >
                                  {v.status === 'closed' ? 'position closed' : v.status}
                                  <ChevronDown className="w-3 h-3 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="text-xs">
                                {(['draft', 'tailored', 'applied', 'interview', 'offer', 'closed'] as ResumeStatus[]).map((statusOption) => (
                                  <DropdownMenuItem 
                                    key={statusOption} 
                                    onClick={() => handleStatusChange(v.id, statusOption)}
                                    className="capitalize cursor-pointer"
                                  >
                                    {statusOption === 'closed' ? 'position closed' : statusOption}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="text-zinc-500">{new Date(v.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono text-zinc-400">v{v.version || 1}</TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-1.5">
                            <Link href={`/preview/${v.id}`}>
                              <Button size="xs" variant="outline" className="text-[10px] py-1">Open</Button>
                            </Link>
                            <Button 
                              size="xs" 
                              variant="ghost" 
                              onClick={() => handleOpenEditModal(v)} 
                              className="text-zinc-450 hover:text-zinc-800 hover:bg-zinc-100"
                              title="Edit Job Details"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => handleDelete(v.id)} className="text-zinc-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            )
          ) : (
            <Card className="border-dashed border-zinc-300">
              <CardContent className="pt-8 text-center text-zinc-500 text-xs">
                <FileText className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                No tailored resumes yet. Optimize your first resume above to get started!
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {editingVariation && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-900 text-base">Edit Job Details</h3>
              <p className="text-xs text-zinc-500">Update target details for this resume variation.</p>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Company Name</label>
                <input 
                  type="text" 
                  value={editCompany} 
                  onChange={(e) => setEditCompany(e.target.value)} 
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                  placeholder="e.g. Google"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Role Title</label>
                <input 
                  type="text" 
                  value={editRole} 
                  onChange={(e) => setEditRole(e.target.value)} 
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Job ID (from JD)</label>
                <input 
                  type="text" 
                  value={editJobId} 
                  onChange={(e) => setEditJobId(e.target.value)} 
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                  placeholder="e.g. REQ-12345"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Job Posting Link</label>
                <input 
                  type="text" 
                  value={editJobLink} 
                  onChange={(e) => setEditJobLink(e.target.value)} 
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 bg-white"
                  placeholder="e.g. https://careers.google.com/jobs/..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingVariation(null)} 
                disabled={isSavingDetails}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveDetails} 
                disabled={isSavingDetails}
                className="text-xs shadow-sm bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {isSavingDetails ? "Saving..." : "Save Details"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

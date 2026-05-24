'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { CareerProfile, Resume } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, Loader2, Plus } from 'lucide-react'
import { slugifyProfileName } from '@/lib/default-profiles'

export default function ProfilesPage() {
  const router = useRouter()
  const { sessionId, isLoading } = useSession()
  const [profiles, setProfiles] = useState<CareerProfile[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [newProfileName, setNewProfileName] = useState('')
  const [setupHint, setSetupHint] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || isLoading) return
    loadData()
  }, [sessionId, isLoading])

  const loadData = async () => {
    if (!sessionId) return

    setIsLoadingData(true)
    try {
      const [profilesRes, resumesRes] = await Promise.all([
        fetch('/api/profiles', { headers: { 'x-session-id': sessionId } }),
        fetch('/api/resumes', { headers: { 'x-session-id': sessionId } }),
      ])

      if (profilesRes.ok) {
        setProfiles(await profilesRes.json())
        setSetupHint(null)
      } else {
        setSetupHint('Run supabase/migrations/001_career_profiles.sql to enable profiles.')
        setProfiles([])
      }

      if (resumesRes.ok) {
        setResumes(await resumesRes.json())
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleCreateProfile = async () => {
    if (!sessionId || !newProfileName.trim()) return

    const response = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        name: newProfileName.trim(),
        slug: slugifyProfileName(newProfileName),
        description: '',
      }),
    })

    if (response.ok) {
      setNewProfileName('')
      loadData()
    }
  }

  const countVariants = (profileId: string) =>
    resumes.filter((resume) => resume.profile_id === profileId && !resume.is_master).length

  if (isLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const masterResume = resumes.find((resume) => resume.is_master)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Career profiles</h1>
            <p className="text-gray-600 mt-1">
              Track your master resume and tailored variants by role focus.
            </p>
          </div>
        </div>

        {setupHint && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6 text-sm text-amber-900">{setupHint}</CardContent>
          </Card>
        )}

        {masterResume && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Shared master resume</CardTitle>
              <CardDescription>Base resume used to generate all profile variants.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={`/editor/${masterResume.id}`}>
                <Button variant="outline">Edit master</Button>
              </Link>
              <Link href={`/preview/${masterResume.id}`}>
                <Button variant="outline">Preview master</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={newProfileName}
              onChange={(event) => setNewProfileName(event.target.value)}
              placeholder="e.g. Turbomachinery Engineer"
            />
            <Button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create profile
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  {profile.name}
                </CardTitle>
                <CardDescription>{profile.description || 'No description yet.'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-600">{countVariants(profile.id)} tailored variants</p>
                <Link href={`/profiles/${profile.id}`}>
                  <Button className="w-full">Open profile</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {profiles.length === 0 && !setupHint && (
          <p className="text-center text-zinc-600">No profiles yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}

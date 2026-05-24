'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { CareerProfile, Resume } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Loader2, Zap } from 'lucide-react'
import { formatResumeVariantDisplayName } from '@/lib/resume-filename'

interface ProfileDetailResponse {
  profile: CareerProfile
  masterResume: Resume | null
  variants: Resume[]
}

export default function ProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { sessionId, isLoading } = useSession()
  const [data, setData] = useState<ProfileDetailResponse | null>(null)
  const [globalMaster, setGlobalMaster] = useState<Resume | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const profileId = params.id as string

  useEffect(() => {
    router.replace(`/personas/${profileId}`)
  }, [profileId, router])

  const loadProfile = async () => {
    if (!sessionId) return

    setIsLoadingData(true)
    try {
      const [profileRes, resumesRes] = await Promise.all([
        fetch(`/api/profiles/${profileId}`, { headers: { 'x-session-id': sessionId } }),
        fetch('/api/resumes', { headers: { 'x-session-id': sessionId } }),
      ])

      if (profileRes.ok) {
        setData(await profileRes.json())
      } else {
        router.push('/profiles')
        return
      }

      if (resumesRes.ok) {
        const resumes: Resume[] = await resumesRes.json()
        setGlobalMaster(resumes.find((resume) => resume.is_master) || null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/profiles')
    } finally {
      setIsLoadingData(false)
    }
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const masterForGenerate = data.masterResume || globalMaster

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.profile.name}</h1>
            <p className="text-sm text-zinc-500">{data.profile.description}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Master resume for this profile</CardTitle>
            <CardDescription>
              {data.masterResume
                ? 'Linked master resume for this career track.'
                : 'Using your global master resume until you link one.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {masterForGenerate ? (
              <>
                <Link href={`/preview/${masterForGenerate.id}`}>
                  <Button variant="outline">Preview & Download</Button>
                </Link>
                <Link href={`/editor/${masterForGenerate.id}`}>
                  <Button variant="outline">Edit master</Button>
                </Link>
                <Link href={`/generate/${masterForGenerate.id}?profile_id=${profileId}`}>
                  <Button>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate variant
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/editor">
                <Button>Create master resume first</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Variants ({data.variants.length})</h2>

        {data.variants.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.variants.map((variant) => (
              <Card key={variant.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{formatResumeVariantDisplayName(variant.name)}</CardTitle>
                  <CardDescription className="break-all">{variant.name}.pdf</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/preview/${variant.id}`}>
                    <Button variant="outline" className="w-full">
                      Open & download
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-zinc-600">
              No variants for this profile yet. Generate one from the master resume.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

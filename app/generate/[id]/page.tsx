'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Resume } from '@/lib/types'
import { AIGenerator } from '@/components/ai-generator'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function GeneratePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { sessionId, isLoading } = useSession()
  const profileId = searchParams.get('profile_id') || undefined
  const [masterResume, setMasterResume] = useState<Resume | null>(null)
  const [isLoadingResume, setIsLoadingResume] = useState(true)

  const id = params.id as string

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
        const data = await response.json()
        setMasterResume(data)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching resume:', error)
      router.push('/dashboard')
    } finally {
      setIsLoadingResume(false)
    }
  }

  const handleGenerateComplete = (generatedResume: Resume) => {
    router.push(`/preview/${generatedResume.id}`)
  }

  if (isLoading || isLoadingResume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!masterResume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Resume not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Generate Tailored Resume</h1>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <AIGenerator
            masterResume={masterResume}
            profileId={profileId}
            onGenerateComplete={handleGenerateComplete}
          />
        </div>
      </div>
    </div>
  )
}

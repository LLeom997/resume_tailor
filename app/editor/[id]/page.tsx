'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Resume, ResumeContent } from '@/lib/types'
import { ResumeEditor } from '@/components/resume-editor'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function EditResumePage() {
  const router = useRouter()
  const params = useParams()
  const { sessionId, isLoading } = useSession()
  const [resume, setResume] = useState<Resume | null>(null)
  const [previewContent, setPreviewContent] = useState<ResumeContent | null>(null)
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
        setResume(data)
        setPreviewContent(data.content)
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

  const handleSave = () => {
    router.push('/dashboard')
  }

  if (isLoading || isLoadingResume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!resume || !previewContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Resume not found</p>
      </div>
    )
  }

  const pageTitle = resume.is_master ? 'Edit master resume' : 'Edit resume'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Update details, upload a new file, or paste resume text. Preview updates live.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <ResumeEditor
              resume={resume}
              onSave={handleSave}
              onChange={setPreviewContent}
              isMaster={resume.is_master}
            />
          </div>
          <div className="xl:sticky xl:top-6 bg-white rounded-lg shadow p-4 overflow-x-auto">
            <p className="text-sm font-medium text-zinc-600 mb-3">Live preview</p>
            <ResumePreview content={previewContent} template="classic" />
          </div>
        </div>
      </div>
    </div>
  )
}

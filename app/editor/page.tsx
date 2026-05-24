'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Resume, ResumeContent } from '@/lib/types'
import { ResumeEditor } from '@/components/resume-editor'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { defaultResumeContent } from '@/lib/resume-utils'

export default function EditorPage() {
  const router = useRouter()
  const { sessionId, isLoading } = useSession()
  const [previewContent, setPreviewContent] = useState<ResumeContent>(defaultResumeContent)
  const [checkingMaster, setCheckingMaster] = useState(true)

  useEffect(() => {
    if (!sessionId || isLoading) return

    const checkMaster = async () => {
      try {
        const response = await fetch('/api/resumes', {
          headers: { 'x-session-id': sessionId },
        })

        if (response.ok) {
          const resumes: Resume[] = await response.json()
          const master = resumes.find((item) => item.is_master)
          if (master) {
            router.replace(`/editor/${master.id}`)
            return
          }
        }
      } catch (error) {
        console.error('Error checking master resume:', error)
      } finally {
        setCheckingMaster(false)
      }
    }

    checkMaster()
  }, [sessionId, isLoading, router])

  const handleSave = () => {
    router.push('/dashboard')
  }

  if (isLoading || checkingMaster) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create master resume</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Build manually, upload a file, or paste existing resume text.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <ResumeEditor
              initialContent={defaultResumeContent}
              isMaster={true}
              onSave={handleSave}
              onChange={setPreviewContent}
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

'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/session-context'
import { Resume } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Pencil, Plus, Trash2, Upload, Zap } from 'lucide-react'
import { formatResumeVariantDisplayName } from '@/lib/resume-filename'

export default function DashboardPage() {
  const { sessionId, isLoading } = useSession()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(false)
  const [masterResume, setMasterResume] = useState<Resume | null>(null)

  useEffect(() => {
    if (!sessionId || isLoading) return

    fetchResumes()
  }, [sessionId, isLoading])

  const fetchResumes = async () => {
    if (!sessionId) return

    setIsLoadingResumes(true)
    try {
      const response = await fetch('/api/resumes', {
        headers: {
          'x-session-id': sessionId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setResumes(data)

        // Find master resume
        const master = data.find((r: Resume) => r.is_master)
        setMasterResume(master || null)
      }
    } catch (error) {
      console.error('Error fetching resumes:', error)
    } finally {
      setIsLoadingResumes(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!sessionId || !confirm('Are you sure you want to delete this resume?')) return

    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-session-id': sessionId,
        },
      })

      if (response.ok) {
        setResumes(resumes.filter((r) => r.id !== id))
        if (masterResume?.id === id) {
          setMasterResume(null)
        }
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Resume Builder</h1>
          <p className="text-gray-600">Create and tailor your resume with AI assistance</p>
        </div>

        {/* Master Resume Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Master Resume</h2>
            <div className="flex flex-wrap gap-2">
              {masterResume ? (
                <>
                  <Link href={`/editor/${masterResume.id}`}>
                    <Button>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit master resume
                    </Button>
                  </Link>
                  <Link href={`/editor/${masterResume.id}`}>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload / replace
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/editor">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create master resume
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {masterResume ? (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{masterResume.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(masterResume.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/preview/${masterResume.id}`}>
                      <Button variant="outline">View Resume</Button>
                    </Link>
                    <Link href={`/editor/${masterResume.id}`}>
                      <Button variant="outline">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit details
                      </Button>
                    </Link>
                    <Link href={`/generate/${masterResume.id}`}>
                      <Button>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Variants
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">
                  Start by creating a master resume. This will be your base resume that AI can tailor
                  for different job positions.
                </p>
                <Link href="/editor">
                  <Button className="w-full">Create Your First Resume</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resume Variants Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Resume Variants</h2>

          {resumes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes
                .filter((r) => !r.is_master)
                .map((resume) => (
                  <Card key={resume.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{formatResumeVariantDisplayName(resume.name)}</CardTitle>
                          <CardDescription className="break-all">{resume.name}.pdf</CardDescription>
                        </div>
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="p-2 hover:bg-red-50 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/preview/${resume.id}`}>
                        <Button variant="outline" className="w-full">
                          View Resume
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : masterResume ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">
                  No variants yet. Generate your first tailored resume by using the AI Generator!
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

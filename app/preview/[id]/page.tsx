'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Resume } from '@/lib/types'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'
import { exportResumePdf } from '@/lib/export-resume-pdf'
import { applyResumeScale, clearResumeScale } from '@/lib/resume-export-scale'
import {
  buildResumeExportFileName,
  parseResumeExportBaseName,
} from '@/lib/resume-filename'

export default function PreviewPage() {
  const router = useRouter()
  const params = useParams()
  const { sessionId, isLoading } = useSession()
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoadingResume, setIsLoadingResume] = useState(true)
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic')
  const [companyName, setCompanyName] = useState('')
  const [roleName, setRoleName] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

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

        if (!data.is_master) {
          const parsed = parseResumeExportBaseName(data.name)
          if (parsed) {
            setCompanyName(parsed.company)
            setRoleName(parsed.role)
          }
        }
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

  const createFileName = () => {
    if (!resume) return

    const company = companyName.trim() || 'Company'
    const role = roleName.trim() || resume.content.basics.headline.split('|')[0]?.trim() || 'Role'

    return buildResumeExportFileName({ company, role })
  }

  const handleDownload = async () => {
    const resumeElement = document.getElementById('resume-document')
    const filename = createFileName()
    if (!resumeElement || !resume || !filename) return

    setIsDownloading(true)
    setDownloadError(null)
    try {
      await exportResumePdf({ element: resumeElement, filename })
    } catch (error) {
      console.error('PDF download failed:', error)
      setDownloadError(
        error instanceof Error ? error.message : 'PDF download failed. Please try again or use Print.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    const resumeElement = document.getElementById('resume-document')
    if (!resumeElement) {
      window.print()
      return
    }

    applyResumeScale(resumeElement)

    const cleanup = () => {
      clearResumeScale(resumeElement)
      window.removeEventListener('afterprint', cleanup)
    }

    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  if (isLoading || isLoadingResume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Resume not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <div className="container mx-auto py-8 px-4">
        {/* Header with controls */}
        <div className="mb-8 bg-white rounded-lg shadow p-5 sticky top-0 z-10 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{resume.name}</h1>
                <p className="text-sm text-zinc-500">Preview and export final resume</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Preparing...' : 'PDF Download'}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Company for file name"
              />
              <Input
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Role for file name"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={template === 'classic' ? 'default' : 'outline'}
                onClick={() => setTemplate('classic')}
              >
                Minimal
              </Button>
              <Button
                variant={template === 'modern' ? 'default' : 'outline'}
                onClick={() => setTemplate('modern')}
              >
                Enhanced
              </Button>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2 text-sm">
            {sectionLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 text-xs text-zinc-500">
            File pattern: {createFileName()}
          </div>
          {downloadError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {downloadError}
            </p>
          )}
        </div>

        {/* Preview — only this root prints / exports */}
        <div id="resume-print-root" className="bg-white rounded-lg shadow overflow-hidden print:rounded-none print:shadow-none print:overflow-hidden">
          <div className="print:p-0 p-4 flex justify-center">
            <ResumePreview content={resume.content} template={template} />
          </div>
        </div>
      </div>
    </div>
  )
}

const sectionLinks = [
  { id: 'technical-proficiency', label: 'Technical' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'experience', label: 'Experience' },
  { id: 'languages', label: 'Languages' },
]

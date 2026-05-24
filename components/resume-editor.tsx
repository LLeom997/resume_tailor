"use client"

import { Resume, ResumeContent } from "@/lib/types"
import { useSession } from "@/lib/session-context"
import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { defaultResumeContent } from "@/lib/resume-utils"
import { newResumeItemId } from "@/lib/resume-id"
import { resumeContentSchema } from "@/lib/resume-ai-schemas"
import { Plus, Trash2, Upload } from "lucide-react"
import { InteractiveProgress } from "@/components/interactive-progress"

interface ResumeEditorProps {
  resume?: Resume
  initialContent?: ResumeContent
  onSave?: (resume: Resume) => void
  onChange?: (content: ResumeContent) => void
  isMaster?: boolean
}

/**
 * Full master resume editor with upload and section management.
 */
export function ResumeEditor({
  resume,
  initialContent,
  onSave,
  onChange,
  isMaster = false,
}: ResumeEditorProps) {
  const { sessionId } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isParseCompleted, setIsParseCompleted] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState("")
  const [content, setContent] = useState<ResumeContent>(resume?.content || initialContent || defaultResumeContent)

  const updateContent = (next: ResumeContent) => {
    setContent(next)
    onChange?.(next)
  }

  const updateBasics = (field: keyof ResumeContent["basics"], value: string) => {
    updateContent({
      ...content,
      basics: { ...content.basics, [field]: value },
    })
  }

  const handleSave = async () => {
    if (!sessionId) return

    setIsSaving(true)
    try {
      const url = resume ? `/api/resumes/${resume.id}` : "/api/resumes"
      const method = resume ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          name: content.basics.name || "Untitled Resume",
          content,
          is_master: isMaster,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save resume")
      }

      const savedResume = await response.json()
      onSave?.(savedResume)
    } catch (error) {
      console.error("Error saving resume:", error)
      alert(error instanceof Error ? error.message : "Failed to save resume")
    } finally {
      setIsSaving(false)
    }
  }

  const normalizeImportedContent = (data: ResumeContent): ResumeContent => ({
    ...data,
    experience: data.experience.map((item) => ({ ...item, id: item.id || newResumeItemId() })),
    education: data.education.map((item) => ({ ...item, id: item.id || newResumeItemId() })),
    skills: data.skills.map((item) => ({ ...item, id: item.id || newResumeItemId() })),
    projects: data.projects.map((item) => ({ ...item, id: item.id || newResumeItemId() })),
    certifications: data.certifications.map((item) => ({ ...item, id: item.id || newResumeItemId() })),
  })

  const applyParsedContent = (parsed: ResumeContent) => {
    updateContent(normalizeImportedContent(parsed))
    setUploadError(null)
  }

  const parseRawText = async (rawText: string) => {
    if (!sessionId) {
      setUploadError("Session not ready. Please refresh the page.")
      return
    }

    setIsParsing(true)
    setIsParseCompleted(false)
    setUploadError(null)
    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ rawText }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse resume")
      }

      applyParsedContent(resumeContentSchema.parse(data.content))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to parse resume")
      setIsParseCompleted(true) // Complete and close even on error
    } finally {
      setIsParseCompleted(true)
    }
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)
    try {
      const text = await file.text()
      const lowerName = file.name.toLowerCase()

      if (lowerName.endsWith(".json")) {
        const json = JSON.parse(text) as unknown
        applyParsedContent(resumeContentSchema.parse(json))
        return
      }

      await parseRawText(text)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Invalid file format")
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handlePasteParse = async () => {
    if (!pasteText.trim()) {
      setUploadError("Paste resume text first.")
      return
    }
    await parseRawText(pasteText)
  }

  return (
    <div className="space-y-6">
      {isParsing && (
        <InteractiveProgress 
          title="Parsing Resume Layout" 
          subtitle="AI is segmenting text layers and populating editor fields" 
          isCompleted={isParseCompleted}
          onClose={() => setIsParsing(false)}
          estimatedDurationMs={6000}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Import resume</CardTitle>
          <CardDescription>
            Upload a .txt, .json, or .md file, or paste resume text. AI will map it into editable fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.md,text/plain,application/json"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
              <Upload className="w-4 h-4 mr-2" />
              Upload file
            </Button>
            <Button type="button" variant="outline" onClick={handlePasteParse} disabled={isParsing}>
              {isParsing ? "Parsing..." : "Parse pasted text"}
            </Button>
          </div>
          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Paste your full resume text here..."
            rows={5}
          />
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name">
              <Input value={content.basics.name} onChange={(e) => updateBasics("name", e.target.value)} />
            </Field>
            <Field label="Professional headline">
              <Input value={content.basics.headline} onChange={(e) => updateBasics("headline", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={content.basics.email} onChange={(e) => updateBasics("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={content.basics.phone} onChange={(e) => updateBasics("phone", e.target.value)} />
            </Field>
            <Field label="Location">
              <Input value={content.basics.location} onChange={(e) => updateBasics("location", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={content.basics.website} onChange={(e) => updateBasics("website", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content.summary}
            onChange={(e) => updateContent({ ...content, summary: e.target.value })}
            rows={5}
          />
        </CardContent>
      </Card>

      <ListSection
        title="Experience"
        description="Use a blank line between bullet groups in the summary field."
        onAdd={() =>
          updateContent({
            ...content,
            experience: [
              ...content.experience,
              {
                id: newResumeItemId(),
                company: "",
                position: "",
                startDate: "",
                endDate: "",
                summary: "",
              },
            ],
          })
        }
      >
        {content.experience.map((item, index) => (
          <ItemCard
            key={item.id}
            onRemove={() =>
              updateContent({
                ...content,
                experience: content.experience.filter((_, i) => i !== index),
              })
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Company">
                <Input
                  value={item.company}
                  onChange={(e) => {
                    const experience = [...content.experience]
                    experience[index] = { ...item, company: e.target.value }
                    updateContent({ ...content, experience })
                  }}
                />
              </Field>
              <Field label="Position">
                <Input
                  value={item.position}
                  onChange={(e) => {
                    const experience = [...content.experience]
                    experience[index] = { ...item, position: e.target.value }
                    updateContent({ ...content, experience })
                  }}
                />
              </Field>
              <Field label="Start date">
                <Input
                  value={item.startDate}
                  onChange={(e) => {
                    const experience = [...content.experience]
                    experience[index] = { ...item, startDate: e.target.value }
                    updateContent({ ...content, experience })
                  }}
                />
              </Field>
              <Field label="End date">
                <Input
                  value={item.endDate}
                  onChange={(e) => {
                    const experience = [...content.experience]
                    experience[index] = { ...item, endDate: e.target.value }
                    updateContent({ ...content, experience })
                  }}
                />
              </Field>
            </div>
            <Field label="Summary">
              <Textarea
                value={item.summary}
                onChange={(e) => {
                  const experience = [...content.experience]
                  experience[index] = { ...item, summary: e.target.value }
                  updateContent({ ...content, experience })
                }}
                rows={4}
              />
            </Field>
          </ItemCard>
        ))}
      </ListSection>

      <ListSection
        title="Education"
        onAdd={() =>
          updateContent({
            ...content,
            education: [
              ...content.education,
              {
                id: newResumeItemId(),
                institution: "",
                studyType: "",
                area: "",
                startDate: "",
                endDate: "",
              },
            ],
          })
        }
      >
        {content.education.map((item, index) => (
          <ItemCard
            key={item.id}
            onRemove={() =>
              updateContent({
                ...content,
                education: content.education.filter((_, i) => i !== index),
              })
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Institution">
                <Input
                  value={item.institution}
                  onChange={(e) => {
                    const education = [...content.education]
                    education[index] = { ...item, institution: e.target.value }
                    updateContent({ ...content, education })
                  }}
                />
              </Field>
              <Field label="Degree type">
                <Input
                  value={item.studyType}
                  onChange={(e) => {
                    const education = [...content.education]
                    education[index] = { ...item, studyType: e.target.value }
                    updateContent({ ...content, education })
                  }}
                />
              </Field>
              <Field label="Field of study">
                <Input
                  value={item.area}
                  onChange={(e) => {
                    const education = [...content.education]
                    education[index] = { ...item, area: e.target.value }
                    updateContent({ ...content, education })
                  }}
                />
              </Field>
              <Field label="Start date">
                <Input
                  value={item.startDate}
                  onChange={(e) => {
                    const education = [...content.education]
                    education[index] = { ...item, startDate: e.target.value }
                    updateContent({ ...content, education })
                  }}
                />
              </Field>
              <Field label="End date">
                <Input
                  value={item.endDate}
                  onChange={(e) => {
                    const education = [...content.education]
                    education[index] = { ...item, endDate: e.target.value }
                    updateContent({ ...content, education })
                  }}
                />
              </Field>
            </div>
          </ItemCard>
        ))}
      </ListSection>

      <ListSection
        title="Skills"
        onAdd={() =>
          updateContent({
            ...content,
            skills: [
              ...content.skills,
              { id: newResumeItemId(), name: "", level: "", keywords: [] },
            ],
          })
        }
      >
        {content.skills.map((item, index) => (
          <ItemCard
            key={item.id}
            onRemove={() =>
              updateContent({
                ...content,
                skills: content.skills.filter((_, i) => i !== index),
              })
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Category">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const skills = [...content.skills]
                    skills[index] = { ...item, name: e.target.value }
                    updateContent({ ...content, skills })
                  }}
                />
              </Field>
              <Field label="Level">
                <Input
                  value={item.level}
                  onChange={(e) => {
                    const skills = [...content.skills]
                    skills[index] = { ...item, level: e.target.value }
                    updateContent({ ...content, skills })
                  }}
                />
              </Field>
            </div>
            <Field label="Keywords (comma separated)">
              <Input
                value={item.keywords.join(", ")}
                onChange={(e) => {
                  const skills = [...content.skills]
                  skills[index] = {
                    ...item,
                    keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                  }
                  updateContent({ ...content, skills })
                }}
              />
            </Field>
          </ItemCard>
        ))}
      </ListSection>

      <ListSection
        title="Projects"
        onAdd={() =>
          updateContent({
            ...content,
            projects: [
              ...content.projects,
              {
                id: newResumeItemId(),
                name: "",
                description: "",
                url: "",
                startDate: "",
                endDate: "",
              },
            ],
          })
        }
      >
        {content.projects.map((item, index) => (
          <ItemCard
            key={item.id}
            onRemove={() =>
              updateContent({
                ...content,
                projects: content.projects.filter((_, i) => i !== index),
              })
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const projects = [...content.projects]
                    projects[index] = { ...item, name: e.target.value }
                    updateContent({ ...content, projects })
                  }}
                />
              </Field>
              <Field label="URL">
                <Input
                  value={item.url}
                  onChange={(e) => {
                    const projects = [...content.projects]
                    projects[index] = { ...item, url: e.target.value }
                    updateContent({ ...content, projects })
                  }}
                />
              </Field>
              <Field label="Start date">
                <Input
                  value={item.startDate}
                  onChange={(e) => {
                    const projects = [...content.projects]
                    projects[index] = { ...item, startDate: e.target.value }
                    updateContent({ ...content, projects })
                  }}
                />
              </Field>
              <Field label="End date">
                <Input
                  value={item.endDate}
                  onChange={(e) => {
                    const projects = [...content.projects]
                    projects[index] = { ...item, endDate: e.target.value }
                    updateContent({ ...content, projects })
                  }}
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={item.description}
                onChange={(e) => {
                  const projects = [...content.projects]
                  projects[index] = { ...item, description: e.target.value }
                  updateContent({ ...content, projects })
                }}
                rows={3}
              />
            </Field>
          </ItemCard>
        ))}
      </ListSection>

      <ListSection
        title="Certifications"
        onAdd={() =>
          updateContent({
            ...content,
            certifications: [...content.certifications, { id: newResumeItemId(), name: "" }],
          })
        }
      >
        {content.certifications.map((item, index) => (
          <ItemCard
            key={item.id}
            onRemove={() =>
              updateContent({
                ...content,
                certifications: content.certifications.filter((_, i) => i !== index),
              })
            }
          >
            <Field label="Certification name">
              <Input
                value={item.name}
                onChange={(e) => {
                  const certifications = [...content.certifications]
                  certifications[index] = { ...item, name: e.target.value }
                  updateContent({ ...content, certifications })
                }}
              />
            </Field>
          </ItemCard>
        ))}
      </ListSection>

      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
          <CardDescription>Comma-separated list (e.g. English, Hindi)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={content.languages.join(", ")}
            onChange={(e) =>
              updateContent({
                ...content,
                languages: e.target.value.split(",").map((l) => l.trim()).filter(Boolean),
              })
            }
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving || isParsing} className="w-full">
        {isSaving ? "Saving..." : isMaster ? "Save master resume" : "Save resume"}
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function ListSection({
  title,
  description,
  onAdd,
  children,
}: {
  title: string
  description?: string
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function ItemCard({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4 mr-1" />
          Remove
        </Button>
      </div>
      {children}
    </div>
  )
}

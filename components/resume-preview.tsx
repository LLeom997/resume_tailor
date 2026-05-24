'use client'

import { ResumeContent } from '@/lib/types'
import { formatDate } from '@/lib/resume-utils'
import { Award, BriefcaseBusiness, GraduationCap, Languages, Lightbulb, LucideIcon, Wrench } from 'lucide-react'
import { ReactNode } from 'react'

interface ResumePreviewProps {
  content: ResumeContent
  template?: 'classic' | 'modern'
}

const sectionIds = {
  technical: 'technical-proficiency',
  projects: 'projects',
  education: 'education',
  certifications: 'certifications',
  languages: 'languages',
  experience: 'experience',
}

export function ResumePreview({ content, template = 'classic' }: ResumePreviewProps) {
  return <TwoColumnTemplate content={content} enhanced={template === 'modern'} />
}

function TwoColumnTemplate({ content, enhanced }: { content: ResumeContent; enhanced: boolean }) {
  const sheetClass = enhanced ? 'resume-sheet resume-sheet--enhanced' : 'resume-sheet'

  return (
    <article id="resume-document" className={sheetClass}>
      <header className="resume-header">
        <h1 className="resume-name">{content.basics.name}</h1>
        <div className="resume-contact">
          {content.basics.email && <span>Email: {content.basics.email}</span>}
          {content.basics.phone && <span>Phone: {content.basics.phone}</span>}
          {content.basics.location && <span>{content.basics.location}</span>}
          {content.basics.website && <span>{content.basics.website}</span>}
        </div>
        <p className="resume-headline">{content.basics.headline}</p>
        {content.summary && <p className="resume-summary">{content.summary}</p>}
      </header>

      <div className="resume-columns">
        <aside className="resume-sidebar">
          {content.skills?.length > 0 && (
            <ResumeSection id={sectionIds.technical} title="Technical Proficiency" icon={Wrench} enhanced={enhanced}>
              <div className="resume-stack-sm">
                {content.skills.map((skill) => (
                  <div key={skill.id}>
                    <p className="resume-accent">{skill.name}:</p>
                    <p className="resume-muted" style={{ marginTop: '2px' }}>
                      {skill.keywords.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </ResumeSection>
          )}

          {content.projects && content.projects.length > 0 && (
            <ResumeSection id={sectionIds.projects} title="Projects" icon={Lightbulb} enhanced={enhanced}>
              <div className="resume-stack">
                {content.projects.map((project) => (
                  <div key={project.id}>
                    <p className="resume-bold">
                      {project.name}
                      {(project.startDate || project.endDate) && (
                        <span className="resume-muted-light" style={{ fontWeight: 400 }}>
                          {' '}
                          | {formatDate(project.startDate)}
                        </span>
                      )}
                    </p>
                    <p className="resume-muted" style={{ marginTop: '2px' }}>
                      {project.description}
                    </p>
                  </div>
                ))}
              </div>
            </ResumeSection>
          )}

          {content.education?.length > 0 && (
            <ResumeSection id={sectionIds.education} title="Education" icon={GraduationCap} enhanced={enhanced}>
              <div className="resume-stack">
                {content.education.map((education) => (
                  <div key={education.id}>
                    <p className="resume-bold">
                      {education.studyType} in {education.area}
                    </p>
                    <p className="resume-muted">
                      {formatDate(education.startDate)}-{formatDate(education.endDate)}
                    </p>
                    <p className="resume-muted">{education.institution}</p>
                  </div>
                ))}
              </div>
            </ResumeSection>
          )}

          {content.certifications && content.certifications.length > 0 && (
            <ResumeSection id={sectionIds.certifications} title="Certifications" icon={Award} enhanced={enhanced}>
              <div className="resume-stack-sm">
                {content.certifications.map((certification) => (
                  <p key={certification.id} className="resume-muted">
                    {certification.name}
                  </p>
                ))}
              </div>
            </ResumeSection>
          )}

          {content.languages && content.languages.length > 0 && (
            <ResumeSection id={sectionIds.languages} title="Languages" icon={Languages} enhanced={enhanced}>
              <p className="resume-muted">{content.languages.join(' | ')}</p>
            </ResumeSection>
          )}
        </aside>

        <main className="resume-main">
          {content.experience?.length > 0 && (
            <ResumeSection id={sectionIds.experience} title="Experience" icon={BriefcaseBusiness} enhanced={enhanced}>
              <div className="resume-stack-lg">
                {content.experience.map((experience) => (
                  <div key={experience.id} className="resume-experience-item">
                    <div className="resume-experience-header">
                      <p className="resume-experience-title">
                        {experience.company} | {experience.position}
                      </p>
                      <p className="resume-experience-dates">
                        {formatDate(experience.startDate)} - {formatDate(experience.endDate)}
                      </p>
                    </div>
                    <ExperienceSummary summary={experience.summary} enhanced={enhanced} />
                  </div>
                ))}
              </div>
            </ResumeSection>
          )}
        </main>
      </div>
    </article>
  )
}

function ResumeSection({
  id,
  title,
  icon: Icon,
  enhanced,
  children,
}: {
  id: string
  title: string
  icon: LucideIcon
  enhanced: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className="resume-section">
      <div className="resume-section-heading">
        {enhanced && <Icon className="resume-section-icon" aria-hidden="true" />}
        <h2 className="resume-section-title">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ExperienceSummary({ summary, enhanced }: { summary: string; enhanced: boolean }) {
  const entries = summary.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="resume-experience-body">
      {entries.map((entry, index) => {
        const [label, ...bodyParts] = entry.split(' - ')
        const body = bodyParts.join(' - ')

        return (
          <p key={`${entry}-${index}`} className="resume-experience-line">
            {body ? (
              <>
                <span className="resume-experience-label">{label} - </span>
                {body}
              </>
            ) : (
              entry
            )}
          </p>
        )
      })}
    </div>
  )
}

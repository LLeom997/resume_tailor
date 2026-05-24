import { ResumeContent } from './types'

// Default resume template
export const defaultResumeContent: ResumeContent = {
  basics: {
    name: 'Your Name',
    headline: 'Professional Headline',
    email: 'your.email@example.com',
    phone: '+1 (555) 000-0000',
    location: 'City, State',
    website: 'https://yourwebsite.com',
    picture: '',
  },
  summary: 'A brief professional summary about yourself.',
  experience: [
    {
      id: '1',
      company: 'Company Name',
      position: 'Job Title',
      startDate: '2023-01',
      endDate: 'Present',
      summary: 'Description of your responsibilities and achievements.',
    },
  ],
  education: [
    {
      id: '1',
      institution: 'University Name',
      studyType: 'Degree Type',
      area: 'Field of Study',
      startDate: '2019-09',
      endDate: '2023-05',
    },
  ],
  skills: [
    {
      id: '1',
      name: 'Technical Skills',
      level: 'Expert',
      keywords: ['Skill 1', 'Skill 2', 'Skill 3'],
    },
  ],
  projects: [],
  certifications: [],
  languages: [],
}

export function exportToText(content: ResumeContent): string {
  let text = ''

  // Basics
  text += `${content.basics.name}\n`
  text += `${content.basics.headline}\n\n`
  text += `Email: ${content.basics.email}\n`
  text += `Phone: ${content.basics.phone}\n`
  text += `Location: ${content.basics.location}\n`
  if (content.basics.website) {
    text += `Website: ${content.basics.website}\n`
  }
  text += '\n'

  // Summary
  if (content.summary) {
    text += `PROFESSIONAL SUMMARY\n${'-'.repeat(50)}\n`
    text += `${content.summary}\n\n`
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    text += `EXPERIENCE\n${'-'.repeat(50)}\n`
    content.experience.forEach((exp) => {
      text += `${exp.position} at ${exp.company}\n`
      text += `${exp.startDate} - ${exp.endDate}\n`
      text += `${exp.summary}\n\n`
    })
  }

  // Education
  if (content.education && content.education.length > 0) {
    text += `EDUCATION\n${'-'.repeat(50)}\n`
    content.education.forEach((edu) => {
      text += `${edu.studyType} in ${edu.area}\n`
      text += `${edu.institution}\n`
      text += `${edu.startDate} - ${edu.endDate}\n\n`
    })
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    text += `SKILLS\n${'-'.repeat(50)}\n`
    content.skills.forEach((skill) => {
      text += `${skill.name} (${skill.level})\n`
      text += `${skill.keywords.join(', ')}\n\n`
    })
  }

  // Projects
  if (content.projects && content.projects.length > 0) {
    text += `PROJECTS\n${'-'.repeat(50)}\n`
    content.projects.forEach((project) => {
      text += `${project.name}\n`
      text += `${project.startDate} - ${project.endDate}\n`
      text += `${project.description}\n`
      if (project.url) {
        text += `${project.url}\n`
      }
      text += '\n'
    })
  }

  if (content.certifications && content.certifications.length > 0) {
    text += `CERTIFICATIONS\n${'-'.repeat(50)}\n`
    content.certifications.forEach((certification) => {
      text += `${certification.name}\n`
    })
    text += '\n'
  }

  if (content.languages && content.languages.length > 0) {
    text += `LANGUAGES\n${'-'.repeat(50)}\n`
    text += `${content.languages.join(' | ')}\n\n`
  }

  return text
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  if (dateString.toLowerCase() === 'present') return 'Present'
  if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(dateString)) return dateString
  if (/^\d{4}$/.test(dateString)) return dateString

  const [year, month] = dateString.split('-')
  if (!year || !month) return dateString

  const date = new Date(parseInt(year), parseInt(month) - 1)
  if (Number.isNaN(date.getTime())) return dateString

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

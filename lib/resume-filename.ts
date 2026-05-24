/**
 * Shared resume export naming: Company_Role_May2026 (.pdf for downloads).
 * Uses double-underscore delimiters so company/role may contain single underscores.
 */

export interface ResumeExportNameInput {
  company: string
  role: string
  date?: Date
}

export interface ParsedResumeExportName {
  company: string
  role: string
  monthYear: string
}

/**
 * Sanitizes a string for use in export file names.
 */
export function sanitizeFilePart(value: string): string {
  return value
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
}

/**
 * Builds the month-year suffix used in export names (e.g. May2026).
 */
export function buildMonthYearSuffix(date: Date = new Date()): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    .replace(" ", "")
}

/**
 * Builds the base export name without file extension.
 */
export function buildResumeExportBaseName(input: ResumeExportNameInput): string {
  const company = sanitizeFilePart(input.company.trim() || "Company")
  const role = sanitizeFilePart(input.role.trim() || "Role")
  const monthYear = buildMonthYearSuffix(input.date)
  return `${company}__${role}__${monthYear}`
}

/**
 * Builds the PDF download file name.
 */
export function buildResumeExportFileName(input: ResumeExportNameInput): string {
  return `${buildResumeExportBaseName(input)}.pdf`
}

/**
 * Parses a stored variant name back into company, role, and month-year.
 */
export function parseResumeExportBaseName(name: string): ParsedResumeExportName | null {
  const withoutExtension = name.replace(/\.pdf$/i, "")
  const parts = withoutExtension.split("__")

  if (parts.length !== 3 || !parts[2]) {
    return null
  }

  return {
    company: parts[0].replace(/_/g, " "),
    role: parts[1].replace(/_/g, " "),
    monthYear: parts[2],
  }
}

/**
 * Builds variant naming input from workflow analysis and fallbacks.
 */
export function buildVariantNameFromAnalysis(
  analysis: { jdParser?: { company?: string; targetRole?: string } } | undefined,
  fallbackHeadline: string
): ResumeExportNameInput {
  const company = analysis?.jdParser?.company?.trim() || "Company"
  const role =
    analysis?.jdParser?.targetRole?.trim() ||
    fallbackHeadline.split("|")[0]?.trim() ||
    "Role"

  return { company, role }
}

/**
 * Formats a variant name for dashboard display.
 */
export function formatResumeVariantDisplayName(name: string): string {
  const parsed = parseResumeExportBaseName(name)
  if (!parsed) {
    return name
  }

  return `${parsed.company} · ${parsed.role} · ${parsed.monthYear}`
}

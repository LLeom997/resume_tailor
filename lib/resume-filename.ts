/**
 * Resume export naming: Company_Mechanical_Design_Engineer_May2026.pdf
 */

export interface ResumeExportNameInput {
  company: string
  role: string
  date?: Date
  monthYear?: string
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
 * Example: Company_Mechanical_Design_Engineer_May2026
 */
export function buildResumeExportBaseName(input: ResumeExportNameInput): string {
  const company = sanitizeFilePart(input.company.trim() || "Company")
  const role = sanitizeFilePart(input.role.trim() || "Role")
  const monthYear = input.monthYear || buildMonthYearSuffix(input.date)
  return `${company}_${role}_${monthYear}`
}

/**
 * Builds the PDF download file name.
 */
export function buildResumeExportFileName(input: ResumeExportNameInput): string {
  return `${buildResumeExportBaseName(input)}.pdf`
}

/**
 * Parses a stored variant name back into company, role, and month-year.
 * Supports legacy double-underscore names.
 */
export function parseResumeExportBaseName(name: string): ParsedResumeExportName | null {
  const withoutExtension = name.replace(/\.pdf$/i, "")

  if (withoutExtension.includes("__")) {
    const legacyParts = withoutExtension.split("__")
    if (legacyParts.length === 3 && legacyParts[2]) {
      return {
        company: legacyParts[0].replace(/_/g, " "),
        role: legacyParts[1].replace(/_/g, " "),
        monthYear: legacyParts[2],
      }
    }
  }

  const monthYearMatch = withoutExtension.match(/_([A-Za-z]{3}\d{4})$/)
  if (!monthYearMatch) {
    return null
  }

  const monthYear = monthYearMatch[1]
  const prefix = withoutExtension.slice(0, -monthYearMatch[0].length)
  const segments = prefix.split("_").filter(Boolean)

  if (segments.length < 2) {
    return null
  }

  return {
    company: segments[0].replace(/_/g, " "),
    role: segments.slice(1).join(" ").replace(/_/g, " "),
    monthYear,
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

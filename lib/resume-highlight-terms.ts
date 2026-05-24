import { ResumeWorkflowAnalysis } from "@/lib/types"

/**
 * Collects highlight terms from workflow analysis and approved changes.
 */
export function collectHighlightKeywords(
  analysis: ResumeWorkflowAnalysis | undefined,
  approvedChangeKeywords: string[] = []
): string[] {
  if (!analysis) {
    return approvedChangeKeywords
  }

  const terms = [
    ...analysis.keywordExtraction.hardSkills,
    ...analysis.keywordExtraction.tools,
    ...analysis.keywordExtraction.domainKeywords,
    ...analysis.keywordExtraction.softSkills,
    ...analysis.jdParser.requiredSkills,
    ...analysis.jdParser.preferredSkills,
    ...analysis.jdParser.responsibilities,
    ...analysis.intentExtraction.roleFocus,
    ...approvedChangeKeywords,
  ]

  return [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 2))].slice(0, 40)
}

/**
 * Regex pattern for KPI-style metrics in resume text.
 */
export const KPI_HIGHLIGHT_PATTERN =
  /\$[\d,]+(?:\.\d+)?(?:\s?(?:K|M|B|k|m|b))?\b|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+\+\s*(?:years?|months?|YOE)\b|\b\d{1,3}(?:,\d{3})+\+?\b/gi

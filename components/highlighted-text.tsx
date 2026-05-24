"use client"

import { KPI_HIGHLIGHT_PATTERN } from "@/lib/resume-highlight-terms"

interface HighlightedTextProps {
  text: string
  keywords?: string[]
  highlightKpis?: boolean
  className?: string
}

interface TextSegment {
  value: string
  type: "plain" | "keyword" | "kpi"
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Builds text segments with keyword and KPI highlights.
 */
function buildSegments(text: string, keywords: string[], highlightKpis: boolean): TextSegment[] {
  if (!text) {
    return []
  }

  const matches: Array<{ start: number; end: number; type: "keyword" | "kpi" }> = []

  if (highlightKpis) {
    KPI_HIGHLIGHT_PATTERN.lastIndex = 0
    let kpiMatch = KPI_HIGHLIGHT_PATTERN.exec(text)
    while (kpiMatch) {
      matches.push({
        start: kpiMatch.index,
        end: kpiMatch.index + kpiMatch[0].length,
        type: "kpi",
      })
      kpiMatch = KPI_HIGHLIGHT_PATTERN.exec(text)
    }
  }

  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)
  for (const keyword of sortedKeywords) {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi")
    let keywordMatch = pattern.exec(text)
    while (keywordMatch) {
      matches.push({
        start: keywordMatch.index,
        end: keywordMatch.index + keywordMatch[0].length,
        type: "keyword",
      })
      keywordMatch = pattern.exec(text)
    }
  }

  if (matches.length === 0) {
    return [{ value: text, type: "plain" }]
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  const merged: typeof matches = []
  for (const match of matches) {
    const last = merged[merged.length - 1]
    if (!last || match.start >= last.end) {
      merged.push(match)
      continue
    }
    if (match.end > last.end) {
      last.end = match.end
      last.type = match.type === "kpi" || last.type === "kpi" ? "kpi" : "keyword"
    }
  }

  const segments: TextSegment[] = []
  let cursor = 0

  for (const match of merged) {
    if (match.start > cursor) {
      segments.push({ value: text.slice(cursor, match.start), type: "plain" })
    }
    segments.push({ value: text.slice(match.start, match.end), type: match.type })
    cursor = match.end
  }

  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor), type: "plain" })
  }

  return segments
}

/**
 * Renders text with optional keyword and KPI highlights.
 */
export function HighlightedText({
  text,
  keywords = [],
  highlightKpis = true,
  className = "",
}: HighlightedTextProps) {
  const segments = buildSegments(text, keywords, highlightKpis)

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "keyword") {
          return (
            <span key={`${segment.value}-${index}`} className="resume-highlight-keyword">
              {segment.value}
            </span>
          )
        }
        if (segment.type === "kpi") {
          return (
            <span key={`${segment.value}-${index}`} className="resume-highlight-kpi">
              {segment.value}
            </span>
          )
        }
        return <span key={`${segment.value}-${index}`}>{segment.value}</span>
      })}
    </span>
  )
}

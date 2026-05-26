/**
 * Exports the resume as a single-page A4 PDF using an isolated iframe
 * (Google Sans + hex-only CSS) so layout and fonts match the preview.
 */

import {
  RESUME_SHEET_HEIGHT_PX,
  RESUME_SHEET_WIDTH_PX,
  applyResumeScale,
  calculateResumeScale,
  clearResumeScale,
} from "@/lib/resume-export-scale"

export interface ExportResumePdfOptions {
  filename: string
  /** Root element with id="resume-document". */
  element: HTMLElement
}


/**
 * Fetches the raw resume-export.css file text to inject inline into the isolated iframe.
 */
async function fetchExportCss(): Promise<string> {
  try {
    const response = await fetch(`/resume-export.css?v=${Date.now()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch stylesheet")
    }
    return await response.text()
  } catch (error) {
    console.error("Could not load export stylesheet:", error)
    return ""
  }
}

/**
 * Exports the resume preview element as a single-page A4 PDF.
 *
 * @param options - Filename and target element.
 */
export async function exportResumePdf(options: ExportResumePdfOptions): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.")
  }

  const { element, filename } = options
  if (!element) {
    throw new Error("Resume preview not found.")
  }

  await document.fonts.ready

  // 1. Fetch raw CSS to inject inline
  const cssText = await fetchExportCss()

  // 2. Calculate the perfect page-fit scale factor
  const scale = calculateResumeScale(element)

  // 3. Clone element and apply scale variable inline so the backend print parser receives it
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.setProperty("--resume-scale", String(scale))

  try {
    // 4. Request server-side pixel-perfect vector compilation
    const response = await fetch("/api/download-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: clone.outerHTML,
        css: cssText,
        scale,
        filename,
      }),
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error || "Server failed to compile high-fidelity PDF")
    }

    // 4. Retrieve PDF binary data and trigger direct file download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    // Cleanup
    window.URL.revokeObjectURL(url)
    a.remove()
  } finally {
    // Restore normal interactive scale on the preview page
    clearResumeScale(element)
  }
}

/**
 * Returns the scale that will be applied for the current resume content.
 */
export function getResumeExportScale(element: HTMLElement): number {
  return calculateResumeScale(element)
}

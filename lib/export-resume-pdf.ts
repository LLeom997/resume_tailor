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
    const response = await fetch("/resume-export.css")
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

  // 1. Fetch raw CSS to inject inline, keeping tailwind's modern oklch/lab colors out of export context
  const cssText = await fetchExportCss()

  // 2. Apply print/PDF scale factor to live element to measure content height
  const scale = applyResumeScale(element)
  let iframe: HTMLIFrameElement | null = null

  try {
    // 3. Create isolated iframe
    iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      `width:${RESUME_SHEET_WIDTH_PX}px`,
      `height:${RESUME_SHEET_HEIGHT_PX}px`,
      "border:0",
      "opacity:0.001",
      "pointer-events:none",
      "z-index:-99999",
    ].join(";")

    const clone = element.cloneNode(true) as HTMLElement
    clone.style.setProperty("--resume-scale", String(scale))

    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) {
      throw new Error("PDF export frame is unavailable.")
    }

    doc.open()
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    ${cssText}
  </style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div id="resume-print-root" style="width:${RESUME_SHEET_WIDTH_PX}px;height:${RESUME_SHEET_HEIGHT_PX}px;background:#fff;">
    ${clone.outerHTML}
  </div>
</body>
</html>`)
    doc.close()

    // 4. Wait for fonts to load in the iframe context
    const fonts = doc.fonts
    if (fonts?.load) {
      await Promise.all([
        fonts.load('400 11px "Google Sans Text"'),
        fonts.load('500 11px "Google Sans Text"'),
        fonts.load('600 11px "Google Sans Text"'),
        fonts.load('700 28px "Google Sans Text"'),
        fonts.ready,
      ])
    }

    const captureRoot = doc.getElementById("resume-print-root")
    if (!captureRoot) {
      throw new Error("Resume export root not found.")
    }

    const html2canvas = (await import("html2canvas")).default
    const canvas = await html2canvas(captureRoot, {
      scale: 2.5, // High resolution scale for extremely crisp text rendering
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: RESUME_SHEET_WIDTH_PX,
      height: RESUME_SHEET_HEIGHT_PX,
      windowWidth: RESUME_SHEET_WIDTH_PX,
      windowHeight: RESUME_SHEET_HEIGHT_PX,
    })

    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait",
      compress: true,
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageData = canvas.toDataURL("image/jpeg", 1.0)

    pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST")
    pdf.save(filename)
  } finally {
    // 5. Restore normal interactive scale on the preview page
    clearResumeScale(element)
    iframe?.remove()
  }
}

/**
 * Returns the scale that will be applied for the current resume content.
 */
export function getResumeExportScale(element: HTMLElement): number {
  return calculateResumeScale(element)
}

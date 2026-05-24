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
 * Waits for Google Sans (and other fonts) inside the export iframe.
 */
async function waitForIframeFonts(doc: Document): Promise<void> {
  const fonts = doc.fonts
  if (!fonts?.load) {
    return
  }

  await Promise.all([
    fonts.load('400 11px "Google Sans Text"'),
    fonts.load('500 11px "Google Sans Text"'),
    fonts.load('600 11px "Google Sans Text"'),
    fonts.load('700 28px "Google Sans Text"'),
    fonts.ready,
  ])
}

/**
 * Builds a hidden iframe that contains only the resume + export stylesheet.
 */
function createExportIframe(element: HTMLElement, scale: number): HTMLIFrameElement {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${RESUME_SHEET_WIDTH_PX}px`,
    `height:${RESUME_SHEET_HEIGHT_PX}px`,
    "border:0",
    "visibility:hidden",
  ].join(";")

  const exportCssUrl = new URL("/resume-export.css", window.location.origin).href
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.setProperty("--resume-scale", String(scale))

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    throw new Error("Could not create PDF export frame.")
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${exportCssUrl}" />
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div id="resume-print-root" style="width:${RESUME_SHEET_WIDTH_PX}px;height:${RESUME_SHEET_HEIGHT_PX}px;overflow:hidden;background:#fff;">
    ${clone.outerHTML}
  </div>
</body>
</html>`)
  doc.close()

  return iframe
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

  const scale = applyResumeScale(element)
  let iframe: HTMLIFrameElement | null = null

  try {
    iframe = createExportIframe(element, scale)
    const doc = iframe.contentDocument
    if (!doc) {
      throw new Error("PDF export frame is unavailable.")
    }

    await waitForIframeFonts(doc)

    const captureRoot = doc.getElementById("resume-print-root")
    if (!captureRoot) {
      throw new Error("Resume export root not found.")
    }

    const html2canvas = (await import("html2canvas")).default
    const canvas = await html2canvas(captureRoot, {
      scale: 2,
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
    const imageData = canvas.toDataURL("image/jpeg", 0.98)

    pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST")
    pdf.save(filename)
  } finally {
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

/** A4 height at 96dpi — matches resume sheet design. */
export const RESUME_SHEET_WIDTH_PX = 794
export const RESUME_SHEET_HEIGHT_PX = 1123

/**
 * Scales resume content to fit one A4 page when content overflows.
 *
 * @param element - Resume root element.
 * @returns Scale factor between 0 and 1.
 */
export function calculateResumeScale(element: HTMLElement): number {
  const contentHeight = element.scrollHeight
  if (contentHeight <= RESUME_SHEET_HEIGHT_PX) {
    return 1
  }
  return RESUME_SHEET_HEIGHT_PX / contentHeight
}

/**
 * Applies print/PDF scale CSS variable on the resume element.
 *
 * @param element - Resume root element.
 */
export function applyResumeScale(element: HTMLElement): number {
  const scale = calculateResumeScale(element)
  element.style.setProperty("--resume-scale", String(scale))
  return scale
}

/**
 * Clears export scale overrides after print.
 *
 * @param element - Resume root element.
 */
export function clearResumeScale(element: HTMLElement): void {
  element.style.removeProperty("--resume-scale")
}

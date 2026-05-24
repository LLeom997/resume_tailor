/**
 * Generates a unique id for resume list items.
 */
export function newResumeItemId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

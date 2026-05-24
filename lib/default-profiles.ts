/**
 * Default career profiles seeded for new sessions.
 */
export const DEFAULT_CAREER_PROFILES = [
  {
    name: "NPD Engineer",
    slug: "npd-engineer",
    description: "New product development, NPI, and end-to-end product ownership roles.",
  },
  {
    name: "Design Engineer",
    slug: "design-engineer",
    description: "Mechanical design, CAD, DFM/DFA, and product architecture roles.",
  },
  {
    name: "CAE Engineer",
    slug: "cae-engineer",
    description: "Simulation, FEA, validation, and digital twin focused roles.",
  },
] as const

/**
 * Builds a URL-safe slug from a profile name.
 */
export function slugifyProfileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

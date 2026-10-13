/**
 * Up to two initials for an avatar: "Ada Okafor" -> "AO". Hyphenated names count as separate
 * words ("Okonkwo-Adeyemi Logistics" -> "OA", as in the design), and words that don't start with
 * a letter ("&", "123") are skipped.
 */
export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

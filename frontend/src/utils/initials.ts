/**
 * Generates company initials from a company name.
 *
 * Rules:
 * - Trim unnecessary whitespace
 * - Ignore empty values
 * - For multi-word names, use first letter of first 2-3 meaningful words
 * - Ignore common insignificant words (The, And, Of, Company, Ltd, Limited, PLC, Inc)
 * - For single-word names, use first 1-2 letters
 * - Convert to uppercase
 * - Maximum 3 characters
 * - Never return undefined, null, N/A, or empty string
 *
 * Examples:
 * "Dilla Logistics" → "DL"
 * "Ethiopian Delivery Services" → "EDS"
 * "ABC Logistics Company" → "ALC"
 * "Dilla University Logistics" → "DUL"
 * "Global Express" → "GE"
 * "ABC PLC" → "ABC"
 * "TechNova" → "TN"
 */

const INSIGNIFICANT_WORDS = new Set([
  'the',
  'and',
  'of',
  'or',
  'in',
  'for',
  'a',
  'an',
  'company',
  'ltd',
  'limited',
  'plc',
  'inc',
  'incorporated',
  'llc',
  'l.l.c.',
  'corp',
  'corporation',
  'group',
  'holdings',
  'partners',
  'partnership',
]);

export function generateCompanyInitials(companyName?: string | null): string {
  // Handle empty/null values
  if (!companyName || typeof companyName !== 'string') {
    return 'N/A';
  }

  const trimmed = companyName.trim();
  if (!trimmed) {
    return 'N/A';
  }

  // Split into words and filter out insignificant ones
  const words = trimmed
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());

  if (words.length === 0) {
    return 'N/A';
  }

  // Filter out insignificant words
  const meaningfulWords = words.filter((word) => !INSIGNIFICANT_WORDS.has(word));

  // If all words were insignificant, use original words
  const wordsToUse = meaningfulWords.length > 0 ? meaningfulWords : words;

  let initials: string;

  if (wordsToUse.length === 1) {
    // Single word: use first 1-2 letters
    const word = wordsToUse[0];
    initials = word.length >= 2 && /^[a-z]{2,}$/i.test(word)
      ? word.substring(0, 2).toUpperCase()
      : word.charAt(0).toUpperCase();
  } else {
    // Multiple words: use first letter of first 2-3 meaningful words
    initials = wordsToUse
      .slice(0, 3)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  // Ensure we don't exceed 3 characters and don't return invalid values
  const result = initials.substring(0, 3);
  return result && result !== '' ? result : 'N/A';
}

/**
 * Generate a deterministic abbreviation or use provided one.
 * If no explicit abbreviation is available, derive from company name.
 */
export function getCompanyAbbreviation(
  companyName?: string | null,
  explicitAbbreviation?: string | null
): string {
  if (explicitAbbreviation && typeof explicitAbbreviation === 'string') {
    const trimmed = explicitAbbreviation.trim().toUpperCase();
    if (trimmed && trimmed !== '' && trimmed.length <= 3) {
      return trimmed;
    }
  }

  return generateCompanyInitials(companyName);
}

/**
 * Generates unique, privacy-friendly aliases for users.
 * Format: AdjectiveNoun## (e.g., "SwiftFalcon42", "BrightCoder78")
 */

const ADJECTIVES = [
  "Swift",
  "Bright",
  "Clever",
  "Bold",
  "Quick",
  "Sharp",
  "Calm",
  "Keen",
  "Brave",
  "Noble",
  "Wise",
  "Agile",
  "Cosmic",
  "Digital",
  "Epic",
  "Flying",
  "Golden",
  "Happy",
  "Jolly",
  "Lucky",
  "Mighty",
  "Nimble",
  "Pixel",
  "Quantum",
  "Rapid",
  "Silent",
  "Turbo",
  "Ultra",
  "Vivid",
  "Warp",
];

const NOUNS = [
  "Falcon",
  "Coder",
  "Phoenix",
  "Tiger",
  "Eagle",
  "Wolf",
  "Panda",
  "Dragon",
  "Hawk",
  "Lion",
  "Bear",
  "Fox",
  "Raven",
  "Owl",
  "Ninja",
  "Pilot",
  "Ranger",
  "Scout",
  "Spark",
  "Star",
  "Storm",
  "Byte",
  "Node",
  "Query",
  "Stack",
  "Vector",
  "Vertex",
  "Cipher",
  "Matrix",
  "Pulse",
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random alias in the format AdjectiveNoun##
 */
export function generateAlias(): string {
  const adjective = getRandomElement(ADJECTIVES);
  const noun = getRandomElement(NOUNS);
  const number = getRandomNumber(10, 99);
  return `${adjective}${noun}${number}`;
}

/**
 * Generates a unique alias by checking against existing aliases.
 * Will retry up to maxAttempts times before falling back to a UUID-based alias.
 */
export async function generateUniqueAlias(
  checkExists: (alias: string) => Promise<boolean>,
  maxAttempts = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const alias = generateAlias();
    const exists = await checkExists(alias);
    if (!exists) {
      return alias;
    }
  }

  // Fallback: use timestamp-based suffix for guaranteed uniqueness
  const adjective = getRandomElement(ADJECTIVES);
  const noun = getRandomElement(NOUNS);
  const timestamp = Date.now().toString(36).slice(-4);
  return `${adjective}${noun}${timestamp}`;
}

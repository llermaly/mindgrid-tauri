/**
 * Session name utilities - similar to Crystal's worktreeNameGenerator
 */

/**
 * Convert a session name to a valid worktree name
 * - Converts spaces to hyphens
 * - Lowercases
 * - Removes invalid characters
 * - Limits to 30 characters
 */
export function convertSessionNameToWorktreeName(sessionName: string): string {
  return sessionName
    .toLowerCase()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/[^a-z0-9-]/g, "") // remove invalid chars
    .replace(/-+/g, "-") // consolidate hyphens
    .replace(/^-|-$/g, "") // trim hyphens
    .slice(0, 30);
}

/**
 * Sanitize a session name for display
 * - Allows alphanumeric, spaces, and hyphens
 * - Normalizes spaces
 * - Limits to 30 characters
 */
export function sanitizeSessionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

/**
 * Validate session name
 * Returns error message or null if valid
 */
export function validateSessionName(name: string): string | null {
  if (!name.trim()) {
    return "Session name is required";
  }

  if (name.length > 30) {
    return "Session name must be 30 characters or less";
  }

  // Check for invalid characters
  const invalidChars = /[~^:?*[\]\\]/;
  if (invalidChars.test(name)) {
    return "Session name contains invalid characters";
  }

  // Cannot start/end with dot or slash
  if (/^[./]|[./]$/.test(name)) {
    return "Session name cannot start or end with . or /";
  }

  // No consecutive dots
  if (/\.\./.test(name)) {
    return "Session name cannot contain consecutive dots";
  }

  return null;
}

/**
 * Generate a default session name
 */
export function generateDefaultSessionName(existingCount: number): string {
  return `Session ${existingCount + 1}`;
}

/**
 * Generate session name suggestions based on common patterns
 */
export function getSessionNameSuggestions(): string[] {
  return [
    "Feature Development",
    "Bug Fix",
    "Refactoring",
    "Testing",
    "Documentation",
    "Exploration",
    "Prototype",
    "Review",
  ];
}

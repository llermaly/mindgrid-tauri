export interface UsageLimit {
  percentage: number;
  resetTime: string;
  spent?: number;
  limit?: number;
}

export interface UsageData {
  currentSession?: UsageLimit;
  currentWeekAll?: UsageLimit;
  currentWeekSonnet?: UsageLimit;
  extraUsage?: UsageLimit;
  rawOutput?: string;
}

/**
 * Strip ANSI escape codes and other terminal control sequences from text
 */
function stripAnsi(text: string): string {
  // Remove ANSI escape sequences (colors, cursor movement, etc.)
  // eslint-disable-next-line no-control-regex
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Standard ANSI escape codes like [39m, [0m, etc.
    .replace(/\[[\?]?[0-9;]*[a-zA-Z]/g, '') // Bracket sequences without ESC (sometimes ESC gets lost)
    .replace(/\x1b\][^\x07]*\x07/g, '')    // OSC sequences
    .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '') // Other escape sequences
    .replace(/\x1b/g, '')                   // Any remaining ESC characters
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '') // Control characters except \n \r
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/�/g, ''); // Remove replacement characters (corrupted unicode)
}

/**
 * Parses the ASCII output from `claude /usage` command
 *
 * Example input:
 * Current session
 * ██▌                                                5% used
 * Resets 2:59pm (America/Panama)
 *
 * Current week (all models)
 * ██████████████████████████████████                 68% used
 * Resets 7:59pm (America/Panama)
 */
export function parseUsageOutput(output: string): UsageData {
  // Clean the output of ANSI codes
  const cleanOutput = stripAnsi(output);

  const result: UsageData = {
    rawOutput: output,
  };

  // Helper to clean reset time strings
  const cleanResetTime = (str: string): string => {
    return stripAnsi(str).trim();
  };

  // Parse Current session
  const sessionMatch = cleanOutput.match(/Current session\s+[\s\S]*?(\d+)% used\s+Resets ([^\n]+)/i);
  if (sessionMatch) {
    result.currentSession = {
      percentage: parseInt(sessionMatch[1], 10),
      resetTime: cleanResetTime(sessionMatch[2]),
    };
  }

  // Parse Current week (all models)
  const weekAllMatch = cleanOutput.match(/Current week \(all models\)\s+[\s\S]*?(\d+)% used\s+Resets ([^\n]+)/i);
  if (weekAllMatch) {
    result.currentWeekAll = {
      percentage: parseInt(weekAllMatch[1], 10),
      resetTime: cleanResetTime(weekAllMatch[2]),
    };
  }

  // Parse Current week (Sonnet only)
  const weekSonnetMatch = cleanOutput.match(/Current week \(Sonnet only\)\s+[\s\S]*?(\d+)% used\s+Resets ([^\n]+)/i);
  if (weekSonnetMatch) {
    result.currentWeekSonnet = {
      percentage: parseInt(weekSonnetMatch[1], 10),
      resetTime: cleanResetTime(weekSonnetMatch[2]),
    };
  }

  // Parse Extra usage - handles multiline format:
  // Extra usage
  // ██████████████████████████████████████████████████ 102% used
  // $20.48 / $20.00 spent · Resets Jan 1, 2026 (America/Panama)
  const extraSectionMatch = cleanOutput.match(/Extra usage[\s\S]*?(\d+)% used[\s\S]*?(Resets [^\n]+)/i);
  if (extraSectionMatch) {
    const percentage = parseInt(extraSectionMatch[1], 10);
    const resetTime = cleanResetTime(extraSectionMatch[2].replace(/^Resets\s*/i, ''));

    // Try to extract spent/limit from the same section
    const spentMatch = cleanOutput.match(/\$([\d.]+)\s*\/\s*\$([\d.]+)\s+spent/i);

    result.extraUsage = {
      percentage,
      resetTime,
      spent: spentMatch ? parseFloat(spentMatch[1]) : undefined,
      limit: spentMatch ? parseFloat(spentMatch[2]) : undefined,
    };
  }

  return result;
}

/**
 * Get the critical usage metric for display
 * Prioritizes session limit, falls back to weekly if session not available
 */
export function getCriticalUsage(data: UsageData): { percentage: number; label: string; resetTime?: string } {
  // Prioritize session limit
  if (data.currentSession) {
    return { percentage: data.currentSession.percentage, label: 'Session', resetTime: data.currentSession.resetTime };
  }
  // Fall back to weekly (all models)
  if (data.currentWeekAll) {
    return { percentage: data.currentWeekAll.percentage, label: 'Weekly', resetTime: data.currentWeekAll.resetTime };
  }
  // Fall back to weekly (sonnet)
  if (data.currentWeekSonnet) {
    return { percentage: data.currentWeekSonnet.percentage, label: 'Weekly', resetTime: data.currentWeekSonnet.resetTime };
  }
  // Fall back to extra usage
  if (data.extraUsage) {
    return { percentage: data.extraUsage.percentage, label: 'Extra', resetTime: data.extraUsage.resetTime };
  }
  return { percentage: 0, label: 'Unknown' };
}

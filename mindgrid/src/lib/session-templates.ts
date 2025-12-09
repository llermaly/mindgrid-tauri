/**
 * Session Templates
 * Pre-defined templates for quickly creating multiple sessions
 */

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  sessionCount: number;
  icon: "compare" | "prompts" | "lanes" | "stages" | "ab" | "custom";
  defaultNames?: string[];
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: "compare-models",
    name: "Compare Models",
    description: "Test the same prompt across 5 different models",
    sessionCount: 5,
    icon: "compare",
    defaultNames: ["Opus", "Sonnet", "Haiku", "GPT-4", "Claude"],
  },
  {
    id: "try-prompts",
    name: "Try Prompts",
    description: "Test 5 different prompts for the same task",
    sessionCount: 5,
    icon: "prompts",
    defaultNames: ["Prompt A", "Prompt B", "Prompt C", "Prompt D", "Prompt E"],
  },
  {
    id: "feature-lanes",
    name: "Feature Lanes",
    description: "Work on 3 separate features in parallel",
    sessionCount: 3,
    icon: "lanes",
    defaultNames: ["Feature 1", "Feature 2", "Feature 3"],
  },
  {
    id: "refactor-stages",
    name: "Refactor Stages",
    description: "Plan, implement, review, and test a refactor",
    sessionCount: 4,
    icon: "stages",
    defaultNames: ["Plan", "Implement", "Review", "Test"],
  },
  {
    id: "a-b-testing",
    name: "A/B Testing",
    description: "Compare two different approaches",
    sessionCount: 2,
    icon: "ab",
    defaultNames: ["Approach A", "Approach B"],
  },
];

export function getTemplateById(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateIcon(icon: SessionTemplate["icon"]): string {
  const icons: Record<SessionTemplate["icon"], string> = {
    compare: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    prompts: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    lanes: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
    stages: "M13 10V3L4 14h7v7l9-11h-7z",
    ab: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
    custom: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  };
  return icons[icon];
}

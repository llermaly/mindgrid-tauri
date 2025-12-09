/**
 * Project presets - predefined configurations for common workflows
 *
 * Model:
 * - Project contains Sessions
 * - Each Session = 1 git worktree + multiple Chats (agents)
 * - Chats are separate windows that share the same worktree
 * - Chat types: Research, Coding, Planning, Quick
 *
 * Presets define which chat types to open when creating a project.
 */

export type ChatType = 'research' | 'coding' | 'planning' | 'quick';

export interface ChatTypeInfo {
  id: ChatType;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface ProjectPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  stack: string[];
  /** Chat types to open for the initial session */
  chatTypes: ChatType[];
  defaults: {
    model: string;
    permissionMode: 'auto' | 'approve' | 'manual';
  };
}

// Chat types - each opens as a separate window in the same session/worktree
export const CHAT_TYPES: Record<ChatType, ChatTypeInfo> = {
  research: {
    id: 'research',
    name: 'Research',
    icon: 'R',
    description: 'Explores codebase, answers questions, investigates',
    color: '#22c55e', // green
  },
  coding: {
    id: 'coding',
    name: 'Coding',
    icon: 'C',
    description: 'Implements features, fixes bugs, writes code',
    color: '#3b82f6', // blue
  },
  planning: {
    id: 'planning',
    name: 'Planning',
    icon: 'P',
    description: 'Designs architecture, creates plans, organizes tasks',
    color: '#a855f7', // purple
  },
  quick: {
    id: 'quick',
    name: 'Quick',
    icon: 'Q',
    description: 'Quick questions and short tasks',
    color: '#f97316', // orange
  },
};

export const PRESETS: ProjectPreset[] = [
  {
    id: 'full-workflow',
    name: 'Full Workflow',
    description: 'Research, Plan, Code, Quick questions - all in one session',
    icon: 'FW',
    color: '#6366f1',
    stack: [],
    chatTypes: ['research', 'planning', 'coding', 'quick'],
    defaults: {
      model: 'opus',
      permissionMode: 'auto',
    },
  },
  {
    id: 'research-code',
    name: 'Research + Code',
    description: 'Research to understand, then code to implement',
    icon: 'RC',
    color: '#22c55e',
    stack: [],
    chatTypes: ['research', 'coding'],
    defaults: {
      model: 'opus',
      permissionMode: 'auto',
    },
  },
  {
    id: 'focused-coding',
    name: 'Focused Coding',
    description: 'Just one coding terminal, minimal setup',
    icon: 'FC',
    color: '#3b82f6',
    stack: [],
    chatTypes: ['coding'],
    defaults: {
      model: 'opus',
      permissionMode: 'auto',
    },
  },
  {
    id: 'exploration',
    name: 'Exploration',
    description: 'Research and quick questions for exploring a codebase',
    icon: 'EX',
    color: '#22c55e',
    stack: [],
    chatTypes: ['research', 'quick'],
    defaults: {
      model: 'opus',
      permissionMode: 'approve',
    },
  },
  {
    id: 'plan-first',
    name: 'Plan First',
    description: 'Start with planning, add coding when ready',
    icon: 'PF',
    color: '#a855f7',
    stack: [],
    chatTypes: ['planning', 'research'],
    defaults: {
      model: 'opus',
      permissionMode: 'approve',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just open the project, add chats as needed',
    icon: 'M',
    color: '#6b7280',
    stack: [],
    chatTypes: [],
    defaults: {
      model: 'opus',
      permissionMode: 'approve',
    },
  },
];

export function getPresetById(id: string): ProjectPreset | undefined {
  return PRESETS.find(p => p.id === id);
}

export function getChatTypeInfo(type: ChatType): ChatTypeInfo {
  return CHAT_TYPES[type];
}

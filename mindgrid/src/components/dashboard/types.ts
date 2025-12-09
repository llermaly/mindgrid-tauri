import type { ProjectPreset } from "../../lib/presets";

export type DashboardSessionStatus = "running" | "waiting" | "idle" | "completed";

export interface DashboardSession {
  id: string;
  name: string;
  status: DashboardSessionStatus;
  agents: string[];
  updatedAt: number;
  initialPrompt?: string;
  isRunning?: boolean; // Has an open run/preview window
}

export interface DashboardGitInfo {
  repo: string;
  branch: string;
  defaultBranch: string;
  lastCommit?: { message: string; hash: string; time: string } | null;
  uncommittedChanges?: number;
  aheadBehind?: { ahead: number; behind: number };
  diff?: { filesChanged?: number; additions?: number; deletions?: number };
}

export interface DashboardActivity {
  id: string;
  sessionName: string;
  message: string;
  time: string;
  agent: "coding" | "research";
  projectId: string;
  timestamp: number;
}

export interface DashboardProject {
  id: string;
  name: string;
  path: string;
  presetId: string;
  sessions: DashboardSession[];
  lastOpened: string;
  isDetached?: boolean;
  isArchived?: boolean;
  github?: DashboardGitInfo;
  chatHistory: DashboardActivity[];
  stats: { totalSessions: number; totalMessages: number; filesModified: number };
  buildCommand?: string | null;
  runCommand?: string | null;
}

export interface DashboardPresetMap {
  [id: string]: ProjectPreset;
}

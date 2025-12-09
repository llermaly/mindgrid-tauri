import { invoke } from "@tauri-apps/api/core";

export interface PathInfo {
  projectPath: string;
  projectName: string;
  worktreeName: string | null;
  worktreePath: string | null;
  isWorktree: boolean;
  shortPath: string; // Shortened display path
}

/**
 * Parses a path to extract project and worktree information
 */
export function parsePath(path: string | undefined | null): PathInfo | null {
  if (!path) return null;

  // Normalize path (remove trailing slash if present)
  const normalizedPath = path.replace(/\/+$/, '');

  // Check if this is a worktree path: /path/to/project/.mindgrid/worktrees/<worktree-name>
  const worktreeMatch = normalizedPath.match(/^(.+)\/\.mindgrid\/worktrees\/([^/]+)/);
  if (worktreeMatch) {
    const projectPath = worktreeMatch[1];
    const worktreeName = worktreeMatch[2];
    const projectName = projectPath.split('/').pop() || projectPath;
    const worktreePath = `${projectPath}/.mindgrid/worktrees/${worktreeName}`;
    return {
      projectPath,
      projectName,
      worktreeName,
      worktreePath,
      isWorktree: true,
      shortPath: `${projectName}/${worktreeName}`,
    };
  }

  // Regular project path - extract just the folder name
  const projectName = normalizedPath.split('/').pop() || normalizedPath;
  return {
    projectPath: normalizedPath,
    projectName,
    worktreeName: null,
    worktreePath: null,
    isWorktree: false,
    shortPath: projectName,
  };
}

/**
 * Shortens a path for display, keeping only the last N segments
 */
export function shortenPath(path: string | undefined | null, segments: number = 2): string {
  if (!path) return '';

  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length <= segments) {
    return path;
  }

  return '.../' + parts.slice(-segments).join('/');
}

/**
 * Opens a path in VS Code editor
 */
export async function openInEditor(path: string): Promise<void> {
  try {
    await invoke("open_in_editor", { path });
  } catch (error) {
    console.error("Failed to open in editor", error);
  }
}

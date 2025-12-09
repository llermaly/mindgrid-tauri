// Git status types matching the Rust backend

export type GitState = 'clean' | 'modified' | 'untracked' | 'ahead' | 'behind' | 'diverged' | 'conflict' | 'detached' | 'unknown';

export interface GitStatus {
  state: GitState;
  ahead?: number;
  behind?: number;
  additions?: number;
  deletions?: number;
  files_changed?: number;
  is_ready_to_merge?: boolean;
  has_uncommitted_changes?: boolean;
  has_untracked_files?: boolean;
  current_branch?: string;
  main_branch?: string;
  is_detached?: boolean;
}

export interface GitDiffFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface GitDiffResult {
  files: GitDiffFile[];
  total_additions: number;
  total_deletions: number;
}

export interface GitFileDiff {
  path: string;
  status: string;
  patch: string;
  old_value: string;
  new_value: string;
  is_binary: boolean;
}

export interface GitErrorDetails {
  title: string;
  message: string;
  command?: string;
  commands?: string[];
  output: string;
  workingDirectory?: string;
  projectPath?: string;
  isRebaseConflict?: boolean;
  hasConflicts?: boolean;
  conflictingFiles?: string[];
  conflictingCommits?: {
    ours: string[];
    theirs: string[];
  };
}

// Git status configuration for UI display
export interface GitStatusConfig {
  color: string;
  bgColor: string;
  icon: 'check' | 'edit' | 'arrow-down' | 'alert' | 'git-merge' | 'help';
  label: string;
  description: string;
}

export function getGitStatusConfig(gitStatus: GitStatus): GitStatusConfig {
  // Ready to Merge - Has commits, clean working directory, not behind
  if (gitStatus.is_ready_to_merge ||
      (gitStatus.ahead && gitStatus.ahead > 0 &&
       !gitStatus.has_uncommitted_changes &&
       !gitStatus.has_untracked_files &&
       (!gitStatus.behind || gitStatus.behind === 0))) {
    const commitCount = gitStatus.ahead || 0;
    return {
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      icon: 'git-merge',
      label: 'Ready',
      description: `${commitCount} commit${commitCount !== 1 ? 's' : ''} ready to merge`
    };
  }

  // Conflict Risk - Has commits but also behind main
  if (gitStatus.ahead && gitStatus.ahead > 0 && gitStatus.behind && gitStatus.behind > 0) {
    const mostlyBehind = gitStatus.behind >= 5 * gitStatus.ahead && gitStatus.ahead <= 2;

    if (mostlyBehind) {
      return {
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-500/20',
        icon: 'arrow-down',
        label: 'Behind',
        description: `${gitStatus.behind} behind, ${gitStatus.ahead} ahead`
      };
    }

    return {
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/20',
      icon: 'alert',
      label: 'Diverged',
      description: `${gitStatus.ahead} ahead, ${gitStatus.behind} behind - potential conflicts`
    };
  }

  // Detached HEAD state (like Crystal - treat as error condition)
  if (gitStatus.state === 'detached' || gitStatus.is_detached) {
    return {
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/20',
      icon: 'alert',
      label: 'Detached',
      description: 'Detached HEAD state - checkout a branch to continue'
    };
  }

  // Active merge conflicts
  if (gitStatus.state === 'conflict') {
    return {
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      icon: 'alert',
      label: 'Conflict',
      description: 'Has merge conflicts - resolve before continuing'
    };
  }

  // Uncommitted changes
  if (gitStatus.has_uncommitted_changes || gitStatus.has_untracked_files ||
      gitStatus.state === 'modified' || gitStatus.state === 'untracked') {
    const filesChanged = gitStatus.files_changed || 0;
    let description = '';

    if (gitStatus.ahead && gitStatus.ahead > 0 && filesChanged > 0) {
      description = `${gitStatus.ahead} commit${gitStatus.ahead !== 1 ? 's' : ''} + uncommitted`;
    } else if (gitStatus.has_untracked_files) {
      description = 'Untracked files';
    } else if (filesChanged > 0) {
      description = `${filesChanged} file${filesChanged !== 1 ? 's' : ''} modified`;
    } else {
      description = 'Uncommitted changes';
    }

    return {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      icon: 'edit',
      label: 'Modified',
      description
    };
  }

  // Behind only
  if (gitStatus.behind && gitStatus.behind > 0 && (!gitStatus.ahead || gitStatus.ahead === 0)) {
    return {
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-500/20',
      icon: 'arrow-down',
      label: 'Behind',
      description: `${gitStatus.behind} commit${gitStatus.behind !== 1 ? 's' : ''} behind`
    };
  }

  // Ahead only (without uncommitted changes - handled above for ready to merge)
  if (gitStatus.ahead && gitStatus.ahead > 0) {
    return {
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      icon: 'git-merge',
      label: 'Ahead',
      description: `${gitStatus.ahead} commit${gitStatus.ahead !== 1 ? 's' : ''} ahead`
    };
  }

  // Up to date
  if (gitStatus.state === 'clean') {
    return {
      color: 'text-zinc-500',
      bgColor: 'bg-zinc-600/20',
      icon: 'check',
      label: 'Clean',
      description: 'Up to date with main'
    };
  }

  // Unknown state
  return {
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-600/20',
    icon: 'help',
    label: 'Unknown',
    description: 'Unable to determine git status'
  };
}

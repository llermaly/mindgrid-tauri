import React from 'react';
import type { GitStatus } from '../lib/git-types';
import { getGitStatusConfig } from '../lib/git-types';

interface GitStatusIndicatorProps {
  gitStatus?: GitStatus | null;
  isLoading?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium';
}

// Icon components
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 12 16 16 12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const GitMergeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M6 21V9a9 9 0 0 0 9 9" />
  </svg>
);

const HelpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle className="opacity-25" cx="12" cy="12" r="10" />
    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
  </svg>
);

const iconComponents = {
  'check': CheckIcon,
  'edit': EditIcon,
  'arrow-down': ArrowDownIcon,
  'alert': AlertIcon,
  'git-merge': GitMergeIcon,
  'help': HelpIcon,
};

export const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = React.memo(({
  gitStatus,
  isLoading = false,
  onClick,
  size = 'small',
}) => {
  const sizeConfig = {
    small: {
      container: 'px-1.5 py-0.5',
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: 'gap-0.5',
    },
    medium: {
      container: 'px-2 py-1',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-1',
    },
  }[size];

  // Loading state
  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center justify-center ${sizeConfig.container} ${sizeConfig.text} rounded border border-zinc-600 bg-zinc-700/50 text-zinc-400`}
        title="Checking git status..."
      >
        <LoaderIcon className={sizeConfig.icon} />
      </span>
    );
  }

  // No status available
  if (!gitStatus) {
    return null;
  }

  const config = getGitStatusConfig(gitStatus);
  const IconComponent = iconComponents[config.icon];

  // Build tooltip
  let tooltip = config.description;
  if (gitStatus.files_changed) {
    tooltip += `\n${gitStatus.files_changed} file${gitStatus.files_changed !== 1 ? 's' : ''} changed`;
    if (gitStatus.additions || gitStatus.deletions) {
      tooltip += ` (+${gitStatus.additions || 0}/-${gitStatus.deletions || 0})`;
    }
  }
  if (gitStatus.current_branch) {
    tooltip += `\nBranch: ${gitStatus.current_branch}`;
  }

  // Determine primary count to display
  let primaryCount = 0;
  if (gitStatus.ahead && gitStatus.ahead > 0) {
    primaryCount = gitStatus.ahead;
  } else if (gitStatus.files_changed && gitStatus.files_changed > 0) {
    primaryCount = gitStatus.files_changed;
  } else if (gitStatus.behind && gitStatus.behind > 0) {
    primaryCount = gitStatus.behind;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <span
      className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.container} ${sizeConfig.text} rounded border border-zinc-600 ${config.bgColor} ${config.color} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      title={tooltip}
      onClick={onClick ? handleClick : undefined}
    >
      <IconComponent className={sizeConfig.icon} />
      {primaryCount > 0 && (
        <span className="font-medium tabular-nums">
          {primaryCount > 99 ? '99+' : primaryCount}
        </span>
      )}
    </span>
  );
});

GitStatusIndicator.displayName = 'GitStatusIndicator';

import React, { useState } from 'react';
import type { GitErrorDetails } from '../lib/git-types';

interface GitErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errorDetails: GitErrorDetails | null;
  onResolveWithClaude?: () => void;
}

// Icon components
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function getGitErrorTips(errorDetails: GitErrorDetails): string[] {
  const tips: string[] = [];

  if (errorDetails.isRebaseConflict || errorDetails.hasConflicts) {
    tips.push('Use Claude Code to automatically resolve conflicts');
    tips.push('Or manually resolve conflicts in each file, then run "git add <file>" and "git rebase --continue"');
    tips.push('To abort the rebase, run "git rebase --abort"');
  } else if (errorDetails.message.includes('CONFLICT')) {
    tips.push('Merge conflicts need to be resolved before continuing');
    tips.push('Open conflicting files and look for conflict markers (<<<<<<<, =======, >>>>>>>)');
    tips.push('After resolving, stage the files and complete the merge');
  } else if (errorDetails.message.includes('uncommitted')) {
    tips.push('Commit or stash your changes before proceeding');
    tips.push('Use "git stash" to temporarily save changes');
  } else if (errorDetails.message.includes('not found') || errorDetails.message.includes('does not exist')) {
    tips.push('Check that the branch or file exists');
    tips.push('Run "git fetch" to update remote tracking branches');
  } else {
    tips.push('Check the git output above for more details');
    tips.push('Try running the command manually in terminal for more context');
  }

  return tips;
}

export const GitErrorDialog: React.FC<GitErrorDialogProps> = ({
  isOpen,
  onClose,
  errorDetails,
  onResolveWithClaude,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !errorDetails) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetails.output || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const tips = getGitErrorTips(errorDetails);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--accent-error-muted)] border-b border-[var(--border-default)]">
          <AlertCircleIcon className="w-5 h-5 text-[var(--accent-error)] shrink-0" />
          <span className="text-[var(--accent-error)] font-medium flex-1 truncate">{errorDetails.title}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Message */}
          <div>
            <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Error Message</h3>
            <div className="p-3 rounded-lg bg-[var(--accent-error-muted)] border border-[var(--accent-error)]">
              <p className="text-[var(--accent-error)] text-sm">{errorDetails.message}</p>
            </div>
          </div>

          {/* Conflicting Files */}
          {errorDetails.conflictingFiles && errorDetails.conflictingFiles.length > 0 && (
            <div className="rounded-lg border-2 border-[var(--accent-warning)] bg-[var(--accent-warning-muted)] p-3">
              <h3 className="text-sm font-semibold text-[var(--accent-warning)] mb-2 flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4" />
                Conflicting Files
              </h3>
              <div className="bg-[var(--bg-primary)]/50 rounded-lg p-2">
                <ul className="text-sm font-mono space-y-1">
                  {errorDetails.conflictingFiles.map((file, idx) => (
                    <li key={idx} className="text-[var(--text-primary)]">
                      <span className="text-[var(--text-tertiary)] mr-2">*</span>
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Conflicting Commits */}
          {errorDetails.conflictingCommits && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {errorDetails.conflictingCommits.ours.length > 0 && (
                <div className="rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary-muted)] p-3">
                  <h4 className="text-xs font-semibold text-[var(--accent-primary)] mb-2">Your Commits</h4>
                  <div className="text-xs font-mono space-y-1 max-h-24 overflow-y-auto">
                    {errorDetails.conflictingCommits.ours.map((commit, idx) => (
                      <div key={idx} className="text-[var(--text-primary)] truncate">{commit}</div>
                    ))}
                  </div>
                </div>
              )}
              {errorDetails.conflictingCommits.theirs.length > 0 && (
                <div className="rounded-lg border border-[var(--accent-success)] bg-[var(--accent-success-muted)] p-3">
                  <h4 className="text-xs font-semibold text-[var(--accent-success)] mb-2">Incoming Commits</h4>
                  <div className="text-xs font-mono space-y-1 max-h-24 overflow-y-auto">
                    {errorDetails.conflictingCommits.theirs.map((commit, idx) => (
                      <div key={idx} className="text-[var(--text-primary)] truncate">{commit}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Git Output */}
          <div className="rounded-lg border-2 border-[var(--accent-error)] bg-[var(--accent-error-muted)] p-3">
            <h3 className="text-sm font-semibold text-[var(--accent-error)] mb-2 flex items-center gap-2">
              <FileTextIcon className="w-4 h-4" />
              Git Output
            </h3>
            <div className="bg-[var(--bg-primary)]/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono text-[var(--text-primary)]">
                {errorDetails.output || 'No output available'}
              </pre>
            </div>
          </div>

          {/* Working Directory */}
          {errorDetails.workingDirectory && (
            <div>
              <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Working Directory</h3>
              <div className="p-2 rounded-lg bg-[var(--bg-hover)]/50 border border-[var(--border-default)]">
                <p className="text-[var(--text-primary)] text-sm font-mono truncate">{errorDetails.workingDirectory}</p>
              </div>
            </div>
          )}

          {/* Commands */}
          {(errorDetails.command || errorDetails.commands) && (
            <div>
              <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                {errorDetails.commands ? 'Git Commands Executed' : 'Git Command'}
              </h3>
              <div className="space-y-2">
                {errorDetails.command && (
                  <div className="p-2 rounded-lg bg-[var(--bg-hover)]/50 border border-[var(--border-default)]">
                    <p className="font-mono text-sm text-[var(--text-primary)]">{errorDetails.command}</p>
                  </div>
                )}
                {errorDetails.commands?.map((cmd, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[var(--bg-hover)]/50 border border-[var(--border-default)]">
                    <p className="font-mono text-sm text-[var(--text-primary)]">{cmd}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Troubleshooting Tips */}
          <div className="rounded-lg bg-[var(--accent-primary-muted)] border border-[var(--accent-primary)] p-3">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-[var(--accent-primary)] mb-1">Troubleshooting Tips</h4>
                <ul className="text-sm text-[var(--text-primary)] space-y-1">
                  {tips.map((tip, idx) => (
                    <li key={idx}>* {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
          <div>
            {(errorDetails.isRebaseConflict || errorDetails.hasConflicts) && onResolveWithClaude && (
              <button
                onClick={onResolveWithClaude}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/80 text-white flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                Use Claude to Resolve
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" />
                  Copy Output
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

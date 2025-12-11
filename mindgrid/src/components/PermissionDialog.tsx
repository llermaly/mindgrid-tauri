import React, { useState } from 'react';
import type { PermissionRequest } from '../lib/claude-types';
import { HIGH_RISK_TOOLS } from '../lib/claude-types';

interface PermissionDialogProps {
  request: PermissionRequest | null;
  onAllow: (requestId: string) => void;
  onDeny: (requestId: string, reason?: string) => void;
}

// Icon components
const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
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

// Tool descriptions for user-friendly display
const TOOL_DESCRIPTIONS: Record<string, string> = {
  Bash: 'Execute a shell command',
  Write: 'Create or overwrite a file',
  Edit: 'Modify part of a file',
  MultiEdit: 'Make multiple edits to a file',
  Delete: 'Delete a file',
  Read: 'Read file contents',
  Glob: 'Search for files by pattern',
  Grep: 'Search file contents',
  NotebookEdit: 'Edit a Jupyter notebook',
  WebFetch: 'Fetch content from a URL',
  WebSearch: 'Search the web',
  Task: 'Spawn a sub-agent',
};

function getToolDescription(toolName: string): string {
  return TOOL_DESCRIPTIONS[toolName] || `Execute ${toolName} tool`;
}

function isHighRiskTool(toolName: string): boolean {
  return HIGH_RISK_TOOLS.includes(toolName as typeof HIGH_RISK_TOOLS[number]);
}

function formatToolInput(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

// Extract key info from tool input for display
function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash':
      return String(input.command || '').slice(0, 100);
    case 'Write':
    case 'Read':
    case 'Delete':
      return String(input.file_path || input.path || '');
    case 'Edit':
    case 'MultiEdit':
      return String(input.file_path || '');
    case 'Glob':
      return String(input.pattern || '');
    case 'Grep':
      return String(input.pattern || '');
    case 'WebFetch':
      return String(input.url || '');
    case 'WebSearch':
      return String(input.query || '');
    default:
      return '';
  }
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  request,
  onAllow,
  onDeny,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!request) return null;

  const isHighRisk = isHighRiskTool(request.toolName);
  const summary = getToolSummary(request.toolName, request.toolInput);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] ${
          isHighRisk ? 'bg-[var(--accent-warning-muted)]' : 'bg-[var(--accent-primary-muted)]'
        }`}>
          {isHighRisk ? (
            <AlertTriangleIcon className="w-5 h-5 text-[var(--accent-warning)] shrink-0" />
          ) : (
            <ShieldIcon className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${isHighRisk ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-primary)]'}`}>
              Permission Required
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] truncate">
              {getToolDescription(request.toolName)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Tool name and summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${
                isHighRisk
                  ? 'bg-[var(--accent-warning-muted)] text-[var(--accent-warning)]'
                  : 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
              }`}>
                {request.toolName}
              </span>
              {isHighRisk && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-[var(--accent-error-muted)] text-[var(--accent-error)]">
                  High Risk
                </span>
              )}
            </div>

            {summary && (
              <div className="p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)]">
                <code className="text-sm text-[var(--text-primary)] font-mono break-all">
                  {summary.length > 200 ? `${summary.slice(0, 200)}...` : summary}
                </code>
              </div>
            )}
          </div>

          {/* Warning for high-risk tools */}
          {isHighRisk && (
            <div className="p-3 rounded-lg bg-[var(--accent-warning-muted)] border border-[var(--accent-warning)]">
              <p className="text-xs text-[var(--accent-warning)]">
                This tool can modify files or execute commands on your system.
                Review the details before approving.
              </p>
            </div>
          )}

          {/* Expandable details */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {showDetails ? 'Hide details' : 'Show details'}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] max-h-48 overflow-auto">
                <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap">
                  {formatToolInput(request.toolInput)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
          <button
            onClick={() => onDeny(request.id)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] flex items-center gap-2"
          >
            <XIcon className="w-4 h-4" />
            Deny
          </button>
          <button
            onClick={() => onAllow(request.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
              isHighRisk
                ? 'bg-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/80 text-white'
                : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white'
            }`}
          >
            <CheckIcon className="w-4 h-4" />
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};

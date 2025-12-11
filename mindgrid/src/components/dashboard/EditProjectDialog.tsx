import { useState, useEffect, useRef } from "react";
import type { DashboardProject } from "./types";
import type { PermissionMode, CommitMode } from "../../lib/claude-types";
import { ModelSelector } from "../ModelSelector";

interface EditProjectDialogProps {
  isOpen: boolean;
  project: DashboardProject;
  defaultModel?: string | null;
  defaultPermissionMode?: PermissionMode;
  defaultCommitMode?: CommitMode;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    defaultModel?: string | null;
    defaultPermissionMode?: PermissionMode;
    defaultCommitMode?: CommitMode;
    buildCommand?: string | null;
    runCommand?: string | null;
  }) => Promise<void>;
}

const PERMISSION_MODES: { value: PermissionMode; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Ask for permission on each action" },
  { value: "acceptEdits", label: "Accept Edits", description: "Auto-approve file edits, ask for commands" },
  { value: "bypassPermissions", label: "Bypass All", description: "Auto-approve all actions" },
];

const COMMIT_MODES: { value: CommitMode; label: string; description: string }[] = [
  { value: "disabled", label: "Disabled", description: "No automatic commits" },
  { value: "checkpoint", label: "Checkpoint", description: "Auto-commit after each Claude response" },
  { value: "structured", label: "Structured", description: "Create structured commits" },
];

export function EditProjectDialog({
  isOpen,
  project,
  defaultModel: initialDefaultModel,
  defaultPermissionMode: initialPermissionMode = "default",
  defaultCommitMode: initialCommitMode = "checkpoint",
  onClose,
  onSave,
}: EditProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [defaultModel, setDefaultModel] = useState<string | null>(initialDefaultModel || null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(initialPermissionMode);
  const [commitMode, setCommitMode] = useState<CommitMode>(initialCommitMode);
  const [buildCommand, setBuildCommand] = useState(project.buildCommand || "");
  const [runCommand, setRunCommand] = useState(project.runCommand || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDefaultModel(initialDefaultModel || null);
      setPermissionMode(initialPermissionMode);
      setCommitMode(initialCommitMode);
      setBuildCommand(project.buildCommand || "");
      setRunCommand(project.runCommand || "");
      setError(null);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, project, initialDefaultModel, initialPermissionMode, initialCommitMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim() !== project.name ? name.trim() : undefined,
        defaultModel,
        defaultPermissionMode: permissionMode,
        defaultCommitMode: commitMode,
        buildCommand: buildCommand.trim() || null,
        runCommand: runCommand.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Project</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Project Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              placeholder="Enter project name"
            />
          </div>

          {/* Path (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Path
            </label>
            <div className="px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-tertiary)] font-mono truncate">
              {project.path}
            </div>
          </div>

          {/* Default Model */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Default Model
            </label>
            <div className="flex items-center gap-2">
              <ModelSelector
                value={defaultModel}
                onChange={setDefaultModel}
                size="md"
              />
              {defaultModel && (
                <button
                  onClick={() => setDefaultModel(null)}
                  className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                  title="Clear model selection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Model used by default when creating new sessions
            </p>
          </div>

          {/* Default Permission Mode */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Default Permission Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PERMISSION_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPermissionMode(mode.value)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    permissionMode === mode.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Default Commit Mode */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Default Commit Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMIT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setCommitMode(mode.value)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    commitMode === mode.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Build Command */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Build Command
            </label>
            <input
              type="text"
              value={buildCommand}
              onChange={(e) => setBuildCommand(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-mono text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              placeholder="e.g., npm run build"
            />
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Command to build the project before running
            </p>
          </div>

          {/* Run Command */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Run Command
            </label>
            <input
              type="text"
              value={runCommand}
              onChange={(e) => setRunCommand(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-mono text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              placeholder="e.g., npm run dev"
            />
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Command to run the project for previews
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[var(--accent-error)]/30 rounded-lg text-sm text-[var(--accent-error)]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-tertiary)]">
            Cmd+Enter to save
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

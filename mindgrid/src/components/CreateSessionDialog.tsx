import { useState, useEffect, useRef } from "react";
import {
  validateSessionName,
  convertSessionNameToWorktreeName,
  generateDefaultSessionName,
  getSessionNameSuggestions,
} from "../lib/session-utils";
import { ModelSelector } from "./ModelSelector";
import type { PermissionMode, CommitMode } from "../lib/claude-types";

export interface SessionConfig {
  name: string;
  prompt: string;
  model: string | null;
  permissionMode: PermissionMode;
  commitMode: CommitMode;
  toolType: "claude" | "codex" | "none";
}

interface CreateSessionDialogProps {
  isOpen: boolean;
  projectName: string;
  existingSessionCount: number;
  onClose: () => void;
  onCreate: (config: SessionConfig) => Promise<void>;
}

const PERMISSION_MODES: { value: PermissionMode; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Prompts for permission" },
  { value: "acceptEdits", label: "Accept Edits", description: "Auto-accepts edits" },
  { value: "bypassPermissions", label: "Bypass", description: "Skip all prompts" },
];

const COMMIT_MODES: { value: CommitMode; label: string; description: string }[] = [
  { value: "checkpoint", label: "Checkpoint", description: "Auto-commit after responses" },
  { value: "structured", label: "Structured", description: "Logical change commits" },
  { value: "disabled", label: "Disabled", description: "No auto commits" },
];

export function CreateSessionDialog({
  isOpen,
  projectName,
  existingSessionCount,
  onClose,
  onCreate,
}: CreateSessionDialogProps) {
  const [sessionName, setSessionName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [commitMode, setCommitMode] = useState<CommitMode>("checkpoint");
  const [toolType, setToolType] = useState<"claude" | "codex" | "none">("claude");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setSessionName(generateDefaultSessionName(existingSessionCount));
      setPrompt("");
      setModel(null);
      setPermissionMode("default");
      setCommitMode("checkpoint");
      setToolType("claude");
      setShowAdvanced(false);
      setError(null);
      setIsCreating(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, existingSessionCount]);

  const handleNameChange = (value: string) => {
    setSessionName(value);
    setError(validateSessionName(value));
  };

  const handleSubmit = async () => {
    const validationError = validateSessionName(sessionName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({
        name: sessionName.trim(),
        prompt: prompt.trim(),
        model,
        permissionMode,
        commitMode,
        toolType,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !error && sessionName.trim()) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const worktreeName = convertSessionNameToWorktreeName(sessionName);
  const suggestions = getSessionNameSuggestions();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-800 border border-zinc-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">
            New Session
          </h2>
          <p className="text-sm text-zinc-400">
            Create a new session in <span className="text-zinc-300">{projectName}</span>
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Session Name Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Session Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={sessionName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Feature Development"
              className={`w-full px-4 py-2.5 bg-zinc-900 border rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
                error
                  ? "border-red-500 focus:ring-red-500/50"
                  : "border-zinc-600 focus:ring-blue-500/50 focus:border-blue-500"
              }`}
              maxLength={30}
            />
            {error ? (
              <p className="mt-1.5 text-sm text-red-400">{error}</p>
            ) : (
              <p className="mt-1.5 text-xs text-zinc-500">
                {sessionName.length}/30 characters
              </p>
            )}
          </div>

          {/* Worktree Name Preview */}
          {worktreeName && (
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Git worktree:</p>
              <p className="text-sm font-mono text-zinc-300">{worktreeName}</p>
            </div>
          )}

          {/* Quick Suggestions */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleNameChange(suggestion)}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Prompt */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Initial Prompt <span className="text-zinc-500">(Optional)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to work on..."
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
            />
          </div>

          {/* AI Tool Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              AI Tool
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "claude", label: "Claude", icon: "C", color: "blue" },
                { value: "codex", label: "Codex", icon: "X", color: "green" },
                { value: "none", label: "None", icon: "-", color: "zinc" },
              ].map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  onClick={() => setToolType(tool.value as typeof toolType)}
                  className={`p-3 rounded-lg border transition-colors ${
                    toolType === tool.value
                      ? tool.color === "blue"
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : tool.color === "green"
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                      : "border-zinc-700 hover:border-zinc-600 text-zinc-400"
                  }`}
                >
                  <div className="text-lg font-bold mb-1">{tool.icon}</div>
                  <div className="text-xs">{tool.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection - only when tool is selected */}
          {toolType !== "none" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Model
              </label>
              <ModelSelector
                value={model}
                onChange={setModel}
                allowedProviders={toolType === "codex" ? ["openai"] : ["anthropic"]}
              />
            </div>
          )}

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-zinc-700">
              {/* Permission Mode */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Permission Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PERMISSION_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setPermissionMode(mode.value)}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        permissionMode === mode.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className={`text-xs font-medium ${permissionMode === mode.value ? "text-blue-400" : "text-zinc-300"}`}>
                        {mode.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Commit Mode */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Commit Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMIT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setCommitMode(mode.value)}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        commitMode === mode.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className={`text-xs font-medium ${commitMode === mode.value ? "text-blue-400" : "text-zinc-300"}`}>
                        {mode.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Enter</kbd> create
            <span className="mx-2">|</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Esc</kbd> cancel
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!!error || !sessionName.trim() || isCreating}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

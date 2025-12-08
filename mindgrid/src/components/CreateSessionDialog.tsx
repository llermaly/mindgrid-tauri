import { useState, useEffect, useRef } from "react";
import {
  validateSessionName,
  convertSessionNameToWorktreeName,
  generateDefaultSessionName,
  getSessionNameSuggestions,
} from "../lib/session-utils";

interface CreateSessionDialogProps {
  isOpen: boolean;
  projectName: string;
  existingSessionCount: number;
  onClose: () => void;
  onCreate: (sessionName: string) => void;
}

export function CreateSessionDialog({
  isOpen,
  projectName,
  existingSessionCount,
  onClose,
  onCreate,
}: CreateSessionDialogProps) {
  const [sessionName, setSessionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setSessionName(generateDefaultSessionName(existingSessionCount));
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
      await onCreate(sessionName.trim());
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
        className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">
            New Session
          </h2>
          <p className="text-sm text-zinc-400">
            Create a new session in <span className="text-zinc-300">{projectName}</span>
          </p>
        </div>

        {/* Session Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Session Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={sessionName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Feature Development"
            className={`w-full px-4 py-3 bg-zinc-900 border rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
              error
                ? "border-red-500 focus:ring-red-500/50"
                : "border-zinc-600 focus:ring-blue-500/50 focus:border-blue-500"
            }`}
            maxLength={30}
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {sessionName.length}/30 characters
          </p>
        </div>

        {/* Worktree Name Preview */}
        {worktreeName && (
          <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Git worktree name:</p>
            <p className="text-sm font-mono text-zinc-300">{worktreeName}</p>
          </div>
        )}

        {/* Quick Suggestions */}
        <div className="mb-6">
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

        {/* Actions */}
        <div className="flex gap-3 justify-end">
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

        {/* Keyboard hints */}
        <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-center gap-4 text-xs text-zinc-500">
          <span><kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Enter</kbd> to create</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Esc</kbd> to cancel</span>
        </div>
      </div>
    </div>
  );
}

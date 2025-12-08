import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useClaudePty } from "../hooks/useClaudePty";
import type { ClaudeEvent, ParsedMessage, PermissionMode, CommitMode } from "../lib/claude-types";
import { COMMIT_MODE_INFO } from "../lib/claude-types";
import { debug } from "../stores/debugStore";
import { ModelSelector } from "./ModelSelector";
import { ContextUsagePopup } from "./ContextUsagePopup";
import { UsagePopup } from "./UsagePopup";
import { CodexUsagePopup } from "./CodexUsagePopup";
import { useCodexRunner } from "../hooks/useCodexRunner";
import { useUsageStore } from "../stores/usageStore";
import { getModelById } from "../lib/models";

interface PrInfo {
  number: number;
  title: string;
  state: string;
  url: string;
}

interface ChatUIProps {
  className?: string;
  cwd?: string;
  claudeSessionId?: string | null;
  messages: ParsedMessage[];
  model?: string | null;
  permissionMode?: PermissionMode;
  commitMode?: CommitMode;
  gitAhead?: number;
  sessionName?: string;
  ghAvailable?: boolean;
  onClaudeEvent?: (event: ClaudeEvent) => void;
  onClaudeMessage?: (message: ParsedMessage) => void;
  onPermissionModeChange?: (mode: PermissionMode) => void;
  onCommitModeChange?: (mode: CommitMode) => void;
  onModelChange?: (model: string) => void;
  onClearSession?: () => void;
  onGitPush?: () => Promise<{ success: boolean; error?: string }>;
  onGetPrInfo?: () => Promise<PrInfo | null>;
  onCreatePr?: (title: string, body: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  onMergePr?: (squash: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const PERMISSION_MODE_INFO: Record<PermissionMode, { label: string; description: string; color: string }> = {
  default: {
    label: 'Default',
    description: 'Prompts for permission on first use',
    color: 'text-zinc-400',
  },
  acceptEdits: {
    label: 'Accept Edits',
    description: 'Auto-accepts file edits',
    color: 'text-blue-400',
  },
  plan: {
    label: 'Plan Only',
    description: 'Read-only, no modifications',
    color: 'text-yellow-400',
  },
  bypassPermissions: {
    label: 'Bypass',
    description: 'Skip all prompts (dangerous)',
    color: 'text-red-400',
  },
};

const MESSAGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  user: { bg: "bg-blue-500/10", color: "text-blue-400", label: "You" },
  assistant: { bg: "bg-zinc-800/50", color: "text-zinc-300", label: "Assistant" },
  system: { bg: "bg-yellow-500/10", color: "text-yellow-400", label: "System" },
  tool: { bg: "bg-cyan-500/10", color: "text-cyan-400", label: "Tool" },
};

function MessageItem({ message }: { message: ParsedMessage }) {
  const [isExpanded, setIsExpanded] = useState(message.role !== "tool");
  const style = MESSAGE_STYLES[message.role] || MESSAGE_STYLES.assistant;

  const isToolUse = message.toolName && message.toolInput;
  const isToolResult = message.toolResult !== undefined;

  return (
    <div className={`rounded-lg ${style.bg} overflow-hidden`}>
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          message.role === "tool" ? "cursor-pointer" : ""
        }`}
        onClick={() => message.role === "tool" && setIsExpanded(!isExpanded)}
      >
        <span className={`text-xs font-medium ${style.color}`}>{style.label}</span>
        {message.toolName && (
          <span className="text-xs font-mono text-zinc-500">{message.toolName}</span>
        )}
        <span className="text-xs text-zinc-600 ml-auto">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        {message.role === "tool" && (
          <span className="text-zinc-500 text-xs">{isExpanded ? "v" : ">"}</span>
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3">
          {isToolUse && (
            <div className="text-xs text-zinc-400 font-mono bg-zinc-900/50 rounded p-2 mb-2 overflow-x-auto">
              <pre>{JSON.stringify(message.toolInput, null, 2)}</pre>
            </div>
          )}

          {isToolResult && (
            <div
              className={`text-xs font-mono rounded p-2 overflow-x-auto ${
                message.isError
                  ? "bg-red-500/10 text-red-400"
                  : "bg-zinc-900/50 text-cyan-300"
              }`}
            >
              <pre className="whitespace-pre-wrap">{message.toolResult}</pre>
            </div>
          )}

          {!isToolUse && !isToolResult && message.content && (
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">
              {message.content}
            </div>
          )}

          {message.usage && (
            <div className="flex gap-3 mt-2 text-xs text-zinc-500">
              <span>In: {message.usage.input_tokens}</span>
              <span>Out: {message.usage.output_tokens}</span>
              {message.cost !== undefined && (
                <span>${message.cost.toFixed(4)}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatUI({
  className = "",
  cwd,
  claudeSessionId,
  messages,
  model,
  permissionMode = 'default',
  commitMode = 'checkpoint',
  gitAhead = 0,
  sessionName = '',
  ghAvailable = false,
  onClaudeEvent,
  onClaudeMessage,
  onPermissionModeChange,
  onCommitModeChange,
  onModelChange,
  onClearSession,
  onGitPush,
  onGetPrInfo,
  onCreatePr,
  onMergePr,
}: ChatUIProps) {
  const [input, setInput] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showCommitDropdown, setShowCommitDropdown] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [prInfo, setPrInfo] = useState<PrInfo | null>(null);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [isMergingPr, setIsMergingPr] = useState(false);
  const [showPrDialog, setShowPrDialog] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showContextPopup, setShowContextPopup] = useState(false);
  const [contextPopupPos, setContextPopupPos] = useState({ x: 0, y: 0 });
  const [contextUsed, setContextUsed] = useState(0);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [showUsagePopup, setShowUsagePopup] = useState(false);
  const [usagePopupPos, setUsagePopupPos] = useState({ x: 0, y: 0 });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(['all']);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse cwd to extract project path and worktree name
  const pathInfo = useMemo(() => {
    if (!cwd) return null;

    // Normalize path (remove trailing slash if present)
    const normalizedCwd = cwd.replace(/\/+$/, '');

    // Check if this is a worktree path: /path/to/project/.mindgrid/worktrees/<worktree-name>
    const worktreeMatch = normalizedCwd.match(/^(.+)\/\.mindgrid\/worktrees\/([^/]+)/);
    if (worktreeMatch) {
      const projectPath = worktreeMatch[1];
      const worktreeName = worktreeMatch[2];
      const projectName = projectPath.split('/').pop() || projectPath;
      // Full worktree path for opening in editor
      const worktreePath = `${projectPath}/.mindgrid/worktrees/${worktreeName}`;
      return {
        projectPath,
        projectName,
        worktreeName,
        worktreePath,
        isWorktree: true,
      };
    }

    // Regular project path
    const projectName = normalizedCwd.split('/').pop() || normalizedCwd;
    return {
      projectPath: normalizedCwd,
      projectName,
      worktreeName: null,
      worktreePath: null,
      isWorktree: false,
    };
  }, [cwd]);

  const openInEditor = useCallback(async (path: string) => {
    try {
      await invoke("open_in_editor", { path });
    } catch (error) {
      debug.error("ChatUI", "Failed to open in editor", error);
    }
  }, []);

  // Parse context usage from events
  const handleClaudeEvent = useCallback((event: ClaudeEvent) => {
    // Check for context usage in result messages
    if (event.type === 'result' && event.modelUsage) {
      const usage = event.modelUsage;
      // Get the first model's usage (usually there's only one)
      const modelKey = Object.keys(usage)[0];
      if (modelKey && usage[modelKey]) {
        const modelUsage = usage[modelKey];
        const inputTokens = (modelUsage.inputTokens || 0) + (modelUsage.cacheReadInputTokens || 0);
        const contextWindow = modelUsage.contextWindow || 200000;
        const percentage = Math.round((inputTokens / contextWindow) * 100);
        setContextUsed(percentage);
      }
    }

    // Also check for system messages with context info
    if (event.type === 'system' && event.subtype === 'init') {
      if (event.context_tokens && event.context_window) {
        const percentage = Math.round((event.context_tokens / event.context_window) * 100);
        setContextUsed(percentage);
      }
    }

    // Forward to original handler
    onClaudeEvent?.(event);
  }, [onClaudeEvent]);

  const { isRunning, spawnClaude, sendMessage, kill } = useClaudePty({
    onEvent: handleClaudeEvent,
    onMessage: onClaudeMessage,
    onRawOutput: (data) => {
      // Pipe raw PTY output to debug panel for troubleshooting Claude replies
      debug.pty("ClaudeRaw", "PTY output", data.slice(0, 500));

      // Parse context usage from text output (fallback method)
      // Pattern: "76k/200k tokens (38%)" or "Context: 76000/200000 tokens"
      const contextMatch = data.match(/(\d+)k?\/(\d+)k?\s+tokens\s+\((\d+)%\)/i);
      if (contextMatch) {
        const percentage = parseInt(contextMatch[3], 10);
        setContextUsed(percentage);
      }
    },
  });

  const { runCodex, isRunning: isCodexRunning } = useCodexRunner({
    cwd,
    onComplete: (content) => {
      const assistantMessage: ParsedMessage = {
        id: `codex-${Date.now()}`,
        role: "assistant",
        content: content || "(no output)",
        timestamp: Date.now(),
      };
      onClaudeMessage?.(assistantMessage);
    },
    onError: (err) => {
      const assistantMessage: ParsedMessage = {
        id: `codex-${Date.now()}-error`,
        role: "assistant",
        content: `Codex error: ${err}`,
        timestamp: Date.now(),
        isError: true,
      };
      onClaudeMessage?.(assistantMessage);
    },
  });

  const activeAgent: "claude" | "codex" = useMemo(() => {
    const provider = getModelById(model || undefined)?.provider;
    if (provider === "openai") return "codex";
    return "claude";
  }, [model]);

  // Get usage data from global store
  const {
    claudeUsageData,
    claudeLoading,
    claudeError,
    codexUsageData,
    codexLoading,
    codexError,
    getClaudeCriticalUsage,
    getCodexCriticalUsage,
  } = useUsageStore();

  // Get critical usage for display
  const claudeCriticalUsage = getClaudeCriticalUsage();
  const codexCriticalUsage = getCodexCriticalUsage();

  // Use appropriate usage data based on active agent
  const criticalUsage = activeAgent === "codex" ? codexCriticalUsage : claudeCriticalUsage;
  const usageLoading = activeAgent === "codex" ? codexLoading : claudeLoading;
  const usageError = activeAgent === "codex" ? codexError : claudeError;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Rough context usage estimate based on message count
  useEffect(() => {
    const estimate = Math.min(95, Math.max(5, messages.length * 5));
    setContextUsed(estimate);
  }, [messages.length]);

  // Initialize config on mount (no "Start Claude" button needed)
  useEffect(() => {
    if (!hasStarted && activeAgent === "claude") {
      spawnClaude(cwd, claudeSessionId, permissionMode, model).then(() => setHasStarted(true));
    }
  }, [cwd, claudeSessionId, permissionMode, model, hasStarted, spawnClaude, activeAgent]);

  // Update config when permission mode or model changes
  useEffect(() => {
    if (hasStarted && activeAgent === "claude") {
      spawnClaude(cwd, claudeSessionId, permissionMode, model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionMode, model, activeAgent]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setInput("");

    // Immediately add user message to UI (don't wait for Claude to echo it)
    const userMessage: ParsedMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    console.log("[ChatUI] Adding user message immediately:", userMessage.id);
    onClaudeMessage?.(userMessage);

    // Send message through selected agent
    if (activeAgent === "codex") {
      await runCodex(message, model || undefined);
    } else {
      await sendMessage(message);
    }
  }, [input, sendMessage, onClaudeMessage, activeAgent, runCodex, model]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleKill = useCallback(async () => {
    await kill();
    setHasStarted(false);
  }, [kill]);

  const filteredMessages = useMemo(() => {
    if (activeFilters.includes('all')) return messages;
    return messages.filter((m) => {
      if (activeFilters.includes('thinking') && m.role === 'assistant' && m.content?.toLowerCase().includes('thinking')) return true;
      if (activeFilters.includes('text') && m.role === 'assistant') return true;
      if (activeFilters.includes('tool') && m.role === 'tool') return true;
      if (activeFilters.includes('user') && m.role === 'user') return true;
      return false;
    });
  }, [messages, activeFilters]);

  const handleAttachment = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const next = Array.from(files);
    setAttachments((prev) => [...prev, ...next]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleGitPush = useCallback(async () => {
    if (!onGitPush || isPushing) return;
    setIsPushing(true);
    setPushError(null);
    try {
      const result = await onGitPush();
      if (!result.success) {
        setPushError(result.error || "Failed to push to remote");
      } else {
        // Refresh PR info after push
        if (onGetPrInfo) {
          const info = await onGetPrInfo();
          setPrInfo(info);
        }
      }
    } catch (error) {
      setPushError(error instanceof Error ? error.message : "Failed to push to remote");
    } finally {
      setIsPushing(false);
    }
  }, [onGitPush, isPushing, onGetPrInfo]);

  // Fetch PR info on mount and after push (only if gh is available)
  useEffect(() => {
    if (ghAvailable && onGetPrInfo && cwd?.includes('.mindgrid/worktrees')) {
      onGetPrInfo().then(setPrInfo);
    }
  }, [ghAvailable, onGetPrInfo, cwd]);

  const handleCreatePr = useCallback(async () => {
    if (!onCreatePr || isCreatingPr) return;
    setIsCreatingPr(true);
    try {
      const result = await onCreatePr(prTitle || sessionName, prBody);
      if (result.success && result.url) {
        // Open PR URL in browser
        window.open(result.url, '_blank');
        setShowPrDialog(false);
        // Refresh PR info
        if (onGetPrInfo) {
          const info = await onGetPrInfo();
          setPrInfo(info);
        }
        // Show success message
        setSuccessMessage("PR created successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } finally {
      setIsCreatingPr(false);
    }
  }, [onCreatePr, isCreatingPr, prTitle, prBody, sessionName, onGetPrInfo]);

  const handleMergePr = useCallback(async () => {
    if (!onMergePr || isMergingPr) return;
    setIsMergingPr(true);
    try {
      const result = await onMergePr(true); // squash merge
      if (result.success) {
        setPrInfo(null); // PR is merged, clear info
        setSuccessMessage("PR merged successfully! Branch has been deleted.");
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } finally {
      setIsMergingPr(false);
    }
  }, [onMergePr, isMergingPr]);

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              activeAgent === "codex"
                ? (isCodexRunning ? "bg-blue-400 animate-pulse" : "bg-blue-500")
                : (isRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600")
            }`} />
            <span className="text-sm font-medium text-zinc-200">
              {activeAgent === "codex" ? "Codex" : "Claude"}
            </span>
            <span className="text-xs px-2 py-1 rounded border border-zinc-700 text-neutral-400">
              {activeAgent === "codex" ? (isCodexRunning ? "Running" : "Idle") : (isRunning ? "Running" : "Idle")}
            </span>
          </div>
          {onModelChange && (
            <ModelSelector
              value={model || null}
              onChange={onModelChange}
              size="sm"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setThinkingMode((v) => !v)}
              className={`px-2 py-1 rounded text-xs border ${thinkingMode ? "border-purple-500 text-purple-200 bg-purple-500/10" : "border-zinc-700 text-neutral-400"}`}
              title="Toggle thinking mode"
            >
              {thinkingMode ? "Thinking On" : "Thinking Off"}
            </button>
            {/* Context Usage Indicator with icon */}
            <div
              className="relative"
              onMouseEnter={(e) => {
                setContextPopupPos({ x: e.clientX, y: e.clientY });
                setShowContextPopup(true);
              }}
              onMouseLeave={() => setShowContextPopup(false)}
            >
              <span
                className={`flex items-center gap-1 cursor-help px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors text-xs ${
                  contextUsed > 80 ? 'text-red-400' : contextUsed > 50 ? 'text-yellow-400' : 'text-zinc-400'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                {contextUsed}%
              </span>
              {showContextPopup && (
                <ContextUsagePopup
                  contextUsed={contextUsed}
                  model={model}
                  position={contextPopupPos}
                />
              )}
            </div>
            {/* Account Usage Indicator with icon */}
            <div
              className="relative"
              onMouseEnter={(e) => {
                setUsagePopupPos({ x: e.clientX, y: e.clientY });
                setShowUsagePopup(true);
              }}
              onMouseLeave={() => setShowUsagePopup(false)}
            >
              {usageLoading ? (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-zinc-500"
                  title="Loading usage data..."
                >
                  <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="animate-pulse">...</span>
                </span>
              ) : criticalUsage ? (
                <span
                  className={`flex items-center gap-1 cursor-help px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors text-xs ${
                    criticalUsage.percentage > 80 ? 'text-red-400' : criticalUsage.percentage > 50 ? 'text-yellow-400' : 'text-zinc-400'
                  }`}
                  title={`${criticalUsage.label}: ${criticalUsage.percentage}%`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  {criticalUsage.percentage}%
                </span>
              ) : usageError ? (
                <span
                  className="flex items-center gap-1 cursor-help px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors text-xs text-zinc-600"
                  title={`Usage data unavailable: ${usageError}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  --
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-zinc-600"
                  title="No usage data"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  --
                </span>
              )}
              {showUsagePopup && (
                activeAgent === "codex" && codexUsageData ? (
                  <CodexUsagePopup
                    usageData={codexUsageData}
                    position={usagePopupPos}
                  />
                ) : claudeUsageData ? (
                  <UsagePopup
                    usageData={claudeUsageData}
                    position={usagePopupPos}
                  />
                ) : null
              )}
            </div>
            <button
              onClick={() => setFiltersExpanded((v) => !v)}
              className="px-2 py-1 rounded text-xs border border-zinc-700 text-neutral-400 hover:text-white hover:border-zinc-500"
              title="Toggle message filters"
            >
              Filters
            </button>
          </div>

          {/* Permission Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className={`text-xs px-2 py-1 rounded border border-zinc-600 hover:border-zinc-500 flex items-center gap-1 ${PERMISSION_MODE_INFO[permissionMode].color}`}
              title={PERMISSION_MODE_INFO[permissionMode].description}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {PERMISSION_MODE_INFO[permissionMode].label}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showModeDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModeDropdown(false)} />
                <div className="absolute top-full mt-1 left-0 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-20 py-1">
                  {(Object.keys(PERMISSION_MODE_INFO) as PermissionMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        onPermissionModeChange?.(mode);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 flex flex-col ${
                        mode === permissionMode ? 'bg-zinc-700/50' : ''
                      }`}
                    >
                      <span className={PERMISSION_MODE_INFO[mode].color}>
                        {PERMISSION_MODE_INFO[mode].label}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        {PERMISSION_MODE_INFO[mode].description}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Commit Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCommitDropdown(!showCommitDropdown)}
              className={`text-xs px-2 py-1 rounded border border-zinc-600 hover:border-zinc-500 flex items-center gap-1 ${COMMIT_MODE_INFO[commitMode].color}`}
              title={COMMIT_MODE_INFO[commitMode].description}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4" />
                <line x1="1.05" y1="12" x2="7" y2="12" />
                <line x1="17.01" y1="12" x2="22.96" y2="12" />
              </svg>
              {COMMIT_MODE_INFO[commitMode].label}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showCommitDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCommitDropdown(false)} />
                <div className="absolute top-full mt-1 left-0 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-20 py-1">
                  {(Object.keys(COMMIT_MODE_INFO) as CommitMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        onCommitModeChange?.(mode);
                        setShowCommitDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 flex flex-col ${
                        mode === commitMode ? 'bg-zinc-700/50' : ''
                      }`}
                    >
                      <span className={COMMIT_MODE_INFO[mode].color}>
                        {COMMIT_MODE_INFO[mode].label}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        {COMMIT_MODE_INFO[mode].description}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Push Button - show when there are commits ahead */}
          {onGitPush && gitAhead > 0 && (
            <div className="relative">
              <button
                onClick={handleGitPush}
                disabled={isPushing || isRunning}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  pushError
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : isPushing
                    ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
                title={pushError || (gitAhead > 0 ? `Push ${gitAhead} commit${gitAhead > 1 ? 's' : ''} to remote` : 'Push branch to remote')}
              >
                {isPushing ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
                {isPushing ? 'Pushing...' : (gitAhead > 0 ? `Push (${gitAhead})` : 'Push')}
              </button>
            </div>
          )}

          {/* Create PR Button - show for worktrees without PR */}
          {onCreatePr && cwd?.includes('.mindgrid/worktrees') && !prInfo && (
            <button
              onClick={() => {
                if (!ghAvailable) return;
                setPrTitle(sessionName);
                setPrBody(`Changes from session: ${sessionName}`);
                setShowPrDialog(true);
              }}
              disabled={isCreatingPr || gitAhead > 0 || !ghAvailable}
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                ghAvailable
                  ? 'bg-purple-600 hover:bg-purple-500 text-white disabled:bg-zinc-700 disabled:text-zinc-400'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
              title={
                !ghAvailable
                  ? "Install gh CLI for GitHub features (brew install gh)"
                  : gitAhead > 0
                  ? "Push changes first before creating PR"
                  : "Create Pull Request"
              }
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              Create PR
            </button>
          )}

          {/* PR Info & Merge Button - show when PR exists */}
          {prInfo && prInfo.state === 'open' && (
            <>
              <a
                href={prInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                title={`PR #${prInfo.number}: ${prInfo.title}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <line x1="6" y1="9" x2="6" y2="21" />
                </svg>
                #{prInfo.number}
              </a>
              {onMergePr && (
                <button
                  onClick={ghAvailable ? handleMergePr : undefined}
                  disabled={isMergingPr || !ghAvailable}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                    !ghAvailable
                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      : isMergingPr
                      ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                  title={!ghAvailable ? "Install gh CLI for GitHub features (brew install gh)" : "Squash and merge PR"}
                >
                  {isMergingPr ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                      <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                  )}
                  {isMergingPr ? 'Merging...' : 'Merge'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Session Button */}
          {messages.length > 0 && onClearSession && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
              title="Clear session"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}

          {isRunning && (
            <button
              onClick={handleKill}
              className="px-3 py-1 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-zinc-100"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Clear Session Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-zinc-200 mb-2">Clear Session</h3>
            <p className="text-xs text-zinc-400 mb-4">
              This will clear all messages and start a fresh conversation. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearSession?.();
                  setShowClearConfirm(false);
                  setHasStarted(false); // Reset to re-initialize
                }}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="text-sm">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto p-1 hover:bg-green-500 rounded"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create PR Dialog */}
      {showPrDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPrDialog(false)}>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-md mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-zinc-200 mb-3">Create Pull Request</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none text-zinc-200"
                  placeholder="PR title..."
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Description</label>
                <textarea
                  value={prBody}
                  onChange={(e) => setPrBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none text-zinc-200 min-h-[80px] resize-none"
                  placeholder="Describe your changes..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowPrDialog(false)}
                className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePr}
                disabled={isCreatingPr || !prTitle.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white flex items-center gap-1"
              >
                {isCreatingPr && (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                )}
                {isCreatingPr ? 'Creating...' : 'Create PR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message filters */}
      <div className="px-4 border-b border-zinc-800 bg-zinc-800/30 flex items-center gap-2">
        {filtersExpanded ? (
          <>
            {[
              { id: 'all', label: 'All' },
              { id: 'thinking', label: 'Thinking' },
              { id: 'text', label: 'Text' },
              { id: 'tool', label: 'Tools' },
              { id: 'user', label: 'User' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (f.id === 'all') {
                    setActiveFilters(['all']);
                  } else {
                    const isActive = activeFilters.includes(f.id);
                    const next = isActive
                      ? activeFilters.filter((x) => x !== f.id && x !== 'all')
                      : [...activeFilters.filter((x) => x !== 'all'), f.id];
                    setActiveFilters(next.length ? next : ['all']);
                  }
                }}
                className={`px-2 py-1 text-xs rounded ${
                  activeFilters.includes(f.id)
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setFiltersExpanded(false)}
              className="ml-auto px-2 py-1 text-xs text-neutral-500 hover:text-white"
              title="Hide filters"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={() => setFiltersExpanded(true)}
            className="text-xs text-neutral-400 hover:text-white py-2 flex items-center gap-1"
            title="Show filters"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M4 9h16M6 14h12M9 19h6" />
            </svg>
            Filters
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <svg
              className="w-12 h-12 mb-4 text-zinc-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs text-zinc-600 mt-1">
              Type a message below to begin
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/30">
        <div className="flex gap-3 items-start">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 text-zinc-200 placeholder-zinc-500 min-h-[48px] max-h-[200px]"
            rows={1}
            disabled={false}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
          <div className="flex flex-col gap-2 text-xs text-neutral-400">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 hover:text-white"
              >
                Attach
              </button>
              <button
                onClick={() => setIsListening((v) => !v)}
                className={`px-2 py-1 rounded border ${isListening ? "border-green-500 text-green-300" : "border-zinc-700 text-neutral-400"} hover:border-zinc-500`}
              >
                {isListening ? "Listening..." : "Audio"}
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, idx) => (
                  <span key={`${file.name}-${idx}`} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px]">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachment}
        />
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {pathInfo && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => openInEditor(pathInfo.projectPath)}
                className="hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                title={`Open project in VS Code: ${pathInfo.projectPath}`}
              >
                {pathInfo.projectName}
              </button>
              {pathInfo.isWorktree && pathInfo.worktreeName && pathInfo.worktreePath && (
                <>
                  <span className="text-zinc-600">/</span>
                  <button
                    onClick={() => openInEditor(pathInfo.worktreePath!)}
                    className="hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                    title={`Open worktree in VS Code: ${pathInfo.worktreePath}`}
                  >
                    {pathInfo.worktreeName}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

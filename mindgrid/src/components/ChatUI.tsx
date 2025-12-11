import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useClaudePty } from "../hooks/useClaudePty";
import { useGeminiPty } from "../hooks/useGeminiPty";
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
import { Terminal } from "./Terminal";

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
  systemPrompt?: string | null;
  initialPrompt?: string;
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
  thinking: { bg: "bg-purple-500/10", color: "text-purple-300", label: "Thinking" },
};

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "code"; language?: string; content: string }
  | { type: "blockquote"; text: string }
  | { type: "divider" };

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(`([^`]+)`)|\*\*([^*]+)\*\*|(?:\*|_)([^*_]+)(?:\*|_)|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <code
          key={`${keyPrefix}-code-${parts.length}`}
          className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-50 border border-emerald-800/70 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
        >
          {match[2]}
        </code>
      );
    } else if (match[3]) {
      parts.push(
        <strong key={`${keyPrefix}-strong-${parts.length}`} className="text-zinc-50">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <em key={`${keyPrefix}-em-${parts.length}`} className="text-zinc-200">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      parts.push(
        <span key={`${keyPrefix}-strike-${parts.length}`} className="text-zinc-500 line-through decoration-emerald-500/80">
          {match[5]}
        </span>
      );
    } else if (match[6] && match[7]) {
      parts.push(
        <a
          key={`${keyPrefix}-link-${parts.length}`}
          href={match[7]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-emerald-300 hover:text-emerald-200 underline decoration-emerald-400/80 underline-offset-4"
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(line)) {
      blocks.push({ type: "divider" });
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.replace(/```/, "").trim() || undefined;
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // Skip closing fence
      blocks.push({ type: "code", language, content: codeLines.join("\n") });
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i += 1;
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s+/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "blockquote", text: quote.join(" ") });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "list", items, ordered: true });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks.length ? blocks : [{ type: "paragraph", text: content }];
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-200">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const sizes = { 1: "text-xl", 2: "text-lg", 3: "text-base" } as const;
          return (
            <h3 key={`h-${idx}`} className={`font-semibold text-emerald-200 ${sizes[block.level as 1 | 2 | 3] || "text-base"}`}>
              {renderInlineMarkdown(block.text, `heading-${idx}`)}
            </h3>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={`list-${idx}`}
              className={`${
                block.ordered ? "list-decimal" : "list-disc"
              } list-inside space-y-1 text-zinc-200 marker:text-emerald-300`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={`list-${idx}-${itemIdx}`}>{renderInlineMarkdown(item, `list-item-${idx}-${itemIdx}`)}</li>
              ))}
            </Tag>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={`code-${idx}`}
              className="relative bg-gradient-to-br from-zinc-900/80 via-zinc-900 to-emerald-900/30 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-100 overflow-x-auto shadow-inner shadow-emerald-900/30"
            >
              {block.language && (
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-emerald-200 bg-emerald-900/50 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                  {block.language}
                </span>
              )}
              <code className="font-mono whitespace-pre-wrap block">{block.content}</code>
            </pre>
          );
        }

        if (block.type === "blockquote") {
          return (
            <div
              key={`quote-${idx}`}
              className="border border-emerald-800/60 bg-emerald-950/30 text-emerald-100 rounded-lg px-3 py-2 shadow-[0_10px_40px_-28px_rgba(16,185,129,0.8)]"
            >
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-300 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 7h-4a4 4 0 0 0-4 4v6h6v-6H5" />
                  <path d="M23 7h-4a4 4 0 0 0-4 4v6h6v-6h-2" />
                </svg>
                <div className="text-sm">{renderInlineMarkdown(block.text, `blockquote-${idx}`)}</div>
              </div>
            </div>
          );
        }

        if (block.type === "divider") {
          return <div key={`div-${idx}`} className="h-px bg-gradient-to-r from-transparent via-emerald-800/70 to-transparent" />;
        }

        return (
          <p key={`p-${idx}`} className="text-zinc-200">
            {renderInlineMarkdown(block.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}

function MessageItem({ message }: { message: ParsedMessage }) {
  const [isExpanded, setIsExpanded] = useState(message.role !== "tool");
  const styleKey = message.isThinking ? "thinking" : message.role;
  const style = MESSAGE_STYLES[styleKey] || MESSAGE_STYLES.assistant;

  const isToolUse = message.toolName && message.toolInput;
  const isToolResult = message.toolResult !== undefined;
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`rounded-lg overflow-hidden border ${
        isAssistant
          ? "border-emerald-800/50 bg-gradient-to-br from-emerald-950/40 via-zinc-950/80 to-zinc-900 shadow-[0_10px_40px_-24px_rgba(16,185,129,0.55)]"
          : `${style.bg} border-zinc-800`
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          message.role === "tool" ? "cursor-pointer" : ""
        }`}
        onClick={() => message.role === "tool" && setIsExpanded(!isExpanded)}
      >
        <span className={`text-xs font-medium ${style.color}`}>
          {isAssistant ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {style.label}
            </span>
          ) : (
            style.label
          )}
        </span>
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
            isAssistant ? (
              message.isThinking ? (
                <div className="text-sm text-purple-200 italic whitespace-pre-wrap">
                  {message.content}
                </div>
              ) : (
                <div className="relative rounded-xl border border-emerald-900/60 bg-black/20 p-3 overflow-hidden shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-transparent blur-xl pointer-events-none" />
                  <div className="relative">
                    <MarkdownContent content={message.content} />
                  </div>
                </div>
              )
            ) : (
              <div className={`text-sm whitespace-pre-wrap ${message.isThinking ? "text-purple-200 italic" : "text-zinc-300"}`}>
                {message.content}
              </div>
            )
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
  systemPrompt,
  initialPrompt,
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
  const initialPromptSentRef = useRef(false);
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
  const [activeFilters, setActiveFilters] = useState<string[]>(['thinking', 'text', 'user']);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [modeDropdownPos, setModeDropdownPos] = useState({ top: 0, left: 0 });
  const [commitDropdownPos, setCommitDropdownPos] = useState({ top: 0, left: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeButtonRef = useRef<HTMLButtonElement>(null);
  const commitButtonRef = useRef<HTMLButtonElement>(null);
  const isContextQueryRef = useRef(false); // Track if current run is auto /context

  useEffect(() => {
    if (!filtersExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersExpanded]);

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
    onMessage: (message) => {
      if (!thinkingMode && message.isThinking) return;
      onClaudeMessage?.(message);
    },
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
    onExit: (code) => {
      // After successful Claude exit, auto-run /context to get accurate context usage
      // Skip if this exit was from a /context query itself (avoid infinite loop)
      if (code === 0 && !isContextQueryRef.current && claudeSessionId) {
        debug.info("ChatUI", "Auto-running /context after successful Claude exit");
        isContextQueryRef.current = true;
        // Small delay to ensure previous process fully cleaned up
        setTimeout(() => {
          sendMessage("/context").finally(() => {
            isContextQueryRef.current = false;
          });
        }, 100);
      } else if (isContextQueryRef.current) {
        debug.info("ChatUI", "Skipping auto /context (was context query)");
        isContextQueryRef.current = false;
      }
    },
  });

  const { runCodex, isRunning: isCodexRunning } = useCodexRunner({
    cwd,
    systemPrompt,
    onMessage: (message) => {
      if (!thinkingMode && message.isThinking) return;
      onClaudeMessage?.(message);
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

  const { spawnGemini, sendMessage: sendGeminiMessage, isRunning: isGeminiRunning, kill: killGemini } = useGeminiPty({
    onMessage: (message) => {
      onClaudeMessage?.(message);
    },
    onExit: (code) => {
      debug.info("ChatUI", "Gemini exited", { code });
    },
  });

  const activeAgent: "claude" | "codex" | "gemini" = useMemo(() => {
    const provider = getModelById(model || undefined)?.provider;
    if (provider === "openai") return "codex";
    if (provider === "google") return "gemini";
    return "claude";
  }, [model]);

  const isAnswering = activeAgent === "codex" ? isCodexRunning : activeAgent === "gemini" ? isGeminiRunning : isRunning;

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
  const criticalUsage = activeAgent === "codex" ? codexCriticalUsage : claudeCriticalUsage; // TODO: Add Gemini usage
  const usageLoading = activeAgent === "codex" ? codexLoading : claudeLoading;
  const usageError = activeAgent === "codex" ? codexError : claudeError;
  const agentLabel = activeAgent === "codex" ? "Codex" : activeAgent === "gemini" ? "Gemini" : "Claude";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!filtersExpanded) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFiltersExpanded(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [filtersExpanded]);

  // Allow closing filters with Escape for quick cleanup
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && filtersExpanded) {
        setFiltersExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersExpanded]);

  // Update dropdown positions when they open
  useEffect(() => {
    if (showModeDropdown && modeButtonRef.current) {
      const rect = modeButtonRef.current.getBoundingClientRect();
      setModeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [showModeDropdown]);

  useEffect(() => {
    if (showCommitDropdown && commitButtonRef.current) {
      const rect = commitButtonRef.current.getBoundingClientRect();
      setCommitDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [showCommitDropdown]);

  // Initialize config on mount (no "Start Claude" button needed)
  useEffect(() => {
    if (!hasStarted) {
      if (activeAgent === "claude") {
        spawnClaude(cwd, claudeSessionId, permissionMode, model, commitMode, systemPrompt).then(() => setHasStarted(true));
      } else if (activeAgent === "gemini") {
        spawnGemini(cwd, model).then(() => setHasStarted(true));
      } else if (activeAgent === "codex") {
        setHasStarted(true); // Codex is always "ready" via backend
      }
    }
  }, [cwd, claudeSessionId, permissionMode, model, commitMode, systemPrompt, hasStarted, spawnClaude, spawnGemini, activeAgent]);

  // Auto-send initial prompt after Claude starts (only if there are no existing messages)
  useEffect(() => {
    console.log("[ChatUI] Auto-send check:", { hasStarted, initialPrompt, initialPromptSentRef: initialPromptSentRef.current, messagesLength: messages.length });

    // Use ref to prevent multiple sends across re-renders
    if (hasStarted && initialPrompt && !initialPromptSentRef.current && messages.length === 0) {
      console.log("[ChatUI] Conditions met, will auto-send initial prompt");
      initialPromptSentRef.current = true;

      // Small delay to ensure Claude is ready to receive messages
      setTimeout(async () => {
        console.log("[ChatUI] Sending initial prompt now:", initialPrompt);
        const baseMessage = initialPrompt.trim();
        const message = thinkingMode
          ? `${baseMessage}\n\n(Think through the problem and share a brief reasoning summary before the final answer.)`
          : `${baseMessage}\n\n(Do not include thinking or reasoning steps; reply concisely with just the answer/output.)`;

        // Add user message to UI
        const userMessage: ParsedMessage = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: "user",
          content: baseMessage,
          timestamp: Date.now(),
        };
        onClaudeMessage?.(userMessage);

        // Send through appropriate agent
        if (activeAgent === "codex") {
          await runCodex(message, model || undefined);
        } else if (activeAgent === "gemini") {
          await sendGeminiMessage(message);
        } else {
          await sendMessage(message);
        }
      }, 1000); // Increased delay to ensure Claude PTY is fully ready
    }
  }, [hasStarted, initialPrompt, messages.length, thinkingMode, activeAgent, onClaudeMessage, sendMessage, runCodex, sendGeminiMessage, model]);

  // Update config when permission mode, model, commit mode, or system prompt changes
  useEffect(() => {
    if (hasStarted) {
      if (activeAgent === "claude") {
        spawnClaude(cwd, claudeSessionId, permissionMode, model, commitMode, systemPrompt);
      } else if (activeAgent === "gemini") {
        spawnGemini(cwd, model);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionMode, model, commitMode, systemPrompt, activeAgent]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const baseMessage = input.trim();
    const message = thinkingMode
      ? `${baseMessage}\n\n(Think through the problem and share a brief reasoning summary before the final answer.)`
      : `${baseMessage}\n\n(Do not include thinking or reasoning steps; reply concisely with just the answer/output.)`;
    setInput("");

    // Immediately add user message to UI (don't wait for Claude to echo it)
    const userMessage: ParsedMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "user",
      content: baseMessage,
      timestamp: Date.now(),
    };

    console.log("[ChatUI] Adding user message immediately:", userMessage.id);
    onClaudeMessage?.(userMessage);

    // Send message through selected agent
    if (activeAgent === "codex") {
      await runCodex(message, model || undefined);
    } else if (activeAgent === "gemini") {
      await sendGeminiMessage(message);
    } else {
      await sendMessage(message);
    }
  }, [input, sendMessage, onClaudeMessage, activeAgent, runCodex, sendGeminiMessage, model, thinkingMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleKill = useCallback(async () => {
    if (activeAgent === "gemini") {
      await killGemini();
    } else {
      await kill();
    }
    setHasStarted(false);
  }, [kill, killGemini, activeAgent]);

  const filteredMessages = useMemo(() => {
    if (activeFilters.includes('all')) return messages;
    return messages.filter((m) => {
      if (activeFilters.includes('thinking') && m.isThinking) return true;
      if (activeFilters.includes('text') && m.role === 'assistant' && !m.isThinking) return true;
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

  // Use ref for onGetPrInfo to avoid triggering effect on every render
  const onGetPrInfoRef = useRef(onGetPrInfo);
  useEffect(() => {
    onGetPrInfoRef.current = onGetPrInfo;
  }, [onGetPrInfo]);

  // Fetch PR info on mount (only if gh is available)
  // Note: We use a ref for the callback to prevent re-fetching on every render
  useEffect(() => {
    if (ghAvailable && onGetPrInfoRef.current && cwd?.includes('.mindgrid/worktrees')) {
      onGetPrInfoRef.current().then(setPrInfo);
    }
  }, [ghAvailable, cwd]); // Intentionally NOT including onGetPrInfo to prevent excessive API calls

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

  
  const headerClasses = isAnswering
    ? "relative overflow-hidden flex items-center justify-between px-4 py-3 border-b border-emerald-800/60 bg-gradient-to-r from-emerald-950/70 via-emerald-900/55 to-zinc-900/60 shadow-[0_10px_40px_-24px_rgba(16,185,129,0.6)]"
    : "relative overflow-hidden flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50";

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className={headerClasses}>
        {isAnswering && (
          <>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-emerald-500/10 via-emerald-400/10 to-transparent blur-lg animate-pulse" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent animate-pulse" />
          </>
        )}

        <div className="relative flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                activeAgent === "codex"
                  ? (isCodexRunning ? "bg-blue-400 animate-pulse" : "bg-blue-500")
                  : (isRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600")
              }`} />
              {onModelChange && (
                <ModelSelector
                  value={model || null}
                  onChange={onModelChange}
                  size="sm"
                />
              )}
              <span
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
                  isAnswering
                    ? "bg-emerald-900/60 border-emerald-600/70 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                    : "bg-zinc-800/70 border-zinc-700 text-neutral-400"
                }`}
              >
                <svg className={`w-3 h-3 ${isAnswering ? "text-emerald-200 animate-spin" : "text-zinc-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" strokeOpacity={isAnswering ? 0.6 : 0.25} />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span className="flex items-center gap-1">
                  {isAnswering ? `${agentLabel} answering` : `${agentLabel} idle`}
                  {isAnswering && (
                    <span className="flex items-center gap-0.5">
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className="w-1 h-2 rounded-full bg-emerald-200 animate-pulse"
                          style={{ animationDelay: `${bar * 120}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </span>
              </span>
            </div>
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
            </div>

          {/* Permission Mode Selector */}
          <div className="relative">
            <button
              ref={modeButtonRef}
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

            {showModeDropdown && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowModeDropdown(false)} />
                <div
                  className="fixed w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-[9999] py-1"
                  style={{ top: modeDropdownPos.top, left: modeDropdownPos.left }}
                >
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
              </>,
              document.body
            )}
          </div>

          {/* Commit Mode Selector */}
          <div className="relative">
            <button
              ref={commitButtonRef}
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

            {showCommitDropdown && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowCommitDropdown(false)} />
                <div
                  className="fixed w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-[9999] py-1"
                  style={{ top: commitDropdownPos.top, left: commitDropdownPos.left }}
                >
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
              </>,
              document.body
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
        </div>

        <div className="flex items-center gap-2">
          {/* Terminal Toggle Button */}
          {cwd && (
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`p-1.5 rounded hover:bg-zinc-700 ${showTerminal ? 'text-green-400' : 'text-zinc-400 hover:text-zinc-200'}`}
              title={showTerminal ? "Hide terminal" : "Show terminal"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </button>
          )}

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
              x
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
            {isAnswering ? (
              <>
                <svg
                  className="w-12 h-12 mb-4 text-blue-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-blue-400">Claude is thinking...</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Processing your request
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Terminal Panel */}
      {showTerminal && cwd && (
        <div className="h-64 border-t border-zinc-700 flex-shrink-0">
          <Terminal mode="raw" cwd={cwd} />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/30">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-emerald-500 text-zinc-200 placeholder-zinc-500 min-h-[54px] max-h-[200px] shadow-inner shadow-black/40"
              rows={1}
              disabled={false}
            />
            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-1.5 shadow-inner shadow-black/30">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full border border-transparent bg-zinc-800/80 hover:bg-zinc-700 hover:border-emerald-600 text-neutral-300 hover:text-emerald-200 transition-colors"
                title="Attach files"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12.6 6.6 7.2 12a3 3 0 0 0 0 4.2 3 3 0 0 0 4.2 0l5.4-5.4a4 4 0 0 0-5.7-5.7l-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {/* Microphone Button */}
              <button
                onClick={() => setIsListening((v) => !v)}
                className={`p-2.5 rounded-full border transition-colors ${
                  isListening
                    ? "border-emerald-600 bg-emerald-900/40 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                    : "border-transparent bg-zinc-800/80 text-neutral-300 hover:text-white hover:border-emerald-600"
                }`}
                title={isListening ? "Stop listening" : "Start voice input (Microphone)"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              {/* System Audio Button (Placeholder) */}
              <button
                onClick={() => alert("System audio capture is coming soon!")}
                className="p-2.5 rounded-full border border-transparent bg-zinc-800/80 hover:bg-zinc-700 hover:border-blue-600 text-neutral-300 hover:text-blue-200 transition-colors"
                title="Capture System Audio"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                   <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                   <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl transition-colors text-white shadow-[0_10px_30px_-18px_rgba(16,185,129,0.9)] flex items-center gap-2"
              >
                <span className="text-sm font-semibold">Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
              {attachments.map((file, idx) => (
                <span key={`${file.name}-${idx}`} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md">
                  {file.name}
                </span>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachment}
          />

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {pathInfo && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => openInEditor(pathInfo.projectPath)}
                  className="hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                  title={`Open project in VS Code: ${pathInfo.projectPath}`}
                >
                  {pathInfo.projectName}
                </button>
                {pathInfo.isWorktree && pathInfo.worktreeName && pathInfo.worktreePath && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <button
                      onClick={() => openInEditor(pathInfo.worktreePath!)}
                      className="hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
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
    </div>
  );
}

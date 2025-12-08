import { useState, useCallback, useRef, useEffect } from "react";
import { useClaudePty } from "../hooks/useClaudePty";
import type { ClaudeEvent, ParsedMessage } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface ChatUIProps {
  className?: string;
  cwd?: string;
  claudeSessionId?: string | null;
  messages: ParsedMessage[];
  model?: string | null;
  onClaudeEvent?: (event: ClaudeEvent) => void;
  onClaudeMessage?: (message: ParsedMessage) => void;
}

const MESSAGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  user: { bg: "bg-blue-500/10", color: "text-blue-400", label: "You" },
  assistant: { bg: "bg-zinc-800/50", color: "text-zinc-300", label: "Claude" },
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
  onClaudeEvent,
  onClaudeMessage,
}: ChatUIProps) {
  const [input, setInput] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isRunning, spawnClaude, sendMessage, kill } = useClaudePty({
    onEvent: onClaudeEvent,
    onMessage: onClaudeMessage,
    onRawOutput: (data) => {
      // Pipe raw PTY output to debug panel for troubleshooting Claude replies
      debug.pty("ClaudeRaw", "PTY output", data.slice(0, 500));
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartClaude = useCallback(async () => {
    const id = await spawnClaude(cwd, claudeSessionId);
    if (id) {
      setHasStarted(true);
    }
  }, [spawnClaude, cwd, claudeSessionId]);

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

    if (!hasStarted) {
      await handleStartClaude();
      // Wait a moment for Claude to initialize, then send
      setTimeout(() => {
        sendMessage(message);
      }, 1000);
    } else if (isRunning) {
      sendMessage(message);
    }
  }, [input, hasStarted, isRunning, handleStartClaude, sendMessage, onClaudeMessage]);

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

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-sm font-medium text-zinc-200">Claude</span>
          </div>
          {model && (
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">
              {model}
            </span>
          )}
          {claudeSessionId && (
            <span className="text-xs text-zinc-500" title={claudeSessionId}>
              Session: {claudeSessionId.slice(0, 8)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={handleKill}
              className="px-3 py-1 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-zinc-100"
            >
              Stop
            </button>
          )}
          {!isRunning && !hasStarted && (
            <button
              onClick={handleStartClaude}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-zinc-100"
            >
              Start Claude
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !hasStarted ? (
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
            <p className="text-sm">Start a conversation with Claude</p>
            <p className="text-xs text-zinc-600 mt-1">
              Type a message or click "Start Claude" to begin
            </p>
          </div>
        ) : messages.length === 0 && hasStarted && isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <svg
              className="w-12 h-12 mb-4 text-green-600"
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
            <p className="text-sm text-green-500">Claude is ready</p>
            <p className="text-xs text-zinc-600 mt-1">
              Type a message below to start the conversation
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-700 bg-zinc-800/30">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasStarted ? "Send a message..." : "Type a message to start..."}
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
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {cwd && (
            <span className="truncate ml-auto" title={cwd}>
              {cwd}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

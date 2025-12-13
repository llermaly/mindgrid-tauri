import { useState, useRef, useEffect } from "react";
import type { Session, ChatWindow } from "../../stores/sessionStore";
import type { ParsedMessage } from "../../lib/claude-types";

interface ChatPanelProps {
  session: Session;
  chatWindow: ChatWindow | null;
  projectName?: string;
  className?: string;
}

export function ChatPanel({ session, chatWindow, className = "" }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = chatWindow?.messages || session.messages || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    // TODO: Connect to actual message sending
    console.log("Send message:", inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`flex flex-col border-r border-[var(--border-subtle)] ${className}`}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
            Start a conversation...
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="flex items-end gap-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)] transition-all">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="flex-1 bg-transparent border-none text-[var(--text-primary)] text-sm resize-none outline-none placeholder:text-[var(--text-muted)]"
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)] transition-all">
              <span className="text-base">&#x1F4CE;</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)] transition-all">
              <span className="text-base">&#x1F3A4;</span>
            </button>
            <button
              onClick={handleSubmit}
              className="w-9 h-9 flex items-center justify-center bg-[var(--accent)] text-white rounded-md hover:scale-105 hover:shadow-[0_0_20px_var(--accent-glow)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: ParsedMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  return (
    <div
      className={`max-w-[85%] animate-fade-in ${
        isUser ? "self-end ml-auto" : "self-start"
      }`}
    >
      <div
        className={`px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--accent)] text-white rounded-lg rounded-br-sm"
            : "bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg rounded-bl-sm"
        }`}
      >
        {/* Tool result block */}
        {isTool && message.toolName && (
          <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-md p-2.5 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--cyan)] mb-1.5">
              <span>&#x2699;</span>
              <span>{message.toolName}</span>
            </div>
            {message.toolResult && (
              <div className="text-xs text-[var(--text-secondary)] font-mono">
                {message.toolResult.slice(0, 200)}
                {message.toolResult.length > 200 && "..."}
              </div>
            )}
          </div>
        )}

        {/* Regular content */}
        <MessageContent content={message.content} />
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple text rendering for now
  // TODO: Add proper markdown parsing
  return <>{content}</>;
}

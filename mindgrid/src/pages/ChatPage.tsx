import { useEffect, useState, useCallback } from "react";
import { ChatUI } from "../components/ChatUI";
import { useSessionStore } from "../stores/sessionStore";
import type { ClaudeEvent, ParsedMessage, PermissionMode, CommitMode } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface ChatPageProps {
  sessionId: string;
  chatWindowId?: string; // Optional: specific chat window to load
  isNewChat?: boolean;
}

export function ChatPage({ sessionId, chatWindowId, isNewChat }: ChatPageProps) {
  const {
    sessions,
    projects,
    chatWindows,
    addMessage,
    handleClaudeEvent: storeHandleClaudeEvent,
    addChatWindowMessage,
    handleChatWindowClaudeEvent,
    initialize,
    isInitialized,
    isLoading,
    clearSession,
    clearChatWindow,
    setPermissionMode,
    setCommitMode,
    setSessionModel,
    setChatWindowModel,
    checkpointCommit,
    gitPush,
    getPrInfo,
    createPr,
    mergePr,
    ghAvailable,
  } = useSessionStore();

  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized && !hasInitialized) {
      setHasInitialized(true);
      initialize();
    }
  }, [initialize, isInitialized, hasInitialized]);

  // Clear session/chatWindow if this is a new chat request
  useEffect(() => {
    if (isNewChat && isInitialized) {
      if (chatWindowId) {
        clearChatWindow(chatWindowId);
      } else if (sessionId) {
        clearSession(sessionId);
      }
    }
  }, [isNewChat, isInitialized, sessionId, chatWindowId, clearSession, clearChatWindow]);

  const session = sessions[sessionId];
  const project = session ? projects[session.projectId] : null;
  const chatWindow = chatWindowId ? chatWindows[chatWindowId] : null;

  // Determine which messages, cost, model to use - ChatWindow takes priority
  const messages = chatWindow?.messages ?? session?.messages ?? [];
  const claudeSessionIdToUse = chatWindow?.claudeSessionId ?? session?.claudeSessionId ?? null;
  const totalCost = chatWindow?.totalCost ?? session?.totalCost ?? 0;
  const model = chatWindow?.model ?? session?.model ?? null;
  const displayName = chatWindow?.title ?? session?.name ?? "Chat";

  const handleClaudeEvent = useCallback(
    async (event: ClaudeEvent) => {
      debug.event("ChatPage", `Claude event: ${event.type}`, event);

      // Route to ChatWindow or Session based on context
      if (chatWindowId) {
        handleChatWindowClaudeEvent(chatWindowId, event);
      } else if (sessionId) {
        storeHandleClaudeEvent(sessionId, event);
      }

      // Auto-checkpoint on result events when commitMode is 'checkpoint'
      if (event.type === "result" && session?.commitMode === "checkpoint" && sessionId) {
        debug.info("ChatPage", "Triggering auto-checkpoint after Claude response");
        checkpointCommit(sessionId);
      }
    },
    [sessionId, chatWindowId, storeHandleClaudeEvent, handleChatWindowClaudeEvent, session?.commitMode, checkpointCommit]
  );

  const handleClaudeMessage = useCallback(
    (message: ParsedMessage) => {
      // Route to ChatWindow or Session based on context
      if (chatWindowId) {
        addChatWindowMessage(chatWindowId, message);
      } else if (sessionId) {
        addMessage(sessionId, message);
      }
    },
    [sessionId, chatWindowId, addMessage, addChatWindowMessage]
  );

  // Memoize callbacks to prevent excessive re-renders and API calls
  const handleGetPrInfo = useCallback(() => getPrInfo(sessionId), [getPrInfo, sessionId]);
  const handleGitPush = useCallback(() => gitPush(sessionId), [gitPush, sessionId]);
  const handleCreatePr = useCallback((title: string, body: string) => createPr(sessionId, title, body), [createPr, sessionId]);
  const handleMergePr = useCallback((squash: boolean) => mergePr(sessionId, squash), [mergePr, sessionId]);
  const handleClearSession = useCallback(() => {
    if (chatWindowId) {
      clearChatWindow(chatWindowId);
    } else {
      clearSession(sessionId);
    }
  }, [clearSession, clearChatWindow, sessionId, chatWindowId]);
  const handlePermissionModeChange = useCallback((mode: PermissionMode) => setPermissionMode(sessionId, mode), [setPermissionMode, sessionId]);
  const handleCommitModeChange = useCallback((mode: CommitMode) => setCommitMode(sessionId, mode), [setCommitMode, sessionId]);
  const handleModelChange = useCallback((model: string) => {
    if (chatWindowId) {
      setChatWindowModel(chatWindowId, model);
    } else {
      setSessionModel(sessionId, model);
    }
  }, [setSessionModel, setChatWindowModel, sessionId, chatWindowId]);

  // Update window title when session/chatWindow loads
  useEffect(() => {
    if (session && project) {
      const title = chatWindow
        ? `${chatWindow.title} - ${session.name} - ${project.name} - MindGrid`
        : `${session.name} - ${project.name} - MindGrid`;
      document.title = title;
    }
  }, [session, project, chatWindow]);

  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
        <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg mb-2">Session not found</p>
        <p className="text-sm text-zinc-500">Session ID: {sessionId}</p>
      </div>
    );
  }

  console.log("[ChatPage] Session loaded:", { sessionId, chatWindowId, displayName, messagesCount: messages.length });

  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      {/* Minimal header for chat window */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-zinc-200">{displayName}</span>
          {chatWindow && session && (
            <span className="text-xs text-zinc-500">/ {session.name}</span>
          )}
          {project && (
            <span className="text-xs text-zinc-500">/ {project.name}</span>
          )}
          {chatWindow?.isPinned && (
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{messages.length} messages</span>
          {totalCost > 0 && (
            <span>${totalCost.toFixed(4)}</span>
          )}
        </div>
      </header>

      {/* Chat UI fills the rest */}
      <div className="flex-1 min-h-0">
        <ChatUI
          className="h-full"
          cwd={session.cwd}
          claudeSessionId={claudeSessionIdToUse}
          messages={messages}
          model={model}
          permissionMode={session.permissionMode}
          commitMode={session.commitMode}
          gitAhead={session.gitStatus?.ahead ?? 0}
          sessionName={displayName}
          systemPrompt={project?.systemPrompt}
          initialPrompt={isNewChat ? undefined : project?.initialPrompt}
          onClaudeEvent={handleClaudeEvent}
          onClaudeMessage={handleClaudeMessage}
          onPermissionModeChange={handlePermissionModeChange}
          onCommitModeChange={handleCommitModeChange}
          onModelChange={handleModelChange}
          onClearSession={handleClearSession}
          onGitPush={handleGitPush}
          onGetPrInfo={handleGetPrInfo}
          onCreatePr={handleCreatePr}
          onMergePr={handleMergePr}
          ghAvailable={ghAvailable}
        />
      </div>
    </div>
  );
}

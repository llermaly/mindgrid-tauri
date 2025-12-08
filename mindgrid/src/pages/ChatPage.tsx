import { useEffect, useState, useCallback } from "react";
import { ChatUI } from "../components/ChatUI";
import { useSessionStore } from "../stores/sessionStore";
import type { ClaudeEvent, ParsedMessage, PermissionMode, CommitMode } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface ChatPageProps {
  sessionId: string;
  isNewChat?: boolean;
}

export function ChatPage({ sessionId, isNewChat }: ChatPageProps) {
  const {
    sessions,
    projects,
    addMessage,
    handleClaudeEvent: storeHandleClaudeEvent,
    initialize,
    isInitialized,
    isLoading,
    clearSession,
    setPermissionMode,
    setCommitMode,
    setSessionModel,
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

  // Clear session if this is a new chat request
  useEffect(() => {
    if (isNewChat && isInitialized && sessionId) {
      clearSession(sessionId);
    }
  }, [isNewChat, isInitialized, sessionId, clearSession]);

  const session = sessions[sessionId];
  const project = session ? projects[session.projectId] : null;

  const handleClaudeEvent = useCallback(
    async (event: ClaudeEvent) => {
      debug.event("ChatPage", `Claude event: ${event.type}`, event);
      if (sessionId) {
        storeHandleClaudeEvent(sessionId, event);

        // Auto-checkpoint on result events when commitMode is 'checkpoint'
        if (event.type === "result" && session?.commitMode === "checkpoint") {
          debug.info("ChatPage", "Triggering auto-checkpoint after Claude response");
          checkpointCommit(sessionId);
        }
      }
    },
    [sessionId, storeHandleClaudeEvent, session?.commitMode, checkpointCommit]
  );

  const handleClaudeMessage = useCallback(
    (message: ParsedMessage) => {
      if (sessionId) {
        addMessage(sessionId, message);
      }
    },
    [sessionId, addMessage]
  );

  // Memoize callbacks to prevent excessive re-renders and API calls
  const handleGetPrInfo = useCallback(() => getPrInfo(sessionId), [getPrInfo, sessionId]);
  const handleGitPush = useCallback(() => gitPush(sessionId), [gitPush, sessionId]);
  const handleCreatePr = useCallback((title: string, body: string) => createPr(sessionId, title, body), [createPr, sessionId]);
  const handleMergePr = useCallback((squash: boolean) => mergePr(sessionId, squash), [mergePr, sessionId]);
  const handleClearSession = useCallback(() => clearSession(sessionId), [clearSession, sessionId]);
  const handlePermissionModeChange = useCallback((mode: PermissionMode) => setPermissionMode(sessionId, mode), [setPermissionMode, sessionId]);
  const handleCommitModeChange = useCallback((mode: CommitMode) => setCommitMode(sessionId, mode), [setCommitMode, sessionId]);
  const handleModelChange = useCallback((model: string) => setSessionModel(sessionId, model), [setSessionModel, sessionId]);

  // Update window title when session loads
  useEffect(() => {
    if (session && project) {
      document.title = `${session.name} - ${project.name} - MindGrid`;
    }
  }, [session, project]);

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

  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      {/* Minimal header for chat window */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-zinc-200">{session.name}</span>
          {project && (
            <span className="text-xs text-zinc-500">/ {project.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{session.messages.length} messages</span>
          {session.totalCost > 0 && (
            <span>${session.totalCost.toFixed(4)}</span>
          )}
        </div>
      </header>

      {/* Chat UI fills the rest */}
      <div className="flex-1 min-h-0">
        <ChatUI
          className="h-full"
          cwd={session.cwd}
          claudeSessionId={session.claudeSessionId}
          messages={session.messages}
          model={session.model}
          permissionMode={session.permissionMode}
          commitMode={session.commitMode}
          gitAhead={session.gitStatus?.ahead ?? 0}
          sessionName={session.name}
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

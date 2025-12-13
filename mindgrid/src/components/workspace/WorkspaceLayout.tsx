import { useState, useEffect } from "react";
import { useSessionStore, type ChatWindow } from "../../stores/sessionStore";
import { TopBar, type PanelVisibility } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { SessionBar } from "./SessionBar";
import { ChatPanel } from "./ChatPanel";
import { PreviewPanel } from "./PreviewPanel";
import { RightPanel } from "./RightPanel";
import { TerminalPanel } from "./TerminalPanel";

interface WorkspaceLayoutProps {
  projectId: string;
  sessionId: string;
  onBack?: () => void;
}

export function WorkspaceLayout({ projectId, sessionId: initialSessionId, onBack }: WorkspaceLayoutProps) {
  const { projects, sessions, chatWindows } = useSessionStore();

  const [activeSessionId, setActiveSessionId] = useState(initialSessionId);
  const [activeChatWindowId, setActiveChatWindowId] = useState<string | null>(null);
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibility>({
    preview: true,
    rightPanel: true,
    terminal: true,
  });
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const handlePanelToggle = (panel: keyof PanelVisibility) => {
    setPanelVisibility(prev => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const project = projects[projectId];
  const session = sessions[activeSessionId];

  // Get project sessions
  const projectSessions = Object.values(sessions).filter(s => s.projectId === projectId);

  // Get chat windows for current session
  const sessionChatWindows = session?.chatWindows
    ?.map(id => chatWindows[id])
    .filter(Boolean) as ChatWindow[] || [];

  // Set initial active chat window
  useEffect(() => {
    if (!activeChatWindowId && sessionChatWindows.length > 0) {
      setActiveChatWindowId(sessionChatWindows[0].id);
    }
  }, [sessionChatWindows, activeChatWindowId]);

  // Reset chat window when session changes
  useEffect(() => {
    setActiveChatWindowId(null);
  }, [activeSessionId]);

  const activeChatWindow = activeChatWindowId ? chatWindows[activeChatWindowId] : null;

  if (!project || !session) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-[var(--text-muted)]">Session not found</div>
      </div>
    );
  }

  const showPreview = panelVisibility.preview;
  const showRightPanel = panelVisibility.rightPanel;
  const showTerminal = panelVisibility.terminal;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Bar */}
      <TopBar
        projectName={project.name}
        chatWindows={sessionChatWindows}
        activeChatWindowId={activeChatWindowId}
        onChatWindowSelect={setActiveChatWindowId}
        onNewChat={() => {/* TODO: Create new chat window */}}
        panelVisibility={panelVisibility}
        onPanelToggle={handlePanelToggle}
        showSettings={showSettings}
        onSettingsToggle={() => setShowSettings(!showSettings)}
        onBack={onBack}
      />

      {/* Status Bar */}
      <StatusBar
        session={session}
        model={activeChatWindow?.model || session.model}
        isThinking={false} // TODO: Connect to actual thinking state
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - Always visible */}
        <ChatPanel
          session={session}
          chatWindow={activeChatWindow}
          projectName={project.name}
          className={showPreview || showRightPanel ? "min-w-[400px] flex-1" : "flex-1"}
        />

        {/* Preview Panel */}
        {showPreview && (
          <PreviewPanel
            url="localhost:3000"
            className="min-w-[400px] flex-1"
          />
        )}

        {/* Right Panel - Skills & Tools */}
        {showRightPanel && (
          <RightPanel className="w-[280px]" />
        )}
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <TerminalPanel
          cwd={session.cwd}
          expanded={terminalExpanded}
          onToggle={() => setTerminalExpanded(!terminalExpanded)}
        />
      )}

      {/* Session Bar */}
      <SessionBar
        sessions={projectSessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={() => {/* TODO: Create new session */}}
      />
    </div>
  );
}

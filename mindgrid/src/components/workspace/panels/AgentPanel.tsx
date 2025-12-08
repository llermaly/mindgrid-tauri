import { ChatUI } from '../../ChatUI';
import type { ParsedMessage, PermissionMode, CommitMode, ClaudeEvent } from '../../../lib/claude-types';

interface AgentPanelProps {
  sessionId: string;
  cwd: string;
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
  onClearSession?: () => void;
  onGitPush?: () => Promise<{ success: boolean; error?: string }>;
  onGetPrInfo?: () => Promise<{ number: number; title: string; state: string; url: string } | null>;
  onCreatePr?: (title: string, body: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  onMergePr?: (squash: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export function AgentPanel({
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
  onClearSession,
  onGitPush,
  onGetPrInfo,
  onCreatePr,
  onMergePr,
}: AgentPanelProps) {
  return (
    <div className="h-full w-full">
      <ChatUI
        cwd={cwd}
        claudeSessionId={claudeSessionId}
        messages={messages}
        model={model}
        permissionMode={permissionMode}
        commitMode={commitMode}
        gitAhead={gitAhead}
        sessionName={sessionName}
        ghAvailable={ghAvailable}
        onClaudeEvent={onClaudeEvent}
        onClaudeMessage={onClaudeMessage}
        onPermissionModeChange={onPermissionModeChange}
        onCommitModeChange={onCommitModeChange}
        onClearSession={onClearSession}
        onGitPush={onGitPush}
        onGetPrInfo={onGetPrInfo}
        onCreatePr={onCreatePr}
        onMergePr={onMergePr}
      />
    </div>
  );
}

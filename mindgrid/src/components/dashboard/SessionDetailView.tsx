import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Session, PanelType, PanelState } from "../../stores/sessionStore";
import { useSessionStore } from "../../stores/sessionStore";
import type { GitStatus, GitDiffFile, GitDiffResult } from "../../lib/git-types";
import { getGitStatusConfig } from "../../lib/git-types";
import { StatusBadge } from "./StatusBadge";
import type { DashboardSessionStatus } from "./types";

const SESSION_TABS = [
  { id: "overview", label: "Overview" },
  { id: "git", label: "Git Changes" },
  { id: "messages", label: "Messages" },
  { id: "info", label: "Session Info" },
];

interface SessionDetailViewProps {
  session: Session;
  projectName: string;
  onClose: () => void;
  onOpenChat: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefreshGitStatus: () => void;
}

const PANEL_LABELS: Record<PanelType, string> = {
  coding: "Coding",
  research: "Research",
  review: "Review",
  terminal: "Terminal",
  browser: "Browser",
  foundations: "Foundations",
  git: "Git",
};

const PANEL_COLORS: Record<PanelType, { bg: string; text: string; border: string }> = {
  coding: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  research: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  review: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  terminal: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  browser: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  foundations: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  git: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
};

export function SessionDetailView({
  session,
  projectName,
  onClose,
  onOpenChat,
  onDeleteSession,
  onRefreshGitStatus,
}: SessionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "git" | "messages" | "info">("overview");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [diffFiles, setDiffFiles] = useState<GitDiffFile[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showDeleteModal && deleteButtonRef.current) {
      deleteButtonRef.current.focus();
    }
  }, [showDeleteModal]);

  // Fetch diff files when git tab is active or when git status changes
  useEffect(() => {
    if (activeTab === "git" && session.cwd) {
      fetchDiffFiles();
    }
  }, [activeTab, session.gitStatus, session.cwd]);

  const fetchDiffFiles = async () => {
    if (!session.cwd) return;
    setDiffLoading(true);
    try {
      const result = await invoke<GitDiffResult>("get_git_diff", {
        workingDirectory: session.cwd,
      });
      setDiffFiles(result.files);
    } catch (error) {
      console.error("Failed to fetch diff:", error);
      setDiffFiles([]);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSession(session.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isDeleting) {
      e.preventDefault();
      handleDelete();
    } else if (e.key === "Escape") {
      setShowDeleteModal(false);
    }
  };

  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const isActive = isSessionActive(session.id);

  // Determine status based on whether chat window is open and if Claude is running
  let sessionStatus: DashboardSessionStatus;
  if (isActive) {
    sessionStatus = session.isRunning ? "running" : "waiting";
  } else {
    sessionStatus = "idle";
  }

  const panels = session.panelStates ? Object.entries(session.panelStates) as [PanelType, PanelState][] : [];
  const hasMultiplePanels = panels.length > 0;

  // Calculate total cost across all panels + main session
  const totalCost = hasMultiplePanels
    ? panels.reduce((sum, [, state]) => sum + (state.totalCost || 0), session.totalCost || 0)
    : session.totalCost || 0;

  // Calculate total messages
  const totalMessages = hasMultiplePanels
    ? panels.reduce((sum, [, state]) => sum + (state.messages?.length || 0), session.messages?.length || 0)
    : session.messages?.length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <StatusBadge status={sessionStatus} size="lg" />
            <div>
              <h2 className="font-semibold text-white">{session.name}</h2>
              <p className="text-xs text-neutral-500">{projectName}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenChat}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Chat
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 transition-colors"
            title="Delete session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 px-6 py-2 border-b border-neutral-800">
        {SESSION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === tab.id ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  label="Status"
                  value={isActive ? (sessionStatus === "running" ? "Active (Running)" : "Active (Waiting)") : "Idle"}
                  highlight={isActive}
                />
                <StatCard label="Messages" value={totalMessages.toString()} />
                <StatCard label="Total Cost" value={`$${totalCost.toFixed(4)}`} />
                <StatCard label="Model" value={session.model || "Default"} />
              </div>

              {/* Git Worktree Status Summary */}
              <GitWorktreeCard
                gitStatus={session.gitStatus}
                isLoading={session.gitStatusLoading}
                cwd={session.cwd}
                onRefresh={onRefreshGitStatus}
              />

              {/* Chat Panels */}
              {hasMultiplePanels ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white mb-4">Chat Panels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {panels.map(([panelType, state]) => (
                      <PanelCard key={panelType} panelType={panelType} state={state} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white mb-4">Chat Status</h3>
                  <SingleChatCard session={session} />
                </div>
              )}

              {/* Recent Messages Preview */}
              <RecentMessagesCard messages={session.messages} limit={5} />
            </>
          )}

          {/* Git Changes Tab */}
          {activeTab === "git" && (
            <GitChangesTab
              gitStatus={session.gitStatus}
              isLoading={session.gitStatusLoading || diffLoading}
              diffFiles={diffFiles}
              cwd={session.cwd}
              onRefresh={() => {
                onRefreshGitStatus();
                fetchDiffFiles();
              }}
            />
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <FullMessagesTab messages={session.messages} panels={panels} hasMultiplePanels={hasMultiplePanels} />
          )}

          {/* Session Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Session Configuration</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Session ID" value={session.id} mono />
                  <InfoRow label="Working Directory" value={session.cwd} mono />
                  <InfoRow label="Permission Mode" value={session.permissionMode} />
                  <InfoRow label="Commit Mode" value={session.commitMode} />
                  <InfoRow label="Model" value={session.model || "Default"} />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Timestamps</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Created" value={formatDate(session.createdAt)} />
                  <InfoRow label="Last Updated" value={formatDate(session.updatedAt)} />
                </div>
              </div>

              {session.claudeSessionId && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white mb-4">Claude Session</h3>
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Claude Session ID" value={session.claudeSessionId} mono />
                    {session.ptyId && <InfoRow label="PTY ID" value={session.ptyId} mono />}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
          onKeyDown={handleModalKeyDown}
        >
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Delete Session</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Are you sure you want to delete "{session.name}"? This action cannot be undone.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Press Enter to confirm, Escape to cancel
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
      <div className={`text-2xl font-semibold ${highlight ? "text-blue-400" : "text-white"}`}>{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  );
}

function GitWorktreeCard({
  gitStatus,
  isLoading,
  cwd,
  onRefresh,
}: {
  gitStatus?: GitStatus | null;
  isLoading?: boolean;
  cwd: string;
  onRefresh: () => void;
}) {
  const config = gitStatus ? getGitStatusConfig(gitStatus) : null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Git Worktree Status</h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh git status"
        >
          <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin text-neutral-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : gitStatus ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config?.bgColor}`}>
            <GitStatusIcon icon={config?.icon || "help"} className={`w-4 h-4 ${config?.color}`} />
            <span className={`text-sm font-medium ${config?.color}`}>{config?.label}</span>
            <span className="text-xs text-neutral-400">{config?.description}</span>
          </div>

          {/* Git Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GitStatBox label="Branch" value={gitStatus.current_branch || "N/A"} />
            <GitStatBox label="Main Branch" value={gitStatus.main_branch || "main"} />
            <GitStatBox label="Ahead" value={gitStatus.ahead?.toString() || "0"} highlight={gitStatus.ahead ? gitStatus.ahead > 0 : false} />
            <GitStatBox label="Behind" value={gitStatus.behind?.toString() || "0"} warning={gitStatus.behind ? gitStatus.behind > 0 : false} />
          </div>

          {/* File Changes */}
          {(gitStatus.files_changed || gitStatus.additions || gitStatus.deletions) && (
            <div className="pt-3 border-t border-neutral-800">
              <div className="text-xs text-neutral-500 mb-2">Changes</div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-neutral-300">
                  {gitStatus.files_changed || 0} file{(gitStatus.files_changed || 0) !== 1 ? "s" : ""} changed
                </span>
                <span className="text-green-400">+{gitStatus.additions || 0}</span>
                <span className="text-red-400">-{gitStatus.deletions || 0}</span>
              </div>
            </div>
          )}

          {/* Worktree Path */}
          <div className="pt-3 border-t border-neutral-800">
            <div className="text-xs text-neutral-500 mb-1">Worktree Path</div>
            <code className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded block truncate">{cwd}</code>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-neutral-400">No git status available</p>
          <p className="text-sm text-neutral-500">Click refresh to check git status</p>
        </div>
      )}
    </div>
  );
}

function GitStatBox({ label, value, highlight = false, warning = false }: { label: string; value: string; highlight?: boolean; warning?: boolean }) {
  return (
    <div className="p-3 bg-neutral-800 rounded-lg">
      <div className="text-xs text-neutral-400 mb-1">{label}</div>
      <div className={`text-sm font-mono ${highlight ? "text-green-400" : warning ? "text-amber-400" : "text-neutral-200"}`}>
        {value}
      </div>
    </div>
  );
}

function GitStatusIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "check":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case "git-merge":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

function PanelCard({ panelType, state }: { panelType: PanelType; state: PanelState }) {
  const colors = PANEL_COLORS[panelType];
  const messageCount = state.messages?.length || 0;
  const lastMessage = state.messages?.[state.messages.length - 1];

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${colors.text}`}>{PANEL_LABELS[panelType]}</span>
          {state.isRunning && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <span className="text-xs text-neutral-500">{messageCount} msgs</span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-neutral-400">
          <span>Model</span>
          <span className="text-neutral-300">{state.model || "Default"}</span>
        </div>
        <div className="flex justify-between text-neutral-400">
          <span>Cost</span>
          <span className="text-neutral-300">${(state.totalCost || 0).toFixed(4)}</span>
        </div>
        {lastMessage && (
          <div className="pt-2 border-t border-neutral-700/50">
            <div className="text-neutral-500 mb-1">Last message</div>
            <p className="text-neutral-300 line-clamp-2">{lastMessage.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SingleChatCard({ session }: { session: Session }) {
  const messageCount = session.messages?.length || 0;
  const lastMessage = session.messages?.[session.messages.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Messages</div>
          <div className="text-lg font-semibold text-white">{messageCount}</div>
        </div>
        <div className="p-3 bg-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Model</div>
          <div className="text-sm text-neutral-200">{session.model || "Default"}</div>
        </div>
        <div className="p-3 bg-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Cost</div>
          <div className="text-sm text-neutral-200">${(session.totalCost || 0).toFixed(4)}</div>
        </div>
      </div>

      {lastMessage && (
        <div className="p-3 bg-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 mb-2">Last Message</div>
          <p className="text-sm text-neutral-300 line-clamp-3">{lastMessage.content}</p>
          <p className="text-xs text-neutral-500 mt-2">{formatDate(lastMessage.timestamp)}</p>
        </div>
      )}
    </div>
  );
}

function RecentMessagesCard({ messages, limit = 5 }: { messages: import("../../lib/claude-types").ParsedMessage[]; limit?: number }) {
  const recentMessages = messages?.slice(-limit).reverse() || [];

  if (recentMessages.length === 0) {
    return null;
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-white mb-4">Recent Messages</h3>
      <div className="space-y-3">
        {recentMessages.map((msg) => (
          <div key={msg.id} className="p-3 bg-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${msg.role === "user" ? "text-blue-400" : "text-green-400"}`}>
                {msg.role === "user" ? "You" : "Claude"}
              </span>
              <span className="text-xs text-neutral-500">{formatDate(msg.timestamp)}</span>
            </div>
            <p className="text-sm text-neutral-300 line-clamp-2">{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Git Changes Tab Component
function GitChangesTab({
  gitStatus,
  isLoading,
  diffFiles,
  cwd,
  onRefresh,
}: {
  gitStatus?: GitStatus | null;
  isLoading?: boolean;
  diffFiles: GitDiffFile[];
  cwd: string;
  onRefresh: () => void;
}) {
  const config = gitStatus ? getGitStatusConfig(gitStatus) : null;

  return (
    <div className="space-y-6">
      {/* Git Status Summary */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Git Status</h3>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh git status"
          >
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {gitStatus ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config?.bgColor}`}>
              <GitStatusIcon icon={config?.icon || "help"} className={`w-4 h-4 ${config?.color}`} />
              <span className={`text-sm font-medium ${config?.color}`}>{config?.label}</span>
              <span className="text-xs text-neutral-400">{config?.description}</span>
            </div>

            {/* Git Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <GitStatBox label="Branch" value={gitStatus.current_branch || "N/A"} />
              <GitStatBox label="Main Branch" value={gitStatus.main_branch || "main"} />
              <GitStatBox label="Ahead" value={gitStatus.ahead?.toString() || "0"} highlight={gitStatus.ahead ? gitStatus.ahead > 0 : false} />
              <GitStatBox label="Behind" value={gitStatus.behind?.toString() || "0"} warning={gitStatus.behind ? gitStatus.behind > 0 : false} />
            </div>

            {/* Summary Stats */}
            {(gitStatus.files_changed || gitStatus.additions || gitStatus.deletions) && (
              <div className="pt-3 border-t border-neutral-800">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-neutral-300">
                    {gitStatus.files_changed || 0} file{(gitStatus.files_changed || 0) !== 1 ? "s" : ""} changed
                  </span>
                  <span className="text-green-400">+{gitStatus.additions || 0}</span>
                  <span className="text-red-400">-{gitStatus.deletions || 0}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-neutral-400">No git status available</p>
          </div>
        )}
      </div>

      {/* Changed Files List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-4">Changed Files</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-neutral-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : diffFiles.length > 0 ? (
          <div className="space-y-2">
            {diffFiles.map((file, index) => (
              <FileChangeRow key={index} file={file} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-neutral-400">No changes detected</p>
            <p className="text-sm text-neutral-500">Working directory is clean</p>
          </div>
        )}
      </div>

      {/* Worktree Path */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-3">Worktree Path</h3>
        <code className="text-xs text-neutral-300 bg-neutral-800 px-3 py-2 rounded-lg block truncate">{cwd}</code>
      </div>
    </div>
  );
}

// File Change Row Component
function FileChangeRow({ file }: { file: GitDiffFile }) {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    modified: { bg: "bg-blue-500/20", text: "text-blue-400", label: "M" },
    added: { bg: "bg-green-500/20", text: "text-green-400", label: "A" },
    deleted: { bg: "bg-red-500/20", text: "text-red-400", label: "D" },
    renamed: { bg: "bg-amber-500/20", text: "text-amber-400", label: "R" },
    untracked: { bg: "bg-purple-500/20", text: "text-purple-400", label: "?" },
  };

  const status = statusColors[file.status] || statusColors.modified;

  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg">
      <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${status.bg} ${status.text}`}>
        {status.label}
      </span>
      <span className="flex-1 font-mono text-sm text-neutral-300 truncate">{file.path}</span>
      <div className="flex items-center gap-2 text-xs">
        {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
        {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
      </div>
    </div>
  );
}

// Full Messages Tab Component
function FullMessagesTab({
  messages,
  panels,
  hasMultiplePanels,
}: {
  messages: import("../../lib/claude-types").ParsedMessage[];
  panels: [PanelType, PanelState][];
  hasMultiplePanels: boolean;
}) {
  const [selectedPanel, setSelectedPanel] = useState<"main" | PanelType>("main");

  const displayMessages = selectedPanel === "main"
    ? messages
    : panels.find(([type]) => type === selectedPanel)?.[1]?.messages || [];

  const allMessages = [...(displayMessages || [])].reverse();

  return (
    <div className="space-y-4">
      {/* Panel Selector (if has multiple panels) */}
      {hasMultiplePanels && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPanel("main")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedPanel === "main" ? "bg-neutral-700 text-white" : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            Main ({messages?.length || 0})
          </button>
          {panels.map(([panelType, state]) => (
            <button
              key={panelType}
              onClick={() => setSelectedPanel(panelType)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedPanel === panelType ? "bg-neutral-700 text-white" : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {PANEL_LABELS[panelType]} ({state.messages?.length || 0})
            </button>
          ))}
        </div>
      )}

      {/* Messages List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
        {allMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-neutral-400">No messages yet</p>
            <p className="text-sm text-neutral-500">Start a conversation to see messages here</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {allMessages.map((msg) => (
              <div key={msg.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    msg.role === "user" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                  }`}>
                    {msg.role === "user" ? "You" : "Claude"}
                  </span>
                  <span className="text-xs text-neutral-500">{formatDate(msg.timestamp)}</span>
                </div>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-400">{label}</span>
      <span className={`text-neutral-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;

  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

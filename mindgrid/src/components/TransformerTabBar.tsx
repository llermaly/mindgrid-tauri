/**
 * TransformerTabBar Component
 * Shows tabbed interface when multiple windows are combined in transformer mode
 */

import { useEffect, useState } from "react";
import { useTransformerStore, type WindowInfo } from "../stores/transformerStore";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface TransformerTabBarProps {
  groupId: string;
  onSeparate?: () => void;
}

export function TransformerTabBar({ groupId, onSeparate }: TransformerTabBarProps) {
  const { windowGroups, setActiveWindow, removeFromGroup, separateGroup } = useTransformerStore();
  const group = windowGroups[groupId];

  if (!group || group.windows.length < 2) {
    return null;
  }

  const handleTabClick = async (windowLabel: string) => {
    setActiveWindow(groupId, windowLabel);

    // Focus the window
    try {
      const win = new WebviewWindow(windowLabel);
      await win.setFocus();
    } catch (error) {
      console.error("[TransformerTabBar] Failed to focus window:", error);
    }
  };

  const handleSeparateWindow = async (e: React.MouseEvent, windowLabel: string) => {
    e.stopPropagation();
    await removeFromGroup(groupId, windowLabel);
  };

  const handleSeparateAll = async () => {
    await separateGroup(groupId);
    onSeparate?.();
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
      {/* Tabs */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin">
        {group.windows.map((windowInfo) => (
          <TabButton
            key={windowInfo.label}
            windowInfo={windowInfo}
            isActive={windowInfo.label === group.activeWindowLabel}
            onClick={() => handleTabClick(windowInfo.label)}
            onClose={(e) => handleSeparateWindow(e, windowInfo.label)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-subtle)]">
        <button
          onClick={handleSeparateAll}
          className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
          title="Separate all windows"
        >
          Separate All
        </button>
      </div>
    </div>
  );
}

interface TabButtonProps {
  windowInfo: WindowInfo;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function TabButton({ windowInfo, isActive, onClick, onClose }: TabButtonProps) {
  const typeColors: Record<WindowInfo["type"], string> = {
    main: "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]",
    workspace: "bg-[rgba(34,197,94,0.15)] text-[var(--accent-success)]",
    chat: "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]",
    terminal: "bg-[rgba(245,158,11,0.15)] text-[var(--accent-warning)]",
    run: "bg-[rgba(139,92,246,0.15)] text-purple-400",
  };

  const typeLabels: Record<WindowInfo["type"], string> = {
    main: "Main",
    workspace: "WS",
    chat: "Chat",
    terminal: "Term",
    run: "Run",
  };

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
        isActive
          ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {/* Type indicator */}
      <span
        className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeColors[windowInfo.type]}`}
      >
        {typeLabels[windowInfo.type]}
      </span>

      {/* Title - truncate if too long */}
      <span className="max-w-[120px] truncate">{windowInfo.title || windowInfo.label}</span>

      {/* Close button */}
      <button
        onClick={onClose}
        className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all"
        title="Separate this window"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </button>
  );
}

/**
 * TransformerModeIndicator
 * Shows a small indicator when transformer mode is active
 */
export function TransformerModeIndicator() {
  const { isTransformerMode, toggleTransformerMode, pendingCombine, executePendingCombine, clearPendingCombine } = useTransformerStore();
  const [isHovered, setIsHovered] = useState(false);

  if (!isTransformerMode) return null;

  const hasPending = pendingCombine.length > 0;

  return (
    <div
      className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/30 rounded-xl shadow-lg z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
      <span className="text-sm font-medium text-[var(--text-primary)]">Transformer Mode</span>

      {hasPending && (
        <span className="px-2 py-0.5 text-xs bg-[var(--accent-primary-muted)] text-[var(--accent-primary)] rounded-full">
          {pendingCombine.length} selected
        </span>
      )}

      {isHovered && (
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--border-subtle)]">
          {hasPending && (
            <>
              <button
                onClick={() => executePendingCombine()}
                disabled={pendingCombine.length < 2}
                className="px-2 py-1 text-xs font-medium bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors"
              >
                Combine
              </button>
              <button
                onClick={clearPendingCombine}
                className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Clear
              </button>
            </>
          )}
          <button
            onClick={toggleTransformerMode}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Exit transformer mode"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * WindowSelectOverlay
 * Shows when transformer mode is active to allow window selection
 */
export function WindowSelectOverlay() {
  const { isTransformerMode, pendingCombine, addToPendingCombine, removeFromPendingCombine } = useTransformerStore();
  const [currentWindowLabel, setCurrentWindowLabel] = useState<string>("");

  useEffect(() => {
    const getCurrentLabel = async () => {
      try {
        const win = getCurrentWebviewWindow();
        setCurrentWindowLabel(win.label);
      } catch (error) {
        console.error("[WindowSelectOverlay] Failed to get current window:", error);
      }
    };
    getCurrentLabel();
  }, []);

  if (!isTransformerMode || !currentWindowLabel || currentWindowLabel === "main") {
    return null;
  }

  const isSelected = pendingCombine.includes(currentWindowLabel);

  const handleToggleSelect = () => {
    if (isSelected) {
      removeFromPendingCombine(currentWindowLabel);
    } else {
      addToPendingCombine(currentWindowLabel);
    }
  };

  return (
    <button
      onClick={handleToggleSelect}
      className={`fixed top-2 right-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all z-50 ${
        isSelected
          ? "bg-[var(--accent-primary)] text-white"
          : "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {isSelected ? "Selected for Combine" : "Select for Combine"}
    </button>
  );
}

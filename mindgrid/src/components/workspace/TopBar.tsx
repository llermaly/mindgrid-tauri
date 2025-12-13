import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ChatWindow } from "../../stores/sessionStore";

export interface PanelVisibility {
  preview: boolean;
  rightPanel: boolean;
  terminal: boolean;
}

interface TopBarProps {
  projectName: string;
  chatWindows: ChatWindow[];
  activeChatWindowId: string | null;
  onChatWindowSelect: (id: string) => void;
  onNewChat: () => void;
  panelVisibility: PanelVisibility;
  onPanelToggle: (panel: keyof PanelVisibility) => void;
  showSettings: boolean;
  onSettingsToggle: () => void;
  onBack?: () => void;
}

export function TopBar({
  projectName,
  chatWindows,
  activeChatWindowId,
  onChatWindowSelect,
  onNewChat,
  panelVisibility,
  onPanelToggle,
  showSettings,
  onSettingsToggle,
  onBack,
}: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 h-[52px] bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] select-none flex-shrink-0"
      data-tauri-drag-region
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Traffic lights */}
        <TrafficLights />

        {/* Project selector */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[13px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
        >
          <div className="w-[18px] h-[18px] rounded bg-gradient-to-br from-[var(--accent)] to-[#8b5cf6]" />
          <span>{projectName}</span>
          <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Breadcrumb arrow */}
        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        {/* Chat tabs */}
        <div className="flex items-center gap-1">
          {chatWindows.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatWindowSelect(chat.id)}
              className={`px-3.5 py-1.5 text-[13px] rounded-md transition-all relative ${
                chat.id === activeChatWindowId
                  ? "text-[var(--text-primary)] bg-[var(--bg-panel)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
              }`}
            >
              {chat.title || "Chat"}
              {chat.id === activeChatWindowId && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[var(--accent)] rounded" />
              )}
            </button>
          ))}

          {/* Show default chat tab if none exist */}
          {chatWindows.length === 0 && (
            <button className="px-3.5 py-1.5 text-[13px] rounded-md text-[var(--text-primary)] bg-[var(--bg-panel)] relative">
              Chat 1
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[var(--accent)] rounded" />
            </button>
          )}

          {/* New chat button */}
          <button
            onClick={onNewChat}
            className="w-7 h-7 flex items-center justify-center border border-dashed border-[var(--border)] rounded-md text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:border-solid transition-all text-base"
          >
            +
          </button>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Panels toggle button */}
        <PanelsDropdown visibility={panelVisibility} onToggle={onPanelToggle} />

        {/* Settings button */}
        <button
          onClick={onSettingsToggle}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
            showSettings
              ? "bg-[var(--bg-input)] text-[var(--accent)] border border-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] border border-transparent"
          }`}
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TrafficLights() {
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    const isMaximized = await window.isMaximized();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  return (
    <div
      className="flex gap-2 mr-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-[#ff5f57] flex items-center justify-center transition-all hover:brightness-90 active:brightness-75"
        title="Close"
      >
        {isHovered && (
          <svg className="w-2 h-2 text-[#4d0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* Minimize button */}
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-[#febc2e] flex items-center justify-center transition-all hover:brightness-90 active:brightness-75"
        title="Minimize"
      >
        {isHovered && (
          <svg className="w-2 h-2 text-[#995700]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        )}
      </button>

      {/* Maximize button */}
      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full bg-[#28c840] flex items-center justify-center transition-all hover:brightness-90 active:brightness-75"
        title="Maximize"
      >
        {isHovered && (
          <svg className="w-1.5 h-1.5 text-[#006500]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function PanelsDropdown({
  visibility,
  onToggle,
}: {
  visibility: PanelVisibility;
  onToggle: (panel: keyof PanelVisibility) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const panels: { id: keyof PanelVisibility; label: string; icon: string }[] = [
    { id: "preview", label: "Preview", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
    { id: "rightPanel", label: "Skills & Tools", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { id: "terminal", label: "Terminal", icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  ];

  const activeCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] border border-transparent transition-all relative"
        title="Panels"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] text-white text-[9px] font-medium rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 py-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-lg z-50">
            <div className="px-3 pb-2 mb-1 border-b border-[var(--border-subtle)]">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Panels
              </span>
            </div>
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => onToggle(panel.id)}
                className="w-full px-3 py-2 flex items-center gap-3 text-left text-xs transition-colors hover:bg-[var(--bg-input)]"
              >
                {/* Checkbox */}
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    visibility[panel.id]
                      ? "bg-[var(--accent)] border-[var(--accent)]"
                      : "border-[var(--border-emphasis)] bg-transparent"
                  }`}
                >
                  {visibility[panel.id] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {/* Icon */}
                <svg className={`w-4 h-4 ${visibility[panel.id] ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={panel.icon} />
                </svg>
                {/* Label */}
                <span className={visibility[panel.id] ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                  {panel.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

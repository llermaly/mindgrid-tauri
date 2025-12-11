import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { useSessionStore, type ChatWindow } from "../stores/sessionStore";

export interface ChatWindowOptions {
  sessionId: string;
  sessionName: string;
  projectName: string;
  cwd: string;
  chatWindowId?: string; // Optional: specific chat window to open
}

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Window layout configuration
const WINDOW_DEFAULTS = {
  width: 800,
  height: 700,
  minWidth: 400,
  minHeight: 300,
  gap: 20, // Gap between windows
};

/**
 * Calculate positions for multiple windows arranged side-by-side
 */
async function calculateWindowPositions(count: number): Promise<WindowPosition[]> {
  const positions: WindowPosition[] = [];

  try {
    const monitor = await currentMonitor();
    if (!monitor) {
      // Fallback: stack windows with offset
      for (let i = 0; i < count; i++) {
        positions.push({
          x: 100 + (i * 30),
          y: 100 + (i * 30),
          width: WINDOW_DEFAULTS.width,
          height: WINDOW_DEFAULTS.height,
        });
      }
      return positions;
    }

    const screenWidth = monitor.size.width;
    const screenHeight = monitor.size.height;
    const screenX = monitor.position.x;
    const screenY = monitor.position.y;

    // Reserve space for menu bar (macOS) and taskbar
    const topMargin = 50;
    const bottomMargin = 50;
    const sideMargin = 20;

    const availableWidth = screenWidth - (sideMargin * 2);
    const availableHeight = screenHeight - topMargin - bottomMargin;

    if (count === 1) {
      // Single window: center it
      positions.push({
        x: screenX + (screenWidth - WINDOW_DEFAULTS.width) / 2,
        y: screenY + topMargin + (availableHeight - WINDOW_DEFAULTS.height) / 2,
        width: WINDOW_DEFAULTS.width,
        height: WINDOW_DEFAULTS.height,
      });
    } else if (count === 2) {
      // Two windows: side by side
      const windowWidth = Math.min(WINDOW_DEFAULTS.width, (availableWidth - WINDOW_DEFAULTS.gap) / 2);
      const windowHeight = Math.min(WINDOW_DEFAULTS.height, availableHeight);

      positions.push({
        x: screenX + sideMargin,
        y: screenY + topMargin,
        width: windowWidth,
        height: windowHeight,
      });
      positions.push({
        x: screenX + sideMargin + windowWidth + WINDOW_DEFAULTS.gap,
        y: screenY + topMargin,
        width: windowWidth,
        height: windowHeight,
      });
    } else if (count <= 4) {
      // 3-4 windows: 2x2 grid
      const cols = 2;
      const rows = Math.ceil(count / cols);
      const windowWidth = Math.min(WINDOW_DEFAULTS.width, (availableWidth - WINDOW_DEFAULTS.gap) / cols);
      const windowHeight = Math.min(WINDOW_DEFAULTS.height, (availableHeight - WINDOW_DEFAULTS.gap * (rows - 1)) / rows);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: screenX + sideMargin + col * (windowWidth + WINDOW_DEFAULTS.gap),
          y: screenY + topMargin + row * (windowHeight + WINDOW_DEFAULTS.gap),
          width: windowWidth,
          height: windowHeight,
        });
      }
    } else {
      // Many windows: arrange in a grid, fitting as many as possible
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const windowWidth = Math.max(WINDOW_DEFAULTS.minWidth, (availableWidth - WINDOW_DEFAULTS.gap * (cols - 1)) / cols);
      const windowHeight = Math.max(WINDOW_DEFAULTS.minHeight, (availableHeight - WINDOW_DEFAULTS.gap * (rows - 1)) / rows);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: screenX + sideMargin + col * (windowWidth + WINDOW_DEFAULTS.gap),
          y: screenY + topMargin + row * (windowHeight + WINDOW_DEFAULTS.gap),
          width: windowWidth,
          height: windowHeight,
        });
      }
    }
  } catch (e) {
    console.error("[window-manager] Error calculating positions:", e);
    // Fallback: stack windows
    for (let i = 0; i < count; i++) {
      positions.push({
        x: 100 + (i * 30),
        y: 100 + (i * 30),
        width: WINDOW_DEFAULTS.width,
        height: WINDOW_DEFAULTS.height,
      });
    }
  }

  return positions;
}

/**
 * Opens a chat window for a specific ChatWindow entity.
 * If chatWindowId is provided, opens that specific chat window.
 * Otherwise creates a new ChatWindow and opens it.
 */
export async function openChatWindow(options: ChatWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName, chatWindowId } = options;

  // If chatWindowId is provided, use it; otherwise this is a legacy call
  const windowLabel = chatWindowId ? `chat-${chatWindowId}` : `chat-${sessionId}`;

  console.log("[window-manager] openChatWindow called:", { sessionId, chatWindowId, windowLabel });

  // Check if window already exists
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      console.log("[window-manager] Window exists, focusing:", windowLabel);
      await existing.setFocus();
      return existing;
    }
  } catch (e) {
    console.log("[window-manager] Error checking existing windows:", e);
  }

  try {
    // Create URL with session info and chatWindowId as query params
    const url = chatWindowId
      ? `index.html?sessionId=${encodeURIComponent(sessionId)}&chatWindowId=${encodeURIComponent(chatWindowId)}`
      : `index.html?sessionId=${encodeURIComponent(sessionId)}`;

    console.log("[window-manager] Creating new window:", { windowLabel, url });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `${sessionName} - ${projectName}`,
      width: 800,
      height: 700,
      minWidth: 400,
      minHeight: 300,
      center: true,
      decorations: false, // Use custom title bar to avoid double controls
      resizable: true,
      focus: true,
    });

    // Listen for window events
    webview.once("tauri://created", () => {
      console.log(`[window-manager] Chat window created: ${windowLabel}`);
      // Mark session as active
      useSessionStore.getState().markSessionChatOpen(sessionId);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] Chat window error: ${windowLabel}`, e);
    });

    // Listen for window close
    webview.once("tauri://destroyed", () => {
      console.log(`[window-manager] Chat window closed: ${windowLabel}`);

      // If this is a ChatWindow, check if it should be marked for deletion
      if (chatWindowId) {
        const chatWindow = useSessionStore.getState().getChatWindow(chatWindowId);
        if (chatWindow && !chatWindow.isPinned) {
          // Mark unpinned window for deletion
          useSessionStore.getState().markChatWindowForDeletion(chatWindowId);
        }
      }

      // Check if this was the last window for this session
      void getSessionChatWindowCount(sessionId).then(count => {
        if (count === 0) {
          useSessionStore.getState().markSessionChatClosed(sessionId);
        }
      });
    });

    return webview;
  } catch (error) {
    console.error("[window-manager] Failed to create chat window:", error);
    return null;
  }
}

/**
 * Opens a new chat in the same session (creates a new ChatWindow and opens it)
 * The new chat window is unpinned by default and will be flagged for cleanup when closed.
 */
export async function openNewChatInSession(options: ChatWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName } = options;

  console.log("[window-manager] openNewChatInSession called:", { sessionId });

  try {
    // Create a new ChatWindow entity (unpinned by default)
    const chatWindow = await useSessionStore.getState().createChatWindow(sessionId, {
      isPinned: false, // New chat windows are unpinned
    });

    const windowLabel = `chat-${chatWindow.id}`;
    const url = `index.html?sessionId=${encodeURIComponent(sessionId)}&chatWindowId=${encodeURIComponent(chatWindow.id)}&newChat=true`;

    console.log("[window-manager] Creating new chat window:", { windowLabel, chatWindowId: chatWindow.id, url });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `${chatWindow.title} - ${sessionName} - ${projectName}`,
      width: 800,
      height: 700,
      minWidth: 400,
      minHeight: 300,
      center: true,
      decorations: false, // Use custom title bar to avoid double controls
      resizable: true,
      focus: true,
    });

    webview.once("tauri://created", () => {
      console.log(`[window-manager] New chat window created: ${windowLabel}`);
      useSessionStore.getState().markSessionChatOpen(sessionId);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] New chat window error: ${windowLabel}`, e);
    });

    // Listen for window close to mark for deletion
    webview.once("tauri://destroyed", () => {
      console.log(`[window-manager] Chat window closed: ${windowLabel}`);

      // Mark unpinned window for deletion
      const cw = useSessionStore.getState().getChatWindow(chatWindow.id);
      if (cw && !cw.isPinned) {
        useSessionStore.getState().markChatWindowForDeletion(chatWindow.id);
      }

      // Check if this was the last window for this session
      void getSessionChatWindowCount(sessionId).then(count => {
        if (count === 0) {
          useSessionStore.getState().markSessionChatClosed(sessionId);
        }
      });
    });

    return webview;
  } catch (error) {
    console.error("[window-manager] Failed to create new chat window:", error);
    return null;
  }
}

/**
 * Focus an existing chat window if it exists
 */
export async function focusChatWindow(sessionId: string): Promise<boolean> {
  const windowLabel = `chat-${sessionId}`;
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      await existing.setFocus();
      return true;
    }
  } catch (e) {
    console.error("[window-manager] Error focusing window:", e);
  }
  return false;
}

/**
 * Close a chat window
 */
export async function closeChatWindow(sessionId: string): Promise<void> {
  const windowLabel = `chat-${sessionId}`;
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      await existing.close();
    }
  } catch (e) {
    console.error("[window-manager] Error closing window:", e);
  }
}

/**
 * Get all open chat window labels
 */
export async function getOpenChatWindows(): Promise<string[]> {
  try {
    const windows = await getAllWebviewWindows();
    return windows.filter(w => w.label.startsWith("chat-")).map(w => w.label);
  } catch {
    return [];
  }
}

/**
 * Get count of open chat windows for a session
 */
export async function getSessionChatWindowCount(sessionId: string): Promise<number> {
  try {
    const windows = await getAllWebviewWindows();
    return windows.filter(w => w.label.startsWith(`chat-${sessionId}`)).length;
  } catch {
    return 0;
  }
}

/**
 * Opens a chat window at a specific position
 */
async function openChatWindowAtPosition(
  options: ChatWindowOptions,
  position: WindowPosition,
  windowLabel: string
): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName, chatWindowId } = options;

  try {
    const url = chatWindowId
      ? `index.html?sessionId=${encodeURIComponent(sessionId)}&chatWindowId=${encodeURIComponent(chatWindowId)}`
      : `index.html?sessionId=${encodeURIComponent(sessionId)}`;

    console.log("[window-manager] Creating window at position:", { windowLabel, chatWindowId, position });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `${sessionName} - ${projectName}`,
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: Math.round(position.width),
      height: Math.round(position.height),
      minWidth: WINDOW_DEFAULTS.minWidth,
      minHeight: WINDOW_DEFAULTS.minHeight,
      decorations: false, // Use custom title bar to avoid double controls
      resizable: true,
      focus: false, // Don't steal focus when opening multiple
    });

    webview.once("tauri://created", () => {
      console.log(`[window-manager] Window created: ${windowLabel}`);
      useSessionStore.getState().markSessionChatOpen(sessionId);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] Window error: ${windowLabel}`, e);
    });

    // Listen for window close
    webview.once("tauri://destroyed", () => {
      console.log(`[window-manager] Window closed: ${windowLabel}`);

      // If this is a ChatWindow, check if it should be marked for deletion
      if (chatWindowId) {
        const chatWindow = useSessionStore.getState().getChatWindow(chatWindowId);
        if (chatWindow && !chatWindow.isPinned) {
          useSessionStore.getState().markChatWindowForDeletion(chatWindowId);
        }
      }

      // Check if this was the last window for this session
      void getSessionChatWindowCount(sessionId).then(count => {
        if (count === 0) {
          useSessionStore.getState().markSessionChatClosed(sessionId);
        }
      });
    });

    return webview;
  } catch (error) {
    console.error("[window-manager] Failed to create window:", error);
    return null;
  }
}

/**
 * Opens multiple chat windows for a session, arranged side-by-side
 */
export async function openMultipleChatWindows(
  options: ChatWindowOptions,
  count: number = 1
): Promise<WebviewWindow[]> {
  const { sessionId } = options;
  const windows: WebviewWindow[] = [];

  console.log("[window-manager] Opening multiple windows:", { sessionId, count });

  // Calculate positions for all windows
  const positions = await calculateWindowPositions(count);

  // Create windows with a small delay between each to prevent race conditions
  for (let i = 0; i < count; i++) {
    const timestamp = Date.now() + i;
    
    // Determine label and ID
    let windowLabel = `chat-${sessionId}-${timestamp}`;
    let targetChatWindowId: string | undefined = undefined;

    // If opening the first window, try to use the Main Session window
    if (i === 0) {
      const pinnedWindows = useSessionStore.getState().getPinnedChatWindows(sessionId);
      const mainChat = pinnedWindows.find(cw => cw.title === "Main Session") || pinnedWindows[0];
      
      if (mainChat) {
        targetChatWindowId = mainChat.id;
        windowLabel = `chat-${mainChat.id}`;
      } else {
        // Legacy fallback
        windowLabel = `chat-${sessionId}`;
      }
    }

    // Check if window already exists
    try {
      const existingWindows = await getAllWebviewWindows();
      const existing = existingWindows.find(w => w.label === windowLabel);
      if (existing) {
        // Move existing window to position and focus
        await existing.setPosition(new PhysicalPosition(Math.round(positions[i].x), Math.round(positions[i].y)));
        await existing.setSize(new PhysicalSize(Math.round(positions[i].width), Math.round(positions[i].height)));
        windows.push(existing);
        continue;
      }
    } catch (e) {
      console.log("[window-manager] Error checking existing window:", e);
    }

    const windowOptions: ChatWindowOptions = {
        ...options,
        chatWindowId: targetChatWindowId,
    };

    const webview = await openChatWindowAtPosition(windowOptions, positions[i], windowLabel);
    if (webview) {
      windows.push(webview);
      console.log(`[window-manager] Multiple windows: ${i + 1}/${count} created: ${windowLabel}`);
    } else {
      console.error(`[window-manager] Multiple windows: Failed to create ${i + 1}/${count}: ${windowLabel}`);
    }

    // Small delay between window creation
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Focus the first window after all are created
  if (windows.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      await windows[0].setFocus();
    } catch (e) {
      console.log("[window-manager] Could not focus first window:", e);
    }
  }

  return windows;
}

/**
 * Opens chat windows for all sessions in a project, arranged side-by-side
 */
export async function openAllProjectSessionChats(
  sessions: Array<{ sessionId: string; sessionName: string; cwd: string }>,
  projectName: string
): Promise<WebviewWindow[]> {
  const windows: WebviewWindow[] = [];
  const count = sessions.length;

  if (count === 0) return windows;

  console.log("[window-manager] Opening all project sessions:", {
    projectName,
    count,
    sessions: sessions.map(s => ({ id: s.sessionId, name: s.sessionName }))
  });

  // Calculate positions for all windows
  const positions = await calculateWindowPositions(count);

  // Create windows with a small delay between each to prevent race conditions
  for (let i = 0; i < count; i++) {
    const session = sessions[i];
    
    // Find the main chat window for this session (legacy fallback: use session ID)
    const pinnedWindows = useSessionStore.getState().getPinnedChatWindows(session.sessionId);
    const mainChat = pinnedWindows.find(cw => cw.title === "Main Session") || pinnedWindows[0];
    
    // If we found a main chat window, use its ID and label
    const chatWindowId = mainChat?.id;
    const windowLabel = chatWindowId ? `chat-${chatWindowId}` : `chat-${session.sessionId}`;

    // Check if window already exists
    try {
      const existingWindows = await getAllWebviewWindows();
      const existing = existingWindows.find(w => w.label === windowLabel);
      if (existing) {
        // Move existing window to position and focus
        await existing.setPosition(new PhysicalPosition(Math.round(positions[i].x), Math.round(positions[i].y)));
        await existing.setSize(new PhysicalSize(Math.round(positions[i].width), Math.round(positions[i].height)));
        windows.push(existing);
        continue;
      }
    } catch (e) {
      console.log("[window-manager] Error checking existing window:", e);
    }

    const options: ChatWindowOptions = {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      projectName,
      cwd: session.cwd,
      chatWindowId, // Pass the specific chat window ID if found
    };

    const webview = await openChatWindowAtPosition(options, positions[i], windowLabel);
    if (webview) {
      windows.push(webview);
      console.log(`[window-manager] Window ${i + 1}/${count} created: ${windowLabel}`);
    } else {
      console.error(`[window-manager] Failed to create window ${i + 1}/${count}: ${windowLabel}`);
    }

    // Small delay between window creation
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[window-manager] Finished opening project sessions, created ${windows.length}/${count} windows`);

  // Focus the first window after all are created
  if (windows.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      await windows[0].setFocus();
    } catch (e) {
      console.log("[window-manager] Could not focus first window:", e);
    }
  }

  return windows;
}

/**
 * Close all chat windows for a specific session
 */
export async function closeAllSessionChatWindows(sessionId: string): Promise<number> {
  let closedCount = 0;
  try {
    const existingWindows = await getAllWebviewWindows();
    
    // Get all chat window IDs for this session from the store
    const sessionChatWindows = useSessionStore.getState().getSessionChatWindows(sessionId);
    const chatWindowIds = new Set(sessionChatWindows.map(cw => cw.id));
    
    const sessionWindows = existingWindows.filter(w => {
      // Check for legacy/timestamped labels: chat-{sessionId} or chat-{sessionId}-...
      if (w.label === `chat-${sessionId}` || w.label.startsWith(`chat-${sessionId}-`)) {
        return true;
      }
      
      // Check for chat window ID labels: chat-{chatWindowId}
      const match = w.label.match(/^chat-(.+)$/);
      if (match && chatWindowIds.has(match[1])) {
        return true;
      }
      
      return false;
    });

    for (const window of sessionWindows) {
      try {
        await window.close();
        closedCount++;
      } catch (e) {
        console.error(`[window-manager] Error closing window ${window.label}:`, e);
      }
    }

    console.log(`[window-manager] Closed ${closedCount} windows for session ${sessionId}`);
  } catch (e) {
    console.error("[window-manager] Error closing session windows:", e);
  }
  return closedCount;
}

/**
 * Close all chat windows (for all sessions)
 */
export async function closeAllChatWindows(): Promise<number> {
  let closedCount = 0;
  try {
    const existingWindows = await getAllWebviewWindows();
    const chatWindows = existingWindows.filter(w => w.label.startsWith("chat-"));

    for (const window of chatWindows) {
      try {
        await window.close();
        closedCount++;
      } catch (e) {
        console.error(`[window-manager] Error closing window ${window.label}:`, e);
      }
    }

    console.log(`[window-manager] Closed ${closedCount} total chat windows`);
  } catch (e) {
    console.error("[window-manager] Error closing all chat windows:", e);
  }
  return closedCount;
}

/**
 * Close all chat windows for all sessions in a project
 */
export async function closeAllProjectSessionChats(sessionIds: string[]): Promise<number> {
  let closedCount = 0;
  for (const sessionId of sessionIds) {
    closedCount += await closeAllSessionChatWindows(sessionId);
  }
  console.log(`[window-manager] Closed ${closedCount} windows for project sessions`);
  return closedCount;
}

/**
 * Arrange all open chat windows for a session in a grid
 */
export async function arrangeSessionWindows(sessionId: string): Promise<void> {
  try {
    const existingWindows = await getAllWebviewWindows();
    const sessionWindows = existingWindows.filter(w => w.label.startsWith(`chat-${sessionId}`));

    if (sessionWindows.length === 0) return;

    const positions = await calculateWindowPositions(sessionWindows.length);

    for (let i = 0; i < sessionWindows.length; i++) {
      const window = sessionWindows[i];
      const pos = positions[i];
      try {
        await window.setPosition(new PhysicalPosition(Math.round(pos.x), Math.round(pos.y)));
        await window.setSize(new PhysicalSize(Math.round(pos.width), Math.round(pos.height)));
      } catch (e) {
        console.error(`[window-manager] Error positioning window ${window.label}:`, e);
      }
    }

    console.log(`[window-manager] Arranged ${sessionWindows.length} windows for session ${sessionId}`);
  } catch (e) {
    console.error("[window-manager] Error arranging windows:", e);
  }
}

export interface RunCommandWindowOptions {
  sessionId: string;
  sessionName: string;
  projectName: string;
  cwd: string;
  command: string;
}

/**
 * Opens a terminal window that executes a command (e.g., run preview)
 */
export async function openRunCommandWindow(options: RunCommandWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName, cwd, command } = options;
  const timestamp = Date.now();
  const windowLabel = `run-${sessionId}-${timestamp}`;

  console.log("[window-manager] openRunCommandWindow called:", { sessionId, windowLabel, command, cwd });

  try {
    // Create URL with cwd, run command, and sessionId for color coding
    const url = `index.html?mode=terminal&sessionId=${encodeURIComponent(sessionId)}&sessionName=${encodeURIComponent(sessionName)}&projectName=${encodeURIComponent(projectName)}&cwd=${encodeURIComponent(cwd)}&runCommand=${encodeURIComponent(command)}`;

    console.log("[window-manager] Creating run command window:", { windowLabel, url });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `Run - ${sessionName} - ${projectName}`,
      width: 900,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      center: true,
      decorations: false, // Use custom title bar to avoid double controls
      resizable: true,
      focus: true,
    });

    webview.once("tauri://created", () => {
      console.log(`[window-manager] Run command window created: ${windowLabel}`);
      // Mark session as having a run window open
      useSessionStore.getState().markSessionRunOpen(sessionId);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] Run command window error: ${windowLabel}`, e);
    });

    // Listen for window close to update state
    webview.once("tauri://destroyed", () => {
      console.log(`[window-manager] Run command window closed: ${windowLabel}`);
      // Check if this was the last run window for this session
      void getRunWindowCount(sessionId).then(count => {
        if (count === 0) {
          useSessionStore.getState().markSessionRunClosed(sessionId);
        }
      });
    });

    return webview;
  } catch (error) {
    console.error("[window-manager] Failed to create run command window:", error);
    return null;
  }
}

/**
 * Get count of open run windows for a session
 */
export async function getRunWindowCount(sessionId: string): Promise<number> {
  try {
    const windows = await getAllWebviewWindows();
    return windows.filter(w => w.label.startsWith(`run-${sessionId}`)).length;
  } catch {
    return 0;
  }
}

/**
 * Opens all pinned chat windows for all sessions in a project, arranged side-by-side.
 * This is the preferred method for "Open Workspace" - only opens pinned/permanent windows.
 */
export async function openPinnedChatWindows(
  sessions: Array<{ sessionId: string; sessionName: string; cwd: string }>,
  projectName: string
): Promise<WebviewWindow[]> {
  const windows: WebviewWindow[] = [];

  // Collect all pinned chat windows across all sessions
  const pinnedWindowsToOpen: Array<{
    chatWindow: ChatWindow;
    session: { sessionId: string; sessionName: string; cwd: string };
  }> = [];

  for (const session of sessions) {
    const pinnedWindows = useSessionStore.getState().getPinnedChatWindows(session.sessionId);
    for (const cw of pinnedWindows) {
      pinnedWindowsToOpen.push({ chatWindow: cw, session });
    }
  }

  const count = pinnedWindowsToOpen.length;

  if (count === 0) {
    console.log("[window-manager] No pinned chat windows to open for project:", projectName);
    return windows;
  }

  console.log("[window-manager] Opening pinned chat windows:", {
    projectName,
    count,
    windows: pinnedWindowsToOpen.map(pw => ({ id: pw.chatWindow.id, title: pw.chatWindow.title, sessionId: pw.session.sessionId }))
  });

  // Calculate positions for all windows
  const positions = await calculateWindowPositions(count);

  // Create windows with a small delay between each to prevent race conditions
  for (let i = 0; i < count; i++) {
    const { chatWindow, session } = pinnedWindowsToOpen[i];
    const windowLabel = `chat-${chatWindow.id}`;

    // Check if window already exists
    try {
      const existingWindows = await getAllWebviewWindows();
      const existing = existingWindows.find(w => w.label === windowLabel);
      if (existing) {
        // Move existing window to position
        await existing.setPosition(new PhysicalPosition(Math.round(positions[i].x), Math.round(positions[i].y)));
        await existing.setSize(new PhysicalSize(Math.round(positions[i].width), Math.round(positions[i].height)));
        windows.push(existing);
        continue;
      }
    } catch (e) {
      console.log("[window-manager] Error checking existing window:", e);
    }

    const options: ChatWindowOptions = {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      projectName,
      cwd: session.cwd,
      chatWindowId: chatWindow.id,
    };

    const webview = await openChatWindowAtPosition(options, positions[i], windowLabel);
    if (webview) {
      windows.push(webview);
      console.log(`[window-manager] Pinned window ${i + 1}/${count} created: ${windowLabel}`);
    } else {
      console.error(`[window-manager] Failed to create pinned window ${i + 1}/${count}: ${windowLabel}`);
    }

    // Small delay between window creation
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[window-manager] Finished opening pinned windows, created ${windows.length}/${count} windows`);

  // Focus the first window after all are created
  if (windows.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      await windows[0].setFocus();
    } catch (e) {
      console.log("[window-manager] Could not focus first window:", e);
    }
  }

  return windows;
}

/**
 * Creates pinned chat windows for a session (used when creating variants at project start)
 */
export async function createPinnedChatWindowsForSession(
  sessionId: string,
  count: number,
  options?: { titlePrefix?: string }
): Promise<ChatWindow[]> {
  const chatWindows: ChatWindow[] = [];

  for (let i = 0; i < count; i++) {
    const title = options?.titlePrefix
      ? `${options.titlePrefix} ${i + 1}`
      : `Chat ${i + 1}`;

    const chatWindow = await useSessionStore.getState().createChatWindow(sessionId, {
      title,
      isPinned: true, // Variants are pinned by default
    });

    chatWindows.push(chatWindow);
    console.log(`[window-manager] Created pinned chat window: ${chatWindow.id} (${title})`);
  }

  return chatWindows;
}

/**
 * Opens run command windows for all sessions in a project, arranged side-by-side
 * This is useful for running the same command (e.g., npm run dev) across all project variants
 */
export async function runAllProjectSessions(
  sessions: Array<{ sessionId: string; sessionName: string; cwd: string }>,
  projectName: string,
  command: string
): Promise<WebviewWindow[]> {
  const windows: WebviewWindow[] = [];
  const count = sessions.length;

  if (count === 0) return windows;

  console.log("[window-manager] Running command for all project sessions:", { projectName, count, command });

  // Calculate positions for all windows
  const positions = await calculateWindowPositions(count);

  // Create windows with a small delay between each to prevent race conditions
  for (let i = 0; i < count; i++) {
    const session = sessions[i];
    const timestamp = Date.now() + i;
    const windowLabel = `run-${session.sessionId}-${timestamp}`;

    try {
      const url = `index.html?mode=terminal&sessionId=${encodeURIComponent(session.sessionId)}&sessionName=${encodeURIComponent(session.sessionName)}&projectName=${encodeURIComponent(projectName)}&cwd=${encodeURIComponent(session.cwd)}&runCommand=${encodeURIComponent(command)}`;

      const webview = new WebviewWindow(windowLabel, {
        url,
        title: `Run - ${session.sessionName} - ${projectName}`,
        x: Math.round(positions[i].x),
        y: Math.round(positions[i].y),
        width: Math.round(positions[i].width),
        height: Math.round(positions[i].height),
        minWidth: WINDOW_DEFAULTS.minWidth,
        minHeight: WINDOW_DEFAULTS.minHeight,
        decorations: false, // Use custom title bar to avoid double controls
        resizable: true,
        focus: false, // Don't steal focus when opening multiple
      });

      webview.once("tauri://created", () => {
        console.log(`[window-manager] Run window created: ${windowLabel}`);
        useSessionStore.getState().markSessionRunOpen(session.sessionId);
      });

      webview.once("tauri://error", (e) => {
        console.error(`[window-manager] Run window error: ${windowLabel}`, e);
      });

      webview.once("tauri://destroyed", () => {
        console.log(`[window-manager] Run window closed: ${windowLabel}`);
        void getRunWindowCount(session.sessionId).then(runCount => {
          if (runCount === 0) {
            useSessionStore.getState().markSessionRunClosed(session.sessionId);
          }
        });
      });

      windows.push(webview);
    } catch (error) {
      console.error(`[window-manager] Failed to create run window for ${session.sessionId}:`, error);
    }

    // Small delay between window creation
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Focus the first window after all are created
  if (windows.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      await windows[0].setFocus();
    } catch (e) {
      console.log("[window-manager] Could not focus first window:", e);
    }
  }

  return windows;
}


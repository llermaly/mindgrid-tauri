import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { useSessionStore } from "../stores/sessionStore";

export interface ChatWindowOptions {
  sessionId: string;
  sessionName: string;
  projectName: string;
  cwd: string;
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
 * Opens a new chat window for the given session.
 * If a window for this session already exists, focus it instead.
 */
export async function openChatWindow(options: ChatWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName } = options;
  const windowLabel = `chat-${sessionId}`;

  console.log("[window-manager] openChatWindow called:", { sessionId, windowLabel });

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
    // Create URL with session info as query params
    const url = `index.html?sessionId=${encodeURIComponent(sessionId)}`;

    console.log("[window-manager] Creating new window:", { windowLabel, url });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `${sessionName} - ${projectName}`,
      width: 800,
      height: 700,
      minWidth: 400,
      minHeight: 300,
      center: true,
      decorations: true,
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
 * Opens a new chat in the same session (creates a new Claude conversation)
 */
export async function openNewChatInSession(options: ChatWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName } = options;
  const timestamp = Date.now();
  const windowLabel = `chat-${sessionId}-${timestamp}`;

  console.log("[window-manager] openNewChatInSession called:", { sessionId, windowLabel });

  try {
    // Create URL with session info and newChat flag
    const url = `index.html?sessionId=${encodeURIComponent(sessionId)}&newChat=true`;

    console.log("[window-manager] Creating new chat window:", { windowLabel, url });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `New Chat - ${sessionName} - ${projectName}`,
      width: 800,
      height: 700,
      minWidth: 400,
      minHeight: 300,
      center: true,
      decorations: true,
      resizable: true,
      focus: true,
    });

    webview.once("tauri://created", () => {
      console.log(`[window-manager] New chat window created: ${windowLabel}`);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] New chat window error: ${windowLabel}`, e);
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
  const { sessionId, sessionName, projectName } = options;

  try {
    const url = `index.html?sessionId=${encodeURIComponent(sessionId)}`;

    console.log("[window-manager] Creating window at position:", { windowLabel, position });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `${sessionName} - ${projectName}`,
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: Math.round(position.width),
      height: Math.round(position.height),
      minWidth: WINDOW_DEFAULTS.minWidth,
      minHeight: WINDOW_DEFAULTS.minHeight,
      decorations: true,
      resizable: true,
      focus: false, // Don't steal focus when opening multiple
    });

    webview.once("tauri://created", () => {
      console.log(`[window-manager] Window created: ${windowLabel}`);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] Window error: ${windowLabel}`, e);
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
    const windowLabel = i === 0 ? `chat-${sessionId}` : `chat-${sessionId}-${timestamp}`;

    // Check if first window already exists
    if (i === 0) {
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
    }

    const webview = await openChatWindowAtPosition(options, positions[i], windowLabel);
    if (webview) {
      windows.push(webview);
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
 * Close all chat windows for a specific session
 */
export async function closeAllSessionChatWindows(sessionId: string): Promise<number> {
  let closedCount = 0;
  try {
    const existingWindows = await getAllWebviewWindows();
    const sessionWindows = existingWindows.filter(w => w.label.startsWith(`chat-${sessionId}`));

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

/**
 * Opens a workspace window for the given session.
 * The workspace shows all panels (Research, Coding, Browser, etc.) in a single window.
 */
export async function openWorkspaceWindow(options: ChatWindowOptions): Promise<WebviewWindow | null> {
  const { sessionId, sessionName, projectName } = options;
  const windowLabel = `workspace-${sessionId}`;

  console.log("[window-manager] openWorkspaceWindow called:", { sessionId, windowLabel });

  // Check if window already exists
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      console.log("[window-manager] Workspace window exists, focusing:", windowLabel);
      await existing.setFocus();
      return existing;
    }
  } catch (e) {
    console.log("[window-manager] Error checking existing windows:", e);
  }

  try {
    // Get screen dimensions for a larger window
    const monitor = await currentMonitor();
    let width = 1400;
    let height = 900;

    if (monitor) {
      // Use 80% of screen size
      width = Math.min(1600, Math.round(monitor.size.width * 0.8));
      height = Math.min(1000, Math.round(monitor.size.height * 0.8));
    }

    // Create URL with session info and workspace mode flag
    const url = `index.html?sessionId=${encodeURIComponent(sessionId)}&mode=workspace`;

    console.log("[window-manager] Creating workspace window:", { windowLabel, url, width, height });

    const webview = new WebviewWindow(windowLabel, {
      url,
      title: `Workspace - ${sessionName} - ${projectName}`,
      width,
      height,
      minWidth: 800,
      minHeight: 600,
      center: true,
      decorations: true,
      resizable: true,
      focus: true,
    });

    // Listen for window events
    webview.once("tauri://created", () => {
      console.log(`[window-manager] Workspace window created: ${windowLabel}`);
      // Mark session as active
      useSessionStore.getState().markSessionChatOpen(sessionId);
    });

    webview.once("tauri://error", (e) => {
      console.error(`[window-manager] Workspace window error: ${windowLabel}`, e);
    });

    // Listen for window close
    webview.once("tauri://destroyed", () => {
      console.log(`[window-manager] Workspace window closed: ${windowLabel}`);
      // Check if this was the last window for this session
      void getSessionChatWindowCount(sessionId).then(count => {
        if (count === 0) {
          useSessionStore.getState().markSessionChatClosed(sessionId);
        }
      });
    });

    return webview;
  } catch (error) {
    console.error("[window-manager] Failed to create workspace window:", error);
    return null;
  }
}

/**
 * Focus an existing workspace window if it exists
 */
export async function focusWorkspaceWindow(sessionId: string): Promise<boolean> {
  const windowLabel = `workspace-${sessionId}`;
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      await existing.setFocus();
      return true;
    }
  } catch (e) {
    console.error("[window-manager] Error focusing workspace window:", e);
  }
  return false;
}

/**
 * Close a workspace window
 */
export async function closeWorkspaceWindow(sessionId: string): Promise<void> {
  const windowLabel = `workspace-${sessionId}`;
  try {
    const existingWindows = await getAllWebviewWindows();
    const existing = existingWindows.find(w => w.label === windowLabel);
    if (existing) {
      await existing.close();
    }
  } catch (e) {
    console.error("[window-manager] Error closing workspace window:", e);
  }
}


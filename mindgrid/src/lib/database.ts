import Database from "@tauri-apps/plugin-sql";
import { load, Store } from "@tauri-apps/plugin-store";
import type { Project, Session, ChatWindow } from "../stores/sessionStore";
import type { ParsedMessage } from "./claude-types";
import { debug } from "../stores/debugStore";
import { getStoreFilename, getDatabaseUri } from "./dev-mode";

let db: Database | null = null;
let store: Store | null = null;
let schemaChecked = false;

// Get the store instance for JSON-based persistence (more reliable)
async function getStore(): Promise<Store> {
  if (!store) {
    const filename = await getStoreFilename();
    debug.info("Database", `Loading store: ${filename}`);
    store = await load(filename);
    debug.info("Database", "Store loaded");
  }
  return store;
}

async function ensureSchema(database: Database) {
  if (schemaChecked) return;

  // Ensure newer columns exist even if migrations failed to run on an existing DB
  try {
    const columns = await database.select<Array<{ name: string }>>("PRAGMA table_info(sessions)");
    const hasClaudeSessionId = columns.some((col) => col.name === "claude_session_id");
    const hasPermissionMode = columns.some((col) => col.name === "permission_mode");
    const hasCommitMode = columns.some((col) => col.name === "commit_mode");

    if (!hasClaudeSessionId) {
      debug.warn("Database", "sessions table missing claude_session_id column, adding it");
      await database.execute("ALTER TABLE sessions ADD COLUMN claude_session_id TEXT");
    }

    if (!hasPermissionMode) {
      debug.warn("Database", "sessions table missing permission_mode column, adding it");
      await database.execute("ALTER TABLE sessions ADD COLUMN permission_mode TEXT DEFAULT 'bypassPermissions'");
    }

    if (!hasCommitMode) {
      debug.warn("Database", "sessions table missing commit_mode column, adding it");
      await database.execute("ALTER TABLE sessions ADD COLUMN commit_mode TEXT DEFAULT 'checkpoint'");
    }
  } catch (err) {
    debug.warn("Database", "Failed to check schema, using store fallback", err);
  }

  schemaChecked = true;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    const dbUri = await getDatabaseUri();
    debug.info("Database", `Connecting to database: ${dbUri}`);
    db = await Database.load(dbUri);
    debug.info("Database", "Connected");

    // Debug: check what's actually in the database
    try {
      const tables = await db.select<Array<{ name: string }>>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      console.log("Database tables:", tables);

      const sessionCount = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM sessions"
      );
      console.log("Session count on connect:", sessionCount);
    } catch (err) {
      console.warn("Database query failed:", err);
    }

    await ensureSchema(db);
  }
  return db;
}

// Project operations - using Store for reliable persistence
export async function loadProjects(): Promise<Project[]> {
  const s = await getStore();
  const data = await s.get<Project[]>("projects");
  const projects = data || [];
  debug.info("Database", `Loaded ${projects.length} projects from store`);
  return projects.map((p) => ({
    ...p,
    sessions: p.sessions || [], // Ensure sessions array exists
    defaultPermissionMode: p.defaultPermissionMode || 'bypassPermissions', // Default for existing projects
    defaultCommitMode: p.defaultCommitMode || 'checkpoint', // Default for existing projects
  }));
}

export async function saveProject(project: Project): Promise<void> {
  const s = await getStore();
  const projects = (await s.get<Project[]>("projects")) || [];
  const index = projects.findIndex((p) => p.id === project.id);

  // Don't save messages in the project - sessions have their own data
  const projectToSave = {
    ...project,
    sessions: project.sessions || [],
  };

  if (index >= 0) {
    projects[index] = projectToSave;
  } else {
    projects.push(projectToSave);
  }

  await s.set("projects", projects);
  await s.save();
  debug.info("Database", "Saved project to store", { id: project.id, name: project.name });
}

export async function deleteProject(projectId: string): Promise<void> {
  const s = await getStore();
  const projects = (await s.get<Project[]>("projects")) || [];
  const filtered = projects.filter((p) => p.id !== projectId);
  await s.set("projects", filtered);
  await s.save();
  debug.info("Database", "Deleted project from store", { id: projectId });
}

// Session operations - using Store for reliable persistence
export async function loadSessions(): Promise<Session[]> {
  const s = await getStore();
  const data = await s.get<Session[]>("sessions");
  const sessions = data || [];
  debug.info("Database", `Loaded ${sessions.length} sessions from store`);
  return sessions.map((session) => ({
    ...session,
    ptyId: null, // Runtime only
    messages: session.messages || [], // Ensure messages array exists
    isRunning: false, // Runtime only
    permissionMode: session.permissionMode || 'default', // Default permission mode
    commitMode: session.commitMode || 'checkpoint', // Default commit mode
  }));
}

export async function saveSession(session: Session): Promise<void> {
  console.log("=== database.saveSession called with:", session.id, session.name);
  const s = await getStore();
  const sessions = (await s.get<Session[]>("sessions")) || [];
  const index = sessions.findIndex((sess) => sess.id === session.id);

  // Create a serializable version (exclude runtime-only fields)
  const sessionToSave: Session = {
    id: session.id,
    name: session.name,
    projectId: session.projectId,
    claudeSessionId: session.claudeSessionId,
    ptyId: null,
    messages: [], // Messages stored separately
    chatWindows: session.chatWindows || [], // ChatWindow IDs
    isRunning: false,
    totalCost: session.totalCost,
    model: session.model,
    cwd: session.cwd,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    permissionMode: session.permissionMode || 'default',
    commitMode: session.commitMode || 'checkpoint',
    initialPrompt: session.initialPrompt, // Preserve initial prompt for auto-send
  };

  if (index >= 0) {
    sessions[index] = sessionToSave;
  } else {
    sessions.push(sessionToSave);
  }

  await s.set("sessions", sessions);
  await s.save();
  console.log("=== Session saved to store successfully:", session.id);
  debug.info("Database", "Saved session to store", { id: session.id, name: session.name });
}

export async function updateSessionClaudeId(sessionId: string, claudeSessionId: string): Promise<void> {
  const s = await getStore();
  const sessions = (await s.get<Session[]>("sessions")) || [];
  const index = sessions.findIndex((sess) => sess.id === sessionId);

  if (index >= 0) {
    sessions[index] = {
      ...sessions[index],
      claudeSessionId,
      updatedAt: Date.now(),
    };
    await s.set("sessions", sessions);
    await s.save();
  }
  debug.info("Database", "Updated session claude_session_id", { sessionId, claudeSessionId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  console.log("deleteSession called for:", sessionId);
  const s = await getStore();
  const sessions = (await s.get<Session[]>("sessions")) || [];
  const filtered = sessions.filter((sess) => sess.id !== sessionId);
  await s.set("sessions", filtered);
  await s.save();

  // Also delete messages for this session
  await deleteMessages(sessionId);
  debug.info("Database", "Deleted session from store", { id: sessionId });
}

// Message operations - using Store for reliable persistence
export async function loadMessages(sessionId: string): Promise<ParsedMessage[]> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("messages")) || {};
  const messages = allMessages[sessionId] || [];
  debug.info("Database", `Loaded ${messages.length} messages for session ${sessionId}`);
  return messages;
}

export async function saveMessage(sessionId: string, message: ParsedMessage): Promise<void> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("messages")) || {};
  const sessionMessages = allMessages[sessionId] || [];

  // Check if message already exists (update) or is new (add)
  const index = sessionMessages.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    sessionMessages[index] = message;
  } else {
    sessionMessages.push(message);
  }

  allMessages[sessionId] = sessionMessages;
  await s.set("messages", allMessages);
  await s.save();
  debug.info("Database", `Saved message to session ${sessionId}`, { messageId: message.id });
}

export async function deleteMessages(sessionId: string): Promise<void> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("messages")) || {};
  delete allMessages[sessionId];
  await s.set("messages", allMessages);
  await s.save();
  debug.info("Database", `Deleted messages for session ${sessionId}`);
}

// Alias for clearing session messages (keeps session, clears messages)
export async function clearSessionMessages(sessionId: string): Promise<void> {
  await deleteMessages(sessionId);
  debug.info("Database", `Cleared messages for session ${sessionId}`);
}

// ChatWindow operations - using Store for reliable persistence
export async function loadChatWindows(): Promise<ChatWindow[]> {
  const s = await getStore();
  const data = await s.get<ChatWindow[]>("chatWindows");
  const chatWindows = data || [];
  debug.info("Database", `Loaded ${chatWindows.length} chat windows from store`);
  return chatWindows.map((cw) => ({
    ...cw,
    messages: [], // Messages loaded separately
    isPinned: cw.isPinned ?? false,
    totalCost: cw.totalCost || 0,
    totalTokens: cw.totalTokens || 0,
  }));
}

export async function saveChatWindow(chatWindow: ChatWindow): Promise<void> {
  const s = await getStore();
  const chatWindows = (await s.get<ChatWindow[]>("chatWindows")) || [];
  const index = chatWindows.findIndex((cw) => cw.id === chatWindow.id);

  // Create a serializable version (exclude runtime-only fields like messages)
  const chatWindowToSave: ChatWindow = {
    id: chatWindow.id,
    sessionId: chatWindow.sessionId,
    title: chatWindow.title,
    claudeSessionId: chatWindow.claudeSessionId,
    messages: [], // Messages stored separately
    isPinned: chatWindow.isPinned,
    model: chatWindow.model,
    totalCost: chatWindow.totalCost,
    totalTokens: chatWindow.totalTokens,
    createdAt: chatWindow.createdAt,
    updatedAt: chatWindow.updatedAt,
    markedForDeletion: chatWindow.markedForDeletion,
  };

  if (index >= 0) {
    chatWindows[index] = chatWindowToSave;
  } else {
    chatWindows.push(chatWindowToSave);
  }

  await s.set("chatWindows", chatWindows);
  await s.save();
  debug.info("Database", "Saved chat window to store", { id: chatWindow.id, title: chatWindow.title });
}

export async function deleteChatWindow(chatWindowId: string): Promise<void> {
  const s = await getStore();
  const chatWindows = (await s.get<ChatWindow[]>("chatWindows")) || [];
  const filtered = chatWindows.filter((cw) => cw.id !== chatWindowId);
  await s.set("chatWindows", filtered);
  await s.save();

  // Also delete messages for this chat window
  await deleteChatWindowMessages(chatWindowId);
  debug.info("Database", "Deleted chat window from store", { id: chatWindowId });
}

// ChatWindow message operations
export async function loadChatWindowMessages(chatWindowId: string): Promise<ParsedMessage[]> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("chatWindowMessages")) || {};
  const messages = allMessages[chatWindowId] || [];
  debug.info("Database", `Loaded ${messages.length} messages for chat window ${chatWindowId}`);
  return messages;
}

export async function saveChatWindowMessage(chatWindowId: string, message: ParsedMessage): Promise<void> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("chatWindowMessages")) || {};
  const chatWindowMessages = allMessages[chatWindowId] || [];

  // Check if message already exists (update) or is new (add)
  const index = chatWindowMessages.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    chatWindowMessages[index] = message;
  } else {
    chatWindowMessages.push(message);
  }

  allMessages[chatWindowId] = chatWindowMessages;
  await s.set("chatWindowMessages", allMessages);
  await s.save();
  debug.info("Database", `Saved message to chat window ${chatWindowId}`, { messageId: message.id });
}

export async function deleteChatWindowMessages(chatWindowId: string): Promise<void> {
  const s = await getStore();
  const allMessages = (await s.get<Record<string, ParsedMessage[]>>("chatWindowMessages")) || {};
  delete allMessages[chatWindowId];
  await s.set("chatWindowMessages", allMessages);
  await s.save();
  debug.info("Database", `Deleted messages for chat window ${chatWindowId}`);
}

// Alias for clearing chat window messages
export async function clearChatWindowMessages(chatWindowId: string): Promise<void> {
  await deleteChatWindowMessages(chatWindowId);
  debug.info("Database", `Cleared messages for chat window ${chatWindowId}`);
}

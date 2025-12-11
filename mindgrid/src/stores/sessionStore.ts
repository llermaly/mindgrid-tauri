import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ParsedMessage, ClaudeEvent, PermissionMode, CommitMode } from "../lib/claude-types";
import type { GitStatus } from "../lib/git-types";
import { debug } from "./debugStore";
import * as db from "../lib/database";

// Lazy import to avoid circular dependency with window-manager
const getWindowManager = () => import("../lib/window-manager");

// Data structure for session data saved to worktree
interface WorktreeSessionData {
  name: string;
  claudeSessionId: string | null;
  messages: ParsedMessage[];
  totalCost: number;
  model: string | null;
  permissionMode: PermissionMode;
  commitMode: CommitMode;
  panelStates?: Record<string, unknown>;
  savedAt: number;
}

// Helper to save session data to worktree (debounced)
const saveToWorktreeDebounced = (() => {
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};

  return (session: Session) => {
    // Only save if cwd is a worktree
    if (!session.cwd.includes(".mindgrid/worktrees/")) {
      return;
    }

    // Clear existing timer for this session
    if (timers[session.id]) {
      clearTimeout(timers[session.id]);
    }

    // Debounce save by 2 seconds
    timers[session.id] = setTimeout(async () => {
      try {
        const data: WorktreeSessionData = {
          name: session.name,
          claudeSessionId: session.claudeSessionId,
          messages: session.messages,
          totalCost: session.totalCost,
          model: session.model,
          permissionMode: session.permissionMode,
          commitMode: session.commitMode,
          panelStates: session.panelStates as Record<string, unknown>,
          savedAt: Date.now(),
        };

        await invoke("save_session_to_worktree", {
          worktreePath: session.cwd,
          sessionData: JSON.stringify(data, null, 2),
        });

        debug.info("SessionStore", "Saved session to worktree", { sessionId: session.id, cwd: session.cwd });
      } catch (err) {
        console.error("Failed to save session to worktree:", err);
      }
    }, 2000);
  };
})();

export type PanelType = 'research' | 'coding' | 'review' | 'terminal' | 'browser' | 'foundations' | 'git';

export interface PanelState {
  messages: ParsedMessage[];
  claudeSessionId: string | null;
  model: string | null;
  isRunning: boolean;
  totalCost: number;
}

/**
 * ChatWindow represents an independent chat conversation within a session.
 * Each chat window has its own messages, Claude session, and can be pinned or unpinned.
 * - Pinned windows persist and are opened when "Open Workspace" is clicked
 * - Unpinned windows are flagged for cleanup when closed
 */
export interface ChatWindow {
  id: string;
  sessionId: string;
  title: string; // User-editable title, defaults to "Chat 1", "Chat 2", etc.
  claudeSessionId: string | null;
  messages: ParsedMessage[];
  isPinned: boolean; // true = persists (variants), false = cleanup on close
  model: string | null;
  totalCost: number;
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
  markedForDeletion?: boolean; // Flag for cleanup when unpinned window is closed
}

export interface Session {
  id: string;
  name: string;
  projectId: string;
  claudeSessionId: string | null; // Legacy: For single chat window mode (kept for backward compat)
  ptyId: string | null;
  messages: ParsedMessage[]; // Legacy: For single chat window mode (kept for backward compat)
  chatWindows: string[]; // Array of ChatWindow IDs belonging to this session
  isRunning: boolean;
  totalCost: number;
  model: string | null; // Default model for new chat windows
  panelStates?: Partial<Record<PanelType, PanelState>>; // Per-panel state for workspace
  cwd: string;
  createdAt: number;
  updatedAt: number;
  gitStatus?: GitStatus | null;
  gitStatusLoading?: boolean;
  permissionMode: PermissionMode;
  commitMode: CommitMode;
  initialPrompt?: string; // The initial prompt used when creating the session
}

export interface Project {
  id: string;
  name: string;
  path: string;
  sessions: string[]; // Session IDs
  defaultModel: string | null; // Default model for new sessions
  defaultPermissionMode: PermissionMode; // Default permission mode for new sessions
  defaultCommitMode: CommitMode; // Default commit mode for new sessions
  buildCommand: string | null; // Command to build the project
  runCommand: string | null; // Command to run the project (for previews/worktrees)
  systemPrompt: string | null; // System prompt that persists across conversation resets
  initialPrompt: string | null; // Initial prompt sent only on first message (cleared on reset)
  createdAt: number;
  updatedAt: number;
}

interface GhCliStatus {
  available: boolean;
  authenticated: boolean;
  path: string | null;
  error: string | null;
}

interface SessionState {
  projects: Record<string, Project>;
  sessions: Record<string, Session>;
  chatWindows: Record<string, ChatWindow>; // All chat windows indexed by ID
  activeSessionId: string | null;
  activeProjectId: string | null;
  activeChatSessions: Set<string>; // Sessions with open chat windows
  activeRunSessions: Set<string>; // Sessions with open run/preview windows
  isLoading: boolean;
  isInitialized: boolean;
  ghAvailable: boolean;
  ghCliStatus: GhCliStatus | null;

  // Init
  initialize: () => Promise<void>;

  // Project actions
  createProject: (name: string, path: string, options?: { buildCommand?: string; runCommand?: string; systemPrompt?: string; initialPrompt?: string; model?: string | null }) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Session actions
  createSession: (projectId: string, name: string, cwd: string) => Promise<Session>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;

  // ChatWindow actions
  createChatWindow: (sessionId: string, options?: { title?: string; isPinned?: boolean; initialPrompt?: string }) => Promise<ChatWindow>;
  updateChatWindow: (chatWindowId: string, updates: Partial<ChatWindow>) => Promise<void>;
  deleteChatWindow: (chatWindowId: string) => Promise<void>;
  getChatWindow: (chatWindowId: string) => ChatWindow | null;
  getSessionChatWindows: (sessionId: string) => ChatWindow[];
  getPinnedChatWindows: (sessionId: string) => ChatWindow[];
  markChatWindowForDeletion: (chatWindowId: string) => Promise<void>;
  cleanupMarkedChatWindows: () => Promise<void>;
  addChatWindowMessage: (chatWindowId: string, message: ParsedMessage) => Promise<void>;
  handleChatWindowClaudeEvent: (chatWindowId: string, event: ClaudeEvent) => Promise<void>;
  clearChatWindow: (chatWindowId: string) => Promise<void>;
  setChatWindowModel: (chatWindowId: string, model: string) => void;
  toggleChatWindowPinned: (chatWindowId: string) => Promise<void>;

  // Active chat session tracking
  markSessionChatOpen: (sessionId: string) => void;
  markSessionChatClosed: (sessionId: string) => void;
  markSessionRunOpen: (sessionId: string) => void;
  markSessionRunClosed: (sessionId: string) => void;
  isSessionRunning: (sessionId: string) => boolean;
  refreshActiveChatSessions: () => Promise<void>;
  isSessionActive: (sessionId: string) => boolean;

  // Message actions (legacy - for backward compatibility)
  addMessage: (sessionId: string, message: ParsedMessage) => Promise<void>;
  handleClaudeEvent: (sessionId: string, event: ClaudeEvent) => Promise<void>;

  // PTY actions
  setPtyId: (sessionId: string, ptyId: string | null) => void;
  setRunning: (sessionId: string, isRunning: boolean) => void;

  // Git actions
  refreshGitStatus: (sessionId: string) => Promise<void>;
  refreshAllGitStatuses: () => Promise<void>;

  // Session management
  clearSession: (sessionId: string) => Promise<void>;
  setPermissionMode: (sessionId: string, mode: PermissionMode) => void;
  setCommitMode: (sessionId: string, mode: CommitMode) => void;
  setSessionModel: (sessionId: string, model: string) => void;
  setPanelModel: (sessionId: string, panelType: PanelType, model: string) => void;
  setProjectDefaultModel: (projectId: string, model: string | null) => void;
  setProjectDefaultPermissionMode: (projectId: string, mode: PermissionMode) => void;
  setProjectDefaultCommitMode: (projectId: string, mode: CommitMode) => void;

  // Panel-specific actions for workspace mode
  addPanelMessage: (sessionId: string, panelType: PanelType, message: ParsedMessage) => void;
  handlePanelClaudeEvent: (sessionId: string, panelType: PanelType, event: ClaudeEvent) => void;
  clearPanelSession: (sessionId: string, panelType: PanelType) => void;
  getPanelState: (sessionId: string, panelType: PanelType) => PanelState;

  // Commit actions
  checkpointCommit: (sessionId: string, message?: string) => Promise<boolean>;

  // Push actions
  gitPush: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  // PR actions
  getPrInfo: (sessionId: string) => Promise<{ number: number; title: string; state: string; url: string } | null>;
  createPr: (sessionId: string, title: string, body: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  mergePr: (sessionId: string, squash: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const generateId = () => crypto.randomUUID();

export const useSessionStore = create<SessionState>((set, get) => ({
  projects: {},
  sessions: {},
  chatWindows: {},
  activeSessionId: null,
  activeProjectId: null,
  activeChatSessions: new Set<string>(),
  activeRunSessions: new Set<string>(),
  isLoading: false,
  isInitialized: false,
  ghAvailable: false,
  ghCliStatus: null,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    debug.info("SessionStore", "Initializing from store");

    try {
      // Check gh CLI availability
      let ghAvailable = false;
      try {
        ghAvailable = await invoke<boolean>("git_check_gh_cli");
        debug.info("SessionStore", "gh CLI check", { available: ghAvailable });
      } catch (err) {
        debug.info("SessionStore", "gh CLI not available", err);
      }

      // Load projects
      const projectList = await db.loadProjects();
      const projects: Record<string, Project> = {};
      for (const p of projectList) {
        // Ensure sessions array exists
        projects[p.id] = { ...p, sessions: p.sessions || [] };
      }

      // Load sessions and associate with projects
      const sessionList = await db.loadSessions();
      const sessions: Record<string, Session> = {};
      for (const s of sessionList) {
        // Load messages for each session (legacy support)
        const messages = await db.loadMessages(s.id);
        sessions[s.id] = { ...s, messages, chatWindows: s.chatWindows || [] };

        // Associate session with project (if not already)
        if (projects[s.projectId]) {
          if (!projects[s.projectId].sessions.includes(s.id)) {
            projects[s.projectId].sessions.push(s.id);
          }
        }
      }

      // Load chat windows
      const chatWindowList = await db.loadChatWindows();
      const chatWindows: Record<string, ChatWindow> = {};
      for (const cw of chatWindowList) {
        // Load messages for each chat window
        const messages = await db.loadChatWindowMessages(cw.id);
        chatWindows[cw.id] = { ...cw, messages };

        // Associate chat window with session (if not already)
        if (sessions[cw.sessionId]) {
          if (!sessions[cw.sessionId].chatWindows.includes(cw.id)) {
            sessions[cw.sessionId].chatWindows.push(cw.id);
          }
        }
      }

      // Auto-select first session if available
      let activeSessionId: string | null = null;
      let activeProjectId: string | null = null;
      if (sessionList.length > 0) {
        activeSessionId = sessionList[0].id;
        activeProjectId = sessionList[0].projectId;
      }

      set({
        projects,
        sessions,
        chatWindows,
        activeSessionId,
        activeProjectId,
        isLoading: false,
        isInitialized: true,
        ghAvailable,
      });

      debug.info("SessionStore", "Initialized", {
        projects: Object.keys(projects).length,
        sessions: Object.keys(sessions).length,
        chatWindows: Object.keys(chatWindows).length,
        activeSessionId,
      });

      // Refresh git statuses for all sessions after initialization
      setTimeout(() => {
        get().refreshAllGitStatuses();
      }, 500);
    } catch (err) {
      debug.error("SessionStore", "Failed to initialize", err);
      console.error("SessionStore initialization error:", err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  createProject: async (name, path, options) => {
    // Check if project with same path already exists
    const existingProject = Object.values(get().projects).find(p => p.path === path);
    if (existingProject) {
      throw new Error(`Project already exists at this path: ${existingProject.name}`);
    }

    const project: Project = {
      id: generateId(),
      name,
      path,
      sessions: [],
      defaultModel: options?.model || null,
      defaultPermissionMode: 'bypassPermissions', // Default for new sessions
      defaultCommitMode: 'checkpoint', // Default for new sessions
      buildCommand: options?.buildCommand || null,
      runCommand: options?.runCommand || null,
      systemPrompt: options?.systemPrompt || null,
      initialPrompt: options?.initialPrompt || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    debug.info("SessionStore", "Creating project", { name, path, id: project.id });

    // Check for existing worktrees and create sessions for them
    try {
      debug.info("SessionStore", "Checking for existing worktrees", { projectPath: path });
      const worktrees = await invoke<Array<{ path: string; branch?: string }>>("get_project_worktrees", { projectPath: path });
      debug.info("SessionStore", "Worktree check result", { count: worktrees.length, worktrees });

      if (worktrees.length > 0) {
        debug.info("SessionStore", "Found existing worktrees", { count: worktrees.length });

        for (const wt of worktrees) {
          // Extract session name from worktree path (e.g., ".mindgrid/worktrees/session-name-abc123")
          const wtName = wt.path.split("/").pop() || "Imported Session";

          // Try to load saved session data from worktree
          let savedData: WorktreeSessionData | null = null;
          try {
            const savedJson = await invoke<string | null>("load_session_from_worktree", { worktreePath: wt.path });
            if (savedJson) {
              savedData = JSON.parse(savedJson) as WorktreeSessionData;
              debug.info("SessionStore", "Loaded saved session data from worktree", { wtPath: wt.path, messageCount: savedData.messages?.length || 0 });
            }
          } catch (err) {
            debug.warn("SessionStore", "Failed to load session data from worktree", { wtPath: wt.path, error: String(err) });
          }

          const session: Session = {
            id: generateId(),
            name: savedData?.name || wtName,
            projectId: project.id,
            claudeSessionId: savedData?.claudeSessionId || null,
            ptyId: null,
            messages: savedData?.messages || [],
            chatWindows: [], // Will be populated when chat windows are loaded
            isRunning: false,
            totalCost: savedData?.totalCost || 0,
            model: savedData?.model || null,
            cwd: wt.path,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            permissionMode: savedData?.permissionMode || "default",
            commitMode: savedData?.commitMode || "checkpoint",
            panelStates: savedData?.panelStates as Partial<Record<PanelType, PanelState>> | undefined,
          };

          project.sessions.push(session.id);

          // Save session to DB
          await db.saveSession(session);

          // Also save messages to DB if we recovered them
          if (savedData?.messages) {
            for (const msg of savedData.messages) {
              try {
                await db.saveMessage(session.id, msg);
              } catch (err) {
                // Ignore duplicate message errors
              }
            }
          }

          set((state) => ({
            sessions: { ...state.sessions, [session.id]: session },
          }));

          debug.info("SessionStore", "Imported worktree as session", {
            wtPath: wt.path,
            sessionId: session.id,
            recoveredMessages: savedData?.messages?.length || 0
          });
        }
      }
    } catch (err) {
      console.error("Failed to check for existing worktrees:", err);
      debug.warn("SessionStore", "Failed to check for existing worktrees", { error: String(err) });
    }

    // Save to DB
    await db.saveProject(project);

    set((state) => ({
      projects: { ...state.projects, [project.id]: project },
      activeProjectId: project.id,
    }));

    return project;
  },

  updateProject: async (id, updates) => {
    const project = get().projects[id];
    if (!project) return;

    const updated = { ...project, ...updates, updatedAt: Date.now() };

    set((state) => ({
      projects: { ...state.projects, [id]: updated },
    }));

    // Save to DB
    await db.saveProject(updated);
  },

  deleteProject: async (id) => {
    const project = get().projects[id];
    if (!project) return;

    debug.info("SessionStore", "Deleting project", { id, name: project.name });

    // Close all chat windows for all sessions first
    try {
      const { closeAllSessionChatWindows } = await getWindowManager();
      for (const sessionId of project.sessions) {
        try {
          await closeAllSessionChatWindows(sessionId);
        } catch (err) {
          debug.warn("SessionStore", "Failed to close chat windows for session", { sessionId, error: String(err) });
        }
      }
    } catch (err) {
      debug.warn("SessionStore", "Failed to import window-manager", { error: String(err) });
    }

    // Delete all sessions (including worktree cleanup)
    for (const sessionId of project.sessions) {
      const session = get().sessions[sessionId];
      if (session) {
        // Remove worktree if it exists
        if (session.cwd !== project.path && session.cwd.includes(".mindgrid/worktrees")) {
          try {
            debug.info("SessionStore", "Removing worktree for project deletion", { worktreePath: session.cwd });
            await invoke("remove_workspace_worktree", {
              projectPath: project.path,
              worktreePath: session.cwd
            });
          } catch (err) {
            console.error("Failed to remove worktree:", err);
            debug.error("SessionStore", "Failed to remove worktree", err);
          }
        }
      }
      await db.deleteSession(sessionId);
    }

    // Delete project
    await db.deleteProject(id);

    set((state) => {
      const { [id]: _, ...projects } = state.projects;
      const sessions = { ...state.sessions };

      // Remove sessions from state
      for (const sessionId of project.sessions) {
        delete sessions[sessionId];
      }

      return {
        projects,
        sessions,
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        activeSessionId:
          project.sessions.includes(state.activeSessionId || "")
            ? null
            : state.activeSessionId,
      };
    });
  },

  createSession: async (projectId, name, cwd) => {
    const id = generateId();
    let sessionCwd = cwd;

    // Try to create worktree for isolation
    try {
      const project = get().projects[projectId];
      if (project) {
        const isGit = await invoke<boolean>("validate_git_repository", { projectPath: project.path });
        if (isGit) {
           // Use sanitized name + short ID for uniqueness and readability
           const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
           const worktreeName = `${sanitizedName}-${id.slice(0, 6)}`;

           debug.info("SessionStore", "Creating worktree for session", { worktreeName });

           const worktreePath = await invoke<string>("create_workspace_worktree", {
             projectPath: project.path,
             name: worktreeName
           });

           // Validate worktree was created successfully
           if (worktreePath && worktreePath !== project.path && worktreePath.includes('.mindgrid/worktrees')) {
             sessionCwd = worktreePath;
             debug.info("SessionStore", "Created worktree", { worktreePath });
           } else {
             throw new Error(`Worktree creation returned invalid path: ${worktreePath}`);
           }
        }
      }
    } catch (err) {
      console.error("Failed to create worktree:", err);
      debug.error("SessionStore", "Failed to create worktree", err);
      // Re-throw to prevent session creation with invalid cwd
      throw new Error(`Failed to create isolated worktree for session: ${err}`);
    }

    // Get project's defaults
    const projectDefaults = get().projects[projectId];
    const defaultModel = projectDefaults?.defaultModel || null;
    const defaultPermissionMode = projectDefaults?.defaultPermissionMode || 'bypassPermissions';
    const defaultCommitMode = projectDefaults?.defaultCommitMode || 'checkpoint';

    const session: Session = {
      id,
      name,
      projectId,
      claudeSessionId: null,
      ptyId: null,
      messages: [],
      chatWindows: [], // Initialize empty, chat windows added via createChatWindow
      isRunning: false,
      totalCost: 0,
      model: defaultModel, // Inherit from project default
      cwd: sessionCwd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      permissionMode: defaultPermissionMode, // Inherit from project default
      commitMode: defaultCommitMode, // Inherit from project default
    };

    debug.info("SessionStore", "Creating session", { name, projectId, id: session.id, cwd: session.cwd });
    console.log("Creating session:", session);

    // Save to DB
    try {
      console.log("Calling db.saveSession...");
      await db.saveSession(session);
      console.log("db.saveSession completed successfully");
    } catch (err) {
      console.error("db.saveSession FAILED:", err);
      throw err;
    }

    set((state) => {
      const project = state.projects[projectId];
      return {
        sessions: { ...state.sessions, [session.id]: session },
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            sessions: [...project.sessions, session.id],
            updatedAt: Date.now(),
          },
        },
        activeSessionId: session.id,
      };
    });

    // Create the default "Main Session" chat window
    // This ensures every session starts with one pinned chat window
    try {
      await get().createChatWindow(session.id, {
        title: "Main Session",
        isPinned: true,
      });
      debug.info("SessionStore", "Created default Main Session chat window", { sessionId: session.id });
    } catch (err) {
      console.error("Failed to create default chat window:", err);
      // We continue even if this fails, though it's not ideal
    }

    // Update project in DB
    const project = get().projects[projectId];
    if (project) {
      await db.saveProject(project);
    }

    // Return the latest session state (which includes the new chat window)
    return get().sessions[session.id];
  },

  updateSession: async (id, updates) => {
    const session = get().sessions[id];
    if (!session) return;

    const updated = { ...session, ...updates, updatedAt: Date.now() };

    set((state) => ({
      sessions: { ...state.sessions, [id]: updated },
    }));

    // Save to DB (excluding runtime-only fields)
    await db.saveSession({
      ...updated,
      messages: [], // Don't save messages array in session
    });
  },

  deleteSession: async (id) => {
    console.log("[SessionStore] deleteSession called for id:", id);
    const session = get().sessions[id];
    if (!session) {
      console.error("[SessionStore] Session not found for delete:", id);
      return;
    }

    debug.info("SessionStore", "Deleting session", { id, name: session.name });

    // Close all chat windows for this session first
    try {
      const { closeAllSessionChatWindows } = await getWindowManager();
      await closeAllSessionChatWindows(id);
    } catch (err) {
      debug.warn("SessionStore", "Failed to close chat windows for session", { id, error: String(err) });
    }

    // Remove worktree if it exists and is different from project path
    const project = get().projects[session.projectId];
    if (project && session.cwd !== project.path && session.cwd.includes(".mindgrid/worktrees")) {
       try {
         debug.info("SessionStore", "Removing worktree", { worktreePath: session.cwd });
         await invoke("remove_workspace_worktree", {
           projectPath: project.path,
           worktreePath: session.cwd
         });
         debug.info("SessionStore", "Worktree removed successfully");
       } catch (err) {
         console.error("Failed to remove worktree:", err);
         debug.error("SessionStore", "Failed to remove worktree", err);
         // Don't delete session if worktree removal failed - prevents orphaned worktrees
         throw new Error(`Cannot delete session: failed to remove worktree. ${err}`);
       }
    }

    // Delete from DB (only if worktree removal succeeded or wasn't needed)
    await db.deleteSession(id);

    set((state) => {
      const { [id]: _, ...sessions } = state.sessions;
      const project = state.projects[session.projectId];
      return {
        sessions,
        projects: {
          ...state.projects,
          [session.projectId]: {
            ...project,
            sessions: project.sessions.filter((sid) => sid !== id),
            updatedAt: Date.now(),
          },
        },
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      };
    });

    // Update project in DB
    const updatedProject = get().projects[session.projectId];
    if (updatedProject) {
      await db.saveProject(updatedProject);
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
    if (id) {
      const session = get().sessions[id];
      if (session) {
        set({ activeProjectId: session.projectId });
      }
    }
  },

  // ChatWindow CRUD actions
  createChatWindow: async (sessionId, options) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Generate a unique ID and default title
    const id = generateId();
    const existingWindows = get().getSessionChatWindows(sessionId);
    const defaultTitle = options?.title || `Chat ${existingWindows.length + 1}`;

    const chatWindow: ChatWindow = {
      id,
      sessionId,
      title: defaultTitle,
      claudeSessionId: null,
      messages: [],
      isPinned: options?.isPinned ?? false, // Defaults to unpinned for new windows
      model: session.model, // Inherit from session
      totalCost: 0,
      totalTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    debug.info("SessionStore", "Creating chat window", { id, sessionId, title: defaultTitle, isPinned: chatWindow.isPinned });

    // Save to DB
    await db.saveChatWindow(chatWindow);

    // Update state
    set((state) => {
      const session = state.sessions[sessionId];
      return {
        chatWindows: { ...state.chatWindows, [id]: chatWindow },
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            chatWindows: [...session.chatWindows, id],
            updatedAt: Date.now(),
          },
        },
      };
    });

    // Update session in DB
    const updatedSession = get().sessions[sessionId];
    if (updatedSession) {
      await db.saveSession({ ...updatedSession, messages: [] });
    }

    return chatWindow;
  },

  updateChatWindow: async (chatWindowId, updates) => {
    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    const updated = { ...chatWindow, ...updates, updatedAt: Date.now() };

    set((state) => ({
      chatWindows: { ...state.chatWindows, [chatWindowId]: updated },
    }));

    // Save to DB (excluding messages which are stored separately)
    await db.saveChatWindow({ ...updated, messages: [] });
  },

  deleteChatWindow: async (chatWindowId) => {
    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    debug.info("SessionStore", "Deleting chat window", { chatWindowId, sessionId: chatWindow.sessionId });

    // Delete from DB
    await db.deleteChatWindow(chatWindowId);

    // Update state
    set((state) => {
      const { [chatWindowId]: _, ...remainingWindows } = state.chatWindows;
      const session = state.sessions[chatWindow.sessionId];

      return {
        chatWindows: remainingWindows,
        sessions: session ? {
          ...state.sessions,
          [chatWindow.sessionId]: {
            ...session,
            chatWindows: session.chatWindows.filter(id => id !== chatWindowId),
            updatedAt: Date.now(),
          },
        } : state.sessions,
      };
    });

    // Update session in DB
    const session = get().sessions[chatWindow.sessionId];
    if (session) {
      await db.saveSession({ ...session, messages: [] });
    }
  },

  getChatWindow: (chatWindowId) => {
    return get().chatWindows[chatWindowId] || null;
  },

  getSessionChatWindows: (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return [];
    return session.chatWindows
      .map(id => get().chatWindows[id])
      .filter((cw): cw is ChatWindow => cw !== undefined);
  },

  getPinnedChatWindows: (sessionId) => {
    return get().getSessionChatWindows(sessionId).filter(cw => cw.isPinned);
  },

  markChatWindowForDeletion: async (chatWindowId) => {
    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    // Only mark unpinned windows for deletion
    if (chatWindow.isPinned) {
      debug.info("SessionStore", "Skipping deletion mark for pinned window", { chatWindowId });
      return;
    }

    debug.info("SessionStore", "Marking chat window for deletion", { chatWindowId });
    await get().updateChatWindow(chatWindowId, { markedForDeletion: true });
  },

  cleanupMarkedChatWindows: async () => {
    const markedWindows = Object.values(get().chatWindows).filter(cw => cw.markedForDeletion);
    debug.info("SessionStore", "Cleaning up marked chat windows", { count: markedWindows.length });

    for (const chatWindow of markedWindows) {
      await get().deleteChatWindow(chatWindow.id);
    }
  },

  addChatWindowMessage: async (chatWindowId, message) => {
    debug.event("SessionStore", "Adding chat window message", { chatWindowId, role: message.role });

    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) {
      console.error("[SessionStore] Chat window not found:", chatWindowId);
      return;
    }

    set((state) => {
      const cw = state.chatWindows[chatWindowId];
      if (!cw) return state;

      // Check if message already exists (for streaming updates)
      const existingIndex = cw.messages.findIndex((m) => m.id === message.id);
      let newMessages;

      if (existingIndex >= 0) {
        newMessages = [...cw.messages];
        newMessages[existingIndex] = { ...newMessages[existingIndex], ...message };
      } else {
        newMessages = [...cw.messages, message];
      }

      return {
        chatWindows: {
          ...state.chatWindows,
          [chatWindowId]: {
            ...cw,
            messages: newMessages,
            updatedAt: Date.now(),
          },
        },
      };
    });

    // Save message to store (only if not partial)
    if (!message.isPartial) {
      try {
        await db.saveChatWindowMessage(chatWindowId, message);
      } catch (err) {
        console.error("[SessionStore] Failed to save chat window message:", err);
      }
    }
  },

  handleChatWindowClaudeEvent: async (chatWindowId, event) => {
    debug.event("SessionStore", "Chat window Claude event", { chatWindowId, type: event.type });

    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    const updates: Partial<ChatWindow> = { updatedAt: Date.now() };
    let shouldSave = false;

    if (event.type === "system" && event.subtype === "init") {
      updates.claudeSessionId = event.session_id || null;
      // Only set model from init event if chat window doesn't already have one
      if (!chatWindow.model && event.model) {
        updates.model = event.model;
      }
    }

    if (event.type === "result" && event.cost_usd) {
      updates.totalCost = chatWindow.totalCost + event.cost_usd;
      shouldSave = true;
    }

    // Track tokens if available from modelUsage
    if (event.type === "result" && event.modelUsage) {
      let totalTokensFromEvent = 0;
      for (const modelData of Object.values(event.modelUsage)) {
        totalTokensFromEvent +=
          (modelData.inputTokens || 0) +
          (modelData.outputTokens || 0) +
          (modelData.cacheReadInputTokens || 0) +
          (modelData.cacheCreationInputTokens || 0);
      }
      if (totalTokensFromEvent > 0) {
        updates.totalTokens = (chatWindow.totalTokens || 0) + totalTokensFromEvent;
        shouldSave = true;
      }
    }

    const updated: ChatWindow = { ...chatWindow, ...updates };

    set((state) => ({
      chatWindows: { ...state.chatWindows, [chatWindowId]: updated },
    }));

    // Save chat window to DB if cost/tokens changed
    if (shouldSave) {
      await db.saveChatWindow({ ...updated, messages: [] });
    }
  },

  clearChatWindow: async (chatWindowId) => {
    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    debug.info("SessionStore", "Clearing chat window messages", { chatWindowId });

    // Clear messages from state
    set((state) => ({
      chatWindows: {
        ...state.chatWindows,
        [chatWindowId]: {
          ...state.chatWindows[chatWindowId],
          messages: [],
          claudeSessionId: null, // Reset Claude session to start fresh
          totalCost: 0,
          totalTokens: 0,
          updatedAt: Date.now(),
        },
      },
    }));

    // Clear messages from database
    await db.clearChatWindowMessages(chatWindowId);

    // Update chat window in database
    const updated = get().chatWindows[chatWindowId];
    if (updated) {
      await db.saveChatWindow({ ...updated, messages: [] });
    }
  },

  setChatWindowModel: (chatWindowId, model) => {
    debug.info("SessionStore", "Setting chat window model", { chatWindowId, model });
    set((state) => {
      const chatWindow = state.chatWindows[chatWindowId];
      if (!chatWindow) return state;
      return {
        chatWindows: {
          ...state.chatWindows,
          [chatWindowId]: { ...chatWindow, model, updatedAt: Date.now() },
        },
      };
    });

    // Persist to database
    const chatWindow = get().chatWindows[chatWindowId];
    if (chatWindow) {
      db.saveChatWindow({ ...chatWindow, messages: [] });
    }
  },

  toggleChatWindowPinned: async (chatWindowId) => {
    const chatWindow = get().chatWindows[chatWindowId];
    if (!chatWindow) return;

    const newPinned = !chatWindow.isPinned;
    debug.info("SessionStore", "Toggling chat window pinned", { chatWindowId, isPinned: newPinned });

    await get().updateChatWindow(chatWindowId, {
      isPinned: newPinned,
      // Clear deletion mark if pinning
      markedForDeletion: newPinned ? false : chatWindow.markedForDeletion,
    });
  },

  addMessage: async (sessionId, message) => {
    console.log("[SessionStore] addMessage called:", sessionId, message.role, message.id);
    debug.event("SessionStore", "Adding message", { sessionId, role: message.role });

    const currentSession = get().sessions[sessionId];
    if (!currentSession) {
      console.error("[SessionStore] Session not found:", sessionId);
      return;
    }

    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      // Check if message already exists (for streaming updates)
      const existingIndex = session.messages.findIndex((m) => m.id === message.id);
      let newMessages;

      if (existingIndex >= 0) {
        newMessages = [...session.messages];
        newMessages[existingIndex] = { ...newMessages[existingIndex], ...message };
      } else {
        newMessages = [...session.messages, message];
      }

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: newMessages,
            updatedAt: Date.now(),
          },
        },
      };
    });

    // Save message to store (only if not partial)
    if (!message.isPartial) {
      try {
        await db.saveMessage(sessionId, message);
      } catch (err) {
        console.error("[SessionStore] Failed to save message to store:", err);
      }

      // Also save to worktree for persistence
      const updatedSession = get().sessions[sessionId];
      if (updatedSession) {
        saveToWorktreeDebounced(updatedSession);
      }
    }
  },

  handleClaudeEvent: async (sessionId, event) => {
    debug.event("SessionStore", "Claude event", { sessionId, type: event.type });

    let updatedSession: Session | null = null;
    let shouldSaveSession = false;

    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const updates: Partial<Session> = { updatedAt: Date.now() };

      if (event.type === "system" && event.subtype === "init") {
        updates.claudeSessionId = event.session_id || null;
        // Only set model from init event if session doesn't already have one
        // This prevents overwriting user's selected model (e.g., Opus) with CLI's default (Haiku)
        if (!session.model && event.model) {
          updates.model = event.model;
        }

        // Persist Claude session ID to database for session resumption
        if (event.session_id) {
          debug.info("SessionStore", "Persisting Claude session ID", { sessionId, claudeSessionId: event.session_id });
          db.updateSessionClaudeId(sessionId, event.session_id);
        }
      }

      if (event.type === "result" && event.cost_usd) {
        updates.totalCost = session.totalCost + event.cost_usd;
        shouldSaveSession = true;
      }

      const updated = { ...session, ...updates };
      updatedSession = updated;

      return {
        sessions: { ...state.sessions, [sessionId]: updated },
      };
    });

    // Save session to DB if cost changed (outside of set callback)
    if (shouldSaveSession && updatedSession) {
      await db.saveSession(updatedSession);
    }
  },

  setPtyId: (sessionId, ptyId) => {
    debug.pty("SessionStore", "Setting PTY ID", { sessionId, ptyId });
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, ptyId, updatedAt: Date.now() },
        },
      };
    });
  },

  setRunning: (sessionId, isRunning) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, isRunning, updatedAt: Date.now() },
        },
      };
    });
  },

  refreshGitStatus: async (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return;

    // Set loading state
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: { ...state.sessions[sessionId], gitStatusLoading: true },
      },
    }));

    try {
      const gitStatus = await invoke<GitStatus>("get_git_status", {
        workingDirectory: session.cwd,
      });

      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            gitStatus,
            gitStatusLoading: false,
          },
        },
      }));

      debug.info("SessionStore", "Git status refreshed", { sessionId, state: gitStatus.state });
    } catch (err) {
      // Not a git repository or other error - clear status
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            gitStatus: null,
            gitStatusLoading: false,
          },
        },
      }));
      debug.info("SessionStore", "Git status unavailable", { sessionId, error: err });
    }
  },

  refreshAllGitStatuses: async () => {
    const sessions = Object.values(get().sessions);

    // Refresh in parallel with a small delay between each to avoid overwhelming
    const promises = sessions.map((session, index) =>
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          await get().refreshGitStatus(session.id);
          resolve();
        }, index * 100); // Stagger by 100ms
      })
    );

    await Promise.all(promises);
  },

  clearSession: async (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return;

    debug.info("SessionStore", "Clearing session messages", { sessionId });

    // Clear messages from state
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          messages: [],
          claudeSessionId: null, // Reset Claude session to start fresh
          totalCost: 0,
          updatedAt: Date.now(),
        },
      },
    }));

    // Clear messages from database
    await db.clearSessionMessages(sessionId);

    // Update session in database
    const updatedSession = get().sessions[sessionId];
    if (updatedSession) {
      await db.saveSession({ ...updatedSession, messages: [] });
    }
  },

  setPermissionMode: (sessionId, mode) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, permissionMode: mode, updatedAt: Date.now() },
        },
      };
    });
  },

  setCommitMode: (sessionId, mode) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, commitMode: mode, updatedAt: Date.now() },
        },
      };
    });
  },

  setSessionModel: (sessionId, model) => {
    debug.info("SessionStore", "Setting session model", { sessionId, model });
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, model, updatedAt: Date.now() },
        },
      };
    });

    // Persist to database
    const session = get().sessions[sessionId];
    if (session) {
      db.saveSession({ ...session, messages: [] });
    }
  },

  setPanelModel: (sessionId, panelType, model) => {
    debug.info("SessionStore", "Setting panel model", { sessionId, panelType, model });
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      const currentPanelState = session.panelStates?.[panelType] || {
        messages: [],
        claudeSessionId: null,
        model: null,
        isRunning: false,
        totalCost: 0,
      };
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            panelStates: {
              ...session.panelStates,
              [panelType]: {
                ...currentPanelState,
                model,
              },
            },
            updatedAt: Date.now(),
          },
        },
      };
    });

    // Persist to database
    const session = get().sessions[sessionId];
    if (session) {
      db.saveSession({ ...session, messages: [] });
    }
  },

  // Panel-specific actions for workspace mode
  addPanelMessage: (sessionId, panelType, message) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const currentPanelState = session.panelStates?.[panelType] || {
        messages: [],
        claudeSessionId: null,
        model: null,
        isRunning: false,
        totalCost: 0,
      };

      // Update or add message (for streaming updates)
      const existingIndex = currentPanelState.messages.findIndex((m) => m.id === message.id);
      let newMessages: ParsedMessage[];
      if (existingIndex >= 0) {
        newMessages = [...currentPanelState.messages];
        newMessages[existingIndex] = message;
      } else {
        newMessages = [...currentPanelState.messages, message];
      }

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            panelStates: {
              ...session.panelStates,
              [panelType]: {
                ...currentPanelState,
                messages: newMessages,
              },
            },
            updatedAt: Date.now(),
          },
        },
      };
    });
  },

  handlePanelClaudeEvent: (sessionId, panelType, event) => {
    debug.event("SessionStore", `Panel Claude event: ${event.type}`, { sessionId, panelType, event });

    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const currentPanelState = session.panelStates?.[panelType] || {
        messages: [],
        claudeSessionId: null,
        model: null,
        isRunning: false,
        totalCost: 0,
      };

      let updates: Partial<PanelState> = {};

      // Capture Claude session ID from init event
      if (event.type === "system" && event.subtype === "init" && event.session_id) {
        updates.claudeSessionId = event.session_id;
        debug.info("SessionStore", "Panel captured Claude session ID", { sessionId, panelType, claudeSessionId: event.session_id });
      }

      // Update cost from result event
      if (event.type === "result" && event.cost_usd !== undefined) {
        updates.totalCost = (currentPanelState.totalCost || 0) + event.cost_usd;
      }

      if (Object.keys(updates).length === 0) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            panelStates: {
              ...session.panelStates,
              [panelType]: {
                ...currentPanelState,
                ...updates,
              },
            },
            updatedAt: Date.now(),
          },
        },
      };
    });
  },

  clearPanelSession: (sessionId, panelType) => {
    debug.info("SessionStore", "Clearing panel session", { sessionId, panelType });
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            panelStates: {
              ...session.panelStates,
              [panelType]: {
                messages: [],
                claudeSessionId: null,
                model: session.panelStates?.[panelType]?.model || null,
                isRunning: false,
                totalCost: 0,
              },
            },
            updatedAt: Date.now(),
          },
        },
      };
    });
  },

  getPanelState: (sessionId, panelType) => {
    const session = get().sessions[sessionId];
    if (!session) {
      return {
        messages: [],
        claudeSessionId: null,
        model: null,
        isRunning: false,
        totalCost: 0,
      };
    }
    return session.panelStates?.[panelType] || {
      messages: [],
      claudeSessionId: null,
      model: session.model, // Fall back to session default
      isRunning: false,
      totalCost: 0,
    };
  },

  setProjectDefaultModel: async (projectId, model) => {
    debug.info("SessionStore", "Setting project default model", { projectId, model });
    const project = get().projects[projectId];
    if (!project) return;

    const updated = { ...project, defaultModel: model, updatedAt: Date.now() };

    set((state) => ({
      projects: { ...state.projects, [projectId]: updated },
    }));

    // Persist to database
    await db.saveProject(updated);
  },

  setProjectDefaultPermissionMode: async (projectId, mode) => {
    debug.info("SessionStore", "Setting project default permission mode", { projectId, mode });
    const project = get().projects[projectId];
    if (!project) return;

    const updated = { ...project, defaultPermissionMode: mode, updatedAt: Date.now() };

    set((state) => ({
      projects: { ...state.projects, [projectId]: updated },
    }));

    // Persist to database
    await db.saveProject(updated);
  },

  setProjectDefaultCommitMode: async (projectId, mode) => {
    debug.info("SessionStore", "Setting project default commit mode", { projectId, mode });
    const project = get().projects[projectId];
    if (!project) return;

    const updated = { ...project, defaultCommitMode: mode, updatedAt: Date.now() };

    set((state) => ({
      projects: { ...state.projects, [projectId]: updated },
    }));

    // Persist to database
    await db.saveProject(updated);
  },

  checkpointCommit: async (sessionId, message) => {
    const session = get().sessions[sessionId];
    if (!session) return false;

    try {
      // Check if there are changes to commit
      const hasChanges = await invoke<boolean>("git_has_changes", {
        workingDirectory: session.cwd,
      });

      if (!hasChanges) {
        debug.info("SessionStore", "No changes to checkpoint", { sessionId });
        return false;
      }

      // Create checkpoint commit
      const commitMessage = message || `checkpoint: auto-commit at ${new Date().toLocaleTimeString()}`;
      const result = await invoke<{ success: boolean; hash?: string; message?: string }>("git_checkpoint_commit", {
        workingDirectory: session.cwd,
        message: commitMessage,
      });

      if (result.success) {
        debug.info("SessionStore", "Checkpoint commit created", { sessionId, hash: result.hash });
        // Refresh git status after commit
        await get().refreshGitStatus(sessionId);
        return true;
      } else {
        debug.error("SessionStore", "Checkpoint commit failed", { sessionId, message: result.message });
        return false;
      }
    } catch (err) {
      debug.error("SessionStore", "Failed to create checkpoint commit", err);
      return false;
    }
  },

  gitPush: async (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return { success: false, error: "Session not found" };

    debug.info("SessionStore", "Pushing changes to remote", { sessionId });

    try {
      const result = await invoke<{ success: boolean; error?: string }>("git_push", {
        workingDirectory: session.cwd,
        setUpstream: true,
      });

      if (result.success) {
        debug.info("SessionStore", "Push completed successfully", { sessionId });
        // Refresh git status after push
        await get().refreshGitStatus(sessionId);
        return { success: true };
      } else {
        debug.error("SessionStore", "Push failed", { sessionId, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to push to remote";
      debug.error("SessionStore", "Push error", err);
      return { success: false, error: errorMessage };
    }
  },

  getPrInfo: async (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return null;

    try {
      const result = await invoke<{ number: number; title: string; state: string; url: string } | null>("git_get_pr_info", {
        workingDirectory: session.cwd,
      });
      return result;
    } catch (err) {
      debug.error("SessionStore", "Failed to get PR info", err);
      return null;
    }
  },

  createPr: async (sessionId, title, body) => {
    const session = get().sessions[sessionId];
    if (!session) return { success: false, error: "Session not found" };

    debug.info("SessionStore", "Creating PR", { sessionId, title });

    try {
      const result = await invoke<{ success: boolean; url?: string; error?: string }>("git_create_pr", {
        workingDirectory: session.cwd,
        title,
        body,
      });

      if (result.success) {
        debug.info("SessionStore", "PR created successfully", { sessionId, url: result.url });
      } else {
        debug.error("SessionStore", "PR creation failed", { sessionId, error: result.error });
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create PR";
      debug.error("SessionStore", "PR creation error", err);
      return { success: false, error: errorMessage };
    }
  },

  checkMergeConflicts: async (sessionId: string) => {
    const session = get().sessions[sessionId];
    if (!session) return null;

    const project = get().projects[session.projectId];
    if (!project) return null;

    debug.info("SessionStore", "Checking for merge conflicts", { sessionId });

    try {
      const result = await invoke<{
        has_conflicts: boolean;
        conflicting_files: string[];
        conflicting_commits?: {
          ours: string[];
          theirs: string[];
        };
      }>("git_check_merge_conflicts", {
        workingDirectory: session.cwd,
        projectPath: project.path,
      });

      debug.info("SessionStore", "Conflict check complete", {
        sessionId,
        hasConflicts: result.has_conflicts,
        fileCount: result.conflicting_files.length,
      });

      return result;
    } catch (err) {
      debug.error("SessionStore", "Failed to check merge conflicts", err);
      return null;
    }
  },

  mergePr: async (sessionId, squash) => {
    const session = get().sessions[sessionId];
    if (!session) return { success: false, error: "Session not found" };

    debug.info("SessionStore", "Merging PR", { sessionId, squash });

    try {
      const result = await invoke<{ success: boolean; message?: string; error?: string }>("git_merge_pr", {
        workingDirectory: session.cwd,
        squash,
      });

      if (result.success) {
        debug.info("SessionStore", "PR merged successfully", { sessionId });
        // Refresh git status after merge
        await get().refreshGitStatus(sessionId);
      } else {
        debug.error("SessionStore", "PR merge failed", { sessionId, error: result.error });
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to merge PR";
      debug.error("SessionStore", "PR merge error", err);
      return { success: false, error: errorMessage };
    }
  },

  // Active chat session tracking
  markSessionChatOpen: (sessionId) => {
    set((state) => {
      const newActiveChatSessions = new Set(state.activeChatSessions);
      newActiveChatSessions.add(sessionId);
      debug.info("SessionStore", "Marked session chat as open", { sessionId, activeCount: newActiveChatSessions.size });
      return { activeChatSessions: newActiveChatSessions };
    });
  },

  markSessionChatClosed: (sessionId) => {
    set((state) => {
      const newActiveChatSessions = new Set(state.activeChatSessions);
      newActiveChatSessions.delete(sessionId);
      debug.info("SessionStore", "Marked session chat as closed", { sessionId, activeCount: newActiveChatSessions.size });
      return { activeChatSessions: newActiveChatSessions };
    });
  },

  markSessionRunOpen: (sessionId) => {
    set((state) => {
      const newActiveRunSessions = new Set(state.activeRunSessions);
      newActiveRunSessions.add(sessionId);
      debug.info("SessionStore", "Marked session run as open", { sessionId, activeCount: newActiveRunSessions.size });
      return { activeRunSessions: newActiveRunSessions };
    });
  },

  markSessionRunClosed: (sessionId) => {
    set((state) => {
      const newActiveRunSessions = new Set(state.activeRunSessions);
      newActiveRunSessions.delete(sessionId);
      debug.info("SessionStore", "Marked session run as closed", { sessionId, activeCount: newActiveRunSessions.size });
      return { activeRunSessions: newActiveRunSessions };
    });
  },

  isSessionRunning: (sessionId) => {
    return get().activeRunSessions.has(sessionId);
  },

  refreshActiveChatSessions: async () => {
    try {
      const { getAllWebviewWindows } = await import("@tauri-apps/api/webviewWindow");
      const windows = await getAllWebviewWindows();
      const chatWindows = windows.filter(w => w.label.startsWith("chat-") || w.label.startsWith("workspace-"));

      const activeSessions = new Set<string>();
      for (const window of chatWindows) {
        // Extract session ID from window label
        // Format: "chat-{sessionId}" or "chat-{sessionId}-{timestamp}" or "workspace-{sessionId}"
        const match = window.label.match(/^(?:chat|workspace)-([a-f0-9-]+)/);
        if (match) {
          activeSessions.add(match[1]);
        }
      }

      set({ activeChatSessions: activeSessions });
      debug.info("SessionStore", "Refreshed active chat sessions", { count: activeSessions.size });
    } catch (err) {
      debug.error("SessionStore", "Failed to refresh active chat sessions", err);
    }
  },

  isSessionActive: (sessionId) => {
    return get().activeChatSessions.has(sessionId);
  },
}));

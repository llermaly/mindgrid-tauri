import { create } from "zustand";
import type { ParsedMessage, ClaudeEvent } from "../lib/claude-types";
import { debug } from "./debugStore";
import * as db from "../lib/database";

export interface Session {
  id: string;
  name: string;
  projectId: string;
  claudeSessionId: string | null;
  ptyId: string | null;
  messages: ParsedMessage[];
  isRunning: boolean;
  totalCost: number;
  model: string | null;
  cwd: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  sessions: string[]; // Session IDs
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  projects: Record<string, Project>;
  sessions: Record<string, Session>;
  activeSessionId: string | null;
  activeProjectId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Init
  initialize: () => Promise<void>;

  // Project actions
  createProject: (name: string, path: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Session actions
  createSession: (projectId: string, name: string, cwd: string) => Promise<Session>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;

  // Message actions
  addMessage: (sessionId: string, message: ParsedMessage) => Promise<void>;
  handleClaudeEvent: (sessionId: string, event: ClaudeEvent) => Promise<void>;

  // PTY actions
  setPtyId: (sessionId: string, ptyId: string | null) => void;
  setRunning: (sessionId: string, isRunning: boolean) => void;
}

const generateId = () => crypto.randomUUID();

export const useSessionStore = create<SessionState>((set, get) => ({
  projects: {},
  sessions: {},
  activeSessionId: null,
  activeProjectId: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    debug.info("SessionStore", "Initializing from store");

    try {
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
        // Load messages for each session
        const messages = await db.loadMessages(s.id);
        sessions[s.id] = { ...s, messages };

        // Associate session with project (if not already)
        if (projects[s.projectId]) {
          if (!projects[s.projectId].sessions.includes(s.id)) {
            projects[s.projectId].sessions.push(s.id);
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
        activeSessionId,
        activeProjectId,
        isLoading: false,
        isInitialized: true,
      });

      debug.info("SessionStore", "Initialized", {
        projects: Object.keys(projects).length,
        sessions: Object.keys(sessions).length,
        activeSessionId,
      });
    } catch (err) {
      debug.error("SessionStore", "Failed to initialize", err);
      console.error("SessionStore initialization error:", err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  createProject: async (name, path) => {
    const project: Project = {
      id: generateId(),
      name,
      path,
      sessions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    debug.info("SessionStore", "Creating project", { name, path, id: project.id });

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

    // Delete all sessions first
    for (const sessionId of project.sessions) {
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
    const session: Session = {
      id: generateId(),
      name,
      projectId,
      claudeSessionId: null,
      ptyId: null,
      messages: [],
      isRunning: false,
      totalCost: 0,
      model: null,
      cwd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    debug.info("SessionStore", "Creating session", { name, projectId, id: session.id });
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

    // Update project in DB
    const project = get().projects[projectId];
    if (project) {
      await db.saveProject(project);
    }

    return session;
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
    const session = get().sessions[id];
    if (!session) return;

    debug.info("SessionStore", "Deleting session", { id, name: session.name });

    // Delete from DB
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
    const project = get().projects[session.projectId];
    if (project) {
      await db.saveProject(project);
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
        updates.model = event.model || null;

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
}));

# MindGrid - Next Generation AI Development Workstation

> A multi-session, multi-model development environment built with Tauri.

## Background

This project is a migration from Crystal (an Electron app that became difficult to extend). MindGrid takes the best concepts from Crystal and rebuilds them in Tauri for better performance, smaller binaries, and a cleaner architecture.

**Migration Philosophy:**
- Feature-by-feature migration, not a big-bang rewrite
- Crystal remains a read-only reference (`crystal/` folder)
- Each feature gets a clean implementation
- UI prototypes in `prototypes/` define the target UX

---

## Core Philosophy

**"Work on many things at once, with AI as a collaborative partner."**

- Each session is a **self-contained screen** with everything you need visible
- Switch between sessions like poker tables with hotkeys
- One AI agent per session (single agent first, multi-agent later)
- Shared context ("Foundations") so agents and humans stay aligned

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                            SESSION SCREEN                               |
+-----------------------------------+-------------------------------------+
|                                   |                                     |
|  CLAUDE CODE                      |  BROWSER                            |
|  ---------------------------------|  -----------------------------------+
|  * Full Claude Code instance      |  * Live preview (localhost)         |
|  * Terminal-style interaction     |  * Auto-refresh on file changes     |
|  * Model selection per session    |  * Console errors visible           |
|                                   |                                     |
+-----------------------------------+-------------------------------------+
|                                   |                                     |
|  FOUNDATIONS                      |  GIT / FILES                        |
|  ---------------------------------|  -----------------------------------+
|  * PLAN.md - current sprint       |  * File tree navigation             |
|  * CONTEXT.md - project info      |  * Git status and diffs             |
|  * DECISIONS.md - why we did X    |  * Worktree management              |
|  * Live sync, user-editable       |                                     |
|                                   |                                     |
+-----------------------------------+-------------------------------------+
|  TERMINAL / LOGS                                                        |
|  [Logs] [Terminal 1] [Terminal 2] [+]                                   |
+-------------------------------------------------------------------------+
```

---

## Key Concepts

### 1. Session Model

Each session has:
- **One Claude Code instance** (initially; multi-agent comes in Phase 4)
- **Dedicated git worktree** for isolation
- **Full tool access**: terminal, browser preview, files, git

Sessions are self-contained - you can run multiple sessions on different projects simultaneously.

### 2. Foundations (Shared Context)

A dedicated panel showing `.md` files that serve as shared memory:

```
project/
  PLAN.md           # Current sprint, tasks, priorities
  CONTEXT.md        # What the AI needs to know about this project
  DECISIONS.md      # Architectural decisions and rationale
  PROGRESS.md       # What's done, what's in progress
```

- User and AI both read/write these files
- Acts as communication channel between human and AI
- Changes sync in real-time

### 3. Multi-Session "Poker Table" Navigation

Inspired by online poker multi-tabling:

- Each session is a **complete screen** (not a tab within a screen)
- Switch sessions with `Cmd+1`, `Cmd+2`, `Cmd+3`, etc.
- Overview mode (`Cmd+``) shows all sessions as tiles
- Sessions show status indicators (thinking, coding, waiting, idle)

### 4. Flexible Panel Layout

Every panel can be:
- **Maximized** (double-click header) - takes full screen
- **Hidden** (click minimize) - removed from view
- **Resized** - drag dividers between panels
- **Restored** - click hidden panel to bring it back

Layout adapts automatically:
- 4 panels -> 2x2 grid
- 3 panels -> 2 top, 1 bottom
- 2 panels -> side by side
- 1 panel -> full area

### 5. Multi-Model Support

When stuck, get alternative perspectives:

- **Switch models**: Claude Opus, Sonnet, Haiku per session
- **Multi-Model Query** (`Cmd+M`): Ask the same question to multiple models, compare responses

---

## Technical Architecture

### Platform: Tauri

**Why Tauri over Electron:**
- Smaller binaries (Rust backend vs Node.js)
- Better performance and memory usage
- Native Rust for system operations
- Modern security model

**Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Rust (Tauri)
- Database: SQLite via `tauri-plugin-sql`
- PTY: Rust native via `portable-pty` crate

### PTY Implementation (Rust Native)

The core challenge: spawning Claude Code CLI with interactive PTY support.

**Approach:** Build a Tauri plugin using `portable-pty` crate:
- Spawn Claude Code CLI with full PTY
- Stream output to frontend via Tauri events
- Handle input from frontend
- Process lifecycle (spawn, kill, pause)

**Key Rust crates:**
- `portable-pty` - Cross-platform PTY
- `tokio` - Async runtime for streaming
- `serde` - JSON serialization for IPC

### Database

SQLite for persistence, matching Crystal's schema where applicable:
- `projects` - Project metadata
- `sessions` - Session data, worktree paths
- `conversation_messages` - Claude conversation history
- `ui_state` - Window/panel state

---

## Migration Phases

### Phase 1: Claude Code Integration (CURRENT PRIORITY)

Goal: Single Claude Code instance running in Tauri.

- [ ] Tauri project scaffold
- [ ] PTY plugin implementation
- [ ] Basic Claude spawn and output display
- [ ] Terminal-style input handling
- [ ] Session persistence

### Phase 2: Git Worktrees

Goal: Session isolation via git worktrees.

- [ ] Port worktreeManager logic from Crystal
- [ ] Worktree creation/cleanup
- [ ] Git status monitoring
- [ ] Diff display

### Phase 3: UI/Layout System

Goal: Match prototype UX.

- [ ] Flexible panel layout
- [ ] Session switching (poker-table navigation)
- [ ] Overview mode
- [ ] Browser preview panel

### Phase 4: Multi-Agent (Future)

Goal: Add Planner agent alongside Coder.

- [ ] Dual-agent architecture
- [ ] Role-based permissions (Planner: .md only, Coder: code files)
- [ ] Foundations sync system
- [ ] Agent coordination

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+1,2,3...` | Switch to session N |
| `Cmd+`\`` | Toggle overview mode (all sessions) |
| `Cmd+N` | New session |
| `Cmd+M` | Multi-model query |
| `Esc` | Restore maximized panel / close dialogs |
| `Double-click header` | Maximize/restore panel |

---

## Resources

- **UI Prototypes**: `prototypes/`
  - `ui-prototype.html` - Session workspace
  - `main-app.html` - Project dashboard
  - `settings.html` - Settings page
- **Crystal Reference**: `crystal/` (read-only, for migration reference)
- **Key Crystal files to port**:
  - `crystal/main/src/services/worktreeManager.ts`
  - `crystal/main/src/services/panels/cli/AbstractCliManager.ts`
  - `crystal/main/src/services/panels/claude/claudeCodeManager.ts`
  - `crystal/main/src/services/cliToolRegistry.ts`
  - `crystal/main/src/database/`

---

## Next Steps

1. **Set up Tauri project** - Create scaffold with React frontend
2. **Implement PTY plugin** - Rust plugin using portable-pty
3. **Basic Claude spawn** - Output display in terminal panel
4. **Input handling** - Send commands to Claude
5. **Session persistence** - SQLite storage

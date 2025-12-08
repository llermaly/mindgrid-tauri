# MindGrid - Migration Plan

## Overview

Migrating features from Crystal (Electron) to MindGrid (Tauri), one feature at a time.

**Core features to migrate:**
1. Claude Code full support (PTY, streaming, input/output)
2. Git worktrees and session isolation
3. Flexible panel layout and session switching
4. Multi-agent support (Planner + Coder)

---

## Phase 1: Claude Code Integration (CURRENT)

**Goal:** Spawn and interact with Claude Code CLI in Tauri.

### Tasks

1. **Tauri project scaffold**
   - Create new Tauri v2 project with React + Vite
   - Set up TypeScript, Tailwind CSS
   - Configure basic window and permissions

2. **PTY plugin (Rust)**
   - Add `portable-pty` crate
   - Create Tauri commands: `spawn_pty`, `write_pty`, `kill_pty`
   - Stream output to frontend via Tauri events

3. **Frontend terminal**
   - Add xterm.js for terminal rendering
   - Connect to PTY output events
   - Handle keyboard input

4. **Claude Code integration**
   - Spawn `claude` CLI with correct arguments
   - Parse stream-json output (like Crystal does)
   - Basic session state (in memory first)

5. **Session persistence**
   - Add `tauri-plugin-sql` for SQLite
   - Basic schema: sessions, conversation_messages
   - Load/save session state

### Reference files from Crystal
- `crystal/main/src/services/panels/cli/AbstractCliManager.ts`
- `crystal/main/src/services/panels/claude/claudeCodeManager.ts`

---

## Phase 2: Git Worktrees

**Goal:** Each session gets its own git worktree for isolation.

### Tasks
- Port worktree creation/cleanup logic
- Git status monitoring
- Diff generation and display

### Reference files from Crystal
- `crystal/main/src/services/worktreeManager.ts`
- `crystal/main/src/services/gitStatusManager.ts`
- `crystal/main/src/services/gitDiffManager.ts`

---

## Phase 3: UI/Layout System

**Goal:** Match the prototype UX with flexible panels.

### Tasks
- Resizable panel grid
- Panel maximize/hide/restore
- Session switching with hotkeys
- Overview mode (all sessions as tiles)
- Browser preview panel

### Reference files
- `prototypes/ui-prototype.html`
- `prototypes/main-app.html`

---

## Phase 4: Multi-Agent

**Goal:** Support Planner + Coder dual-agent model.

### Tasks
- Multiple Claude instances per session
- Role-based file permissions
- Foundations sync system
- Agent coordination UI

---

## Current Status

**Phase 1 in progress** - Starting with Tauri scaffold and PTY implementation.

---
name: mindgrid-reference
description: Implementation reference for MindGrid project based on Crystal (Electron) and Commander (Tauri) codebases. Use when implementing features like LLM provider integration, chat systems, tool architecture, Git workflows, or settings management. Provides detailed code examples, file paths, and patterns from both reference implementations. Use when user asks "how does Crystal/Commander implement X" or when implementing similar features in MindGrid.
---

# MindGrid Reference Skill

## Overview

This skill provides curated implementation references from the Crystal (Electron-based) and Commander (Tauri-based) codebases. It helps you implement features in MindGrid by showing how similar functionality works in these reference projects.

## Available References

| Topic | Crystal (Electron) | Commander (Tauri) |
|-------|-------------------|-------------------|
| **LLM Providers** | claude-code, codex via CLI + PTY | claude, codex, gemini, ollama via Rust |
| **Chat System** | Electron IPC, SQLite, panel-based | Tauri events, JSON storage, session-based |
| **Tools** | Tool registry, panel system, formatters | Rust CLI execution, PTY management |
| **GitHub Flow** | Git worktrees, local operations, rebase/merge | (Refresh to explore) |
| **Settings** | JSON config, environment vars | (Refresh to explore) |

## Two Usage Modes

### Mode 1: Normal Usage (Reading References)

**When to use:** Implementing a feature and need to see how Crystal or Commander does it

**Pattern:**
1. User asks: "How does Crystal handle LLM providers?" or "Implement authentication like Commander"
2. Identify the relevant topic and repository
3. Read the appropriate reference file:
   - `references/crystal/llm-providers.md`
   - `references/crystal/chat-system.md`
   - `references/crystal/tools.md`
   - `references/crystal/github-flow.md`
   - `references/crystal/settings.md`
   - `references/commander/llm-providers.md`
   - `references/commander/chat-system.md`
   - `references/commander/tools.md`
   - `references/commander/github-flow.md`
   - `references/commander/settings.md`
4. Use the information to guide implementation

**Example:**
```
User: "How does Crystal integrate with Claude?"
Action: Read references/crystal/llm-providers.md
Result: Shows PTY-based CLI execution, environment setup, streaming patterns
```

### Mode 2: Refresh Mode (Updating References)

**When to use:** User asks to refresh/update a reference, or reference file indicates it needs refreshing

**Pattern:**
1. User asks: "Refresh the Commander Gemini integration reference"
2. Use Explore agent or direct code analysis to examine the codebase
3. Update the corresponding reference file with latest findings
4. Preserve the structure and add new details

**Workflow:**
```
User: "Update Commander LLM providers with latest Gemini integration"

Steps:
1. Use Glob/Grep to find Gemini-related files in commander/
2. Read key implementation files
3. Extract implementation patterns
4. Update references/commander/llm-providers.md
5. Confirm update complete
```

## Quick Decision Guide

**User asks about Crystal implementation?**
→ Read `references/crystal/<topic>.md`

**User asks about Commander implementation?**
→ Read `references/commander/<topic>.md`

**User asks about Gemini specifically?**
→ Read `references/commander/llm-providers.md` (Commander has Gemini integration)

**User says "refresh" or "update reference"?**
→ Use Explore agent to analyze codebase, then update reference file

**File says "To Refresh This File"?**
→ That reference needs updating - use Explore agent to analyze and update

## Topic Descriptions

### LLM Providers
How the app integrates with Claude, Codex, Gemini, and other LLM providers
- API client initialization
- Streaming response handling
- API key management
- Error handling patterns

### Chat System
Message processing, storage, and real-time communication
- Message flow (user input → backend → response)
- IPC/event communication patterns
- Conversation persistence
- State management

### Tools
Tool architecture and execution (terminals, editors, CLI tools)
- Tool registration and lifecycle
- Execution patterns
- Output parsing and formatting
- Panel/session management

### GitHub Flow
Git operations and GitHub integration
- Commit creation and tracking
- Branching and merging
- Conflict resolution
- Push/pull operations

### Settings
Application configuration and preferences
- Settings storage and persistence
- UI for configuration
- Default values and validation
- Environment variable handling

## Reference File Structure

Each reference file includes:
- **Overview**: High-level architecture
- **Key Files**: File paths with line numbers
- **Code Examples**: Actual implementation snippets
- **Patterns**: Architectural patterns and design decisions
- **Key Differences**: How Crystal and Commander differ

## Refreshing References

Some Commander references are placeholders and need refreshing. Look for sections that say:

```
## To Refresh This File

Use the skill's refresh workflow:
1. Ask to "refresh Commander <topic> reference"
2. Skill will analyze `commander/` directory
3. Update this file with detailed patterns
```

When you see this, the file needs updating via Explore agent analysis.

## Repository Locations

The reference codebases are located at:
- **Crystal**: `./crystal/` (relative to project root)
- **Commander**: `./commander/` (relative to project root)

These are local copies you can read directly.

## Best Practices

1. **Read Before Implementing**: Check references before writing code
2. **Update References**: Keep references fresh as codebases evolve
3. **Compare Approaches**: Look at both Crystal and Commander for different patterns
4. **Cite Sources**: Include file paths and line numbers when implementing
5. **Adapt, Don't Copy**: Use as reference, adapt to MindGrid's architecture

## Examples

**Example 1: Implementing Claude Integration**
```
User: "I need to integrate Claude Code into MindGrid like Crystal does"
Action:
1. Read references/crystal/llm-providers.md
2. Note the PTY-based approach, command building, streaming
3. Adapt the pattern to Tauri (MindGrid uses Tauri like Commander)
4. Reference both Crystal's approach and Commander's Rust implementation
```

**Example 2: Refreshing a Reference**
```
User: "Update the Commander settings reference with actual implementation"
Action:
1. Use Explore agent to analyze commander/src-tauri/src/services/config*
2. Find configuration service, IPC handlers, storage location
3. Update references/commander/settings.md with findings
4. Replace "To Refresh" section with actual implementation details
```

**Example 3: Comparing Implementations**
```
User: "How do Crystal and Commander handle chat differently?"
Action:
1. Read references/crystal/chat-system.md (Electron IPC, SQLite)
2. Read references/commander/chat-system.md (Tauri events, JSON)
3. Summarize key differences:
   - Crystal: Electron IPC, SQLite database, panel-based
   - Commander: Tauri events, JSON files, session-based
4. Recommend approach for MindGrid based on Tauri architecture
```

## When NOT to Use This Skill

- General coding questions unrelated to MindGrid/Crystal/Commander
- Questions about features not implemented in either reference project
- Requests that don't involve looking at implementation patterns

## Maintenance

Keep this skill updated by:
1. Refreshing references when codebases change
2. Adding new topics as features are implemented
3. Updating file paths if repository structure changes
4. Adding examples of common usage patterns

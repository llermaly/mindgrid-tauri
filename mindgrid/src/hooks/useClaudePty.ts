import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ClaudeStreamParser } from "../lib/claude-parser";
import type { ClaudeEvent, ParsedMessage, PermissionMode, CommitMode } from "../lib/claude-types";
import { DEFAULT_STRUCTURED_PROMPT_TEMPLATE } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface PtyOutput {
  id: string;
  data: string;
}

interface PtyExit {
  id: string;
  code: number | null;
}

interface UseClaudePtyOptions {
  onEvent?: (event: ClaudeEvent) => void;
  onMessage?: (message: ParsedMessage) => void;
  onRawOutput?: (data: string) => void;
  onExit?: (code: number | null) => void;
}

export function useClaudePty(options: UseClaudePtyOptions = {}) {
  const { onEvent, onMessage, onRawOutput, onExit } = options;
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const ptyIdRef = useRef<string | null>(null);
  const parserRef = useRef<ClaudeStreamParser | null>(null);
  const unlistenOutput = useRef<UnlistenFn | null>(null);
  const unlistenExit = useRef<UnlistenFn | null>(null);

  // Use refs to always have access to latest callbacks
  const onEventRef = useRef(onEvent);
  const onMessageRef = useRef(onMessage);
  const onRawOutputRef = useRef(onRawOutput);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onEventRef.current = onEvent;
    onMessageRef.current = onMessage;
    onRawOutputRef.current = onRawOutput;
    onExitRef.current = onExit;
  }, [onEvent, onMessage, onRawOutput, onExit]);

  // Create parser once with stable refs
  useEffect(() => {
    console.log("[useClaudePty] Creating ClaudeStreamParser");
    parserRef.current = new ClaudeStreamParser(
      (event) => {
        console.log("[useClaudePty] Event received:", event.type, event);
        debug.event("ClaudeParser", `Event: ${event.type}`, event);

        // Capture Claude session ID from init event for subsequent --resume calls
        if (event.type === "system" && event.subtype === "init" && event.session_id) {
          console.log("[useClaudePty] Captured Claude session ID:", event.session_id);
          configRef.current.claudeSessionId = event.session_id;
        }

        try {
          onEventRef.current?.(event);
        } catch (err) {
          console.error("[useClaudePty] Error in onEvent callback:", err);
        }
      },
      (message) => {
        console.log("[useClaudePty] Message received:", message.role, message.content?.slice(0, 100));
        debug.event("ClaudeParser", `Message: ${message.role}`, message);
        try {
          if (onMessageRef.current) {
            onMessageRef.current(message);
            console.log("[useClaudePty] Message callback invoked successfully");
          } else {
            console.warn("[useClaudePty] No onMessage callback registered!");
          }
        } catch (err) {
          console.error("[useClaudePty] Error in onMessage callback:", err);
        }
      },
      (raw, parsed, error) => {
        if (error) {
          debug.debug("ClaudeParser", error, raw);
        } else {
          debug.pty("ClaudeParser", "Parsed line", { raw: raw.slice(0, 100), parsed });
        }
      }
    );
  }, []);

  // Set up global listeners once
  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      unlistenOutput.current = await listen<PtyOutput>("pty-output", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          debug.pty("PTY", "Output received", { length: event.payload.data.length });

          // Parse JSON events
          parserRef.current?.feed(event.payload.data);

          // Also pass raw output for debugging/display
          onRawOutputRef.current?.(event.payload.data);
        }
      });

      unlistenExit.current = await listen<PtyExit>("pty-exit", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          debug.info("PTY", "Process exited", { code: event.payload.code });

          // Flush parser buffer
          parserRef.current?.flush();

          setIsRunning(false);
          setPtyId(null);
          ptyIdRef.current = null;

          // Notify caller of exit
          onExitRef.current?.(event.payload.code);
        }
      });

      debug.info("PTY", "Listeners set up");
    };

    setupListeners();

    return () => {
      mounted = false;
      unlistenOutput.current?.();
      unlistenExit.current?.();
    };
  }, []);

  // Store config for per-message spawning
  const configRef = useRef<{
    cwd?: string;
    claudeSessionId?: string | null;
    permissionMode?: PermissionMode;
    commitMode?: CommitMode;
    model?: string | null;
    systemPrompt?: string | null;
  }>({});

  const spawnClaude = useCallback(async (
    cwd?: string,
    claudeSessionId?: string | null,
    permissionMode?: PermissionMode,
    model?: string | null,
    commitMode?: CommitMode,
    systemPrompt?: string | null
  ) => {
    // Just store the config and "start" the session conceptually
    configRef.current = { cwd, claudeSessionId, permissionMode, model, commitMode, systemPrompt };
    debug.info("PTY", "Session initialized", { cwd, claudeSessionId, permissionMode, model, commitMode, systemPrompt });

    // Return a dummy ID to satisfy the UI that we "started"
    return "session-active";
  }, []);

  const write = useCallback(async (data: string) => {
    // Legacy support or for sending input to running process if needed
    const id = ptyIdRef.current;
    if (!id) return;
    try {
      await invoke("write_pty", { id, data });
    } catch (err) {
      debug.error("PTY", "Write failed", err);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, overridePermissionMode?: PermissionMode) => {
    try {
      // Kill existing process if any (though we shouldn't have one if we wait for response)
      if (ptyIdRef.current) {
        await invoke("kill_pty", { id: ptyIdRef.current });
      }

      // Reset parser state for new message to avoid stale data
      parserRef.current?.flush();

      const { cwd, claudeSessionId, permissionMode: configPermissionMode, model, commitMode, systemPrompt } = configRef.current;
      const permissionMode = overridePermissionMode || configPermissionMode || 'default';

      // Enhance message with structured commit instructions if in structured mode
      let finalMessage = message;
      if (commitMode === 'structured') {
        finalMessage = `${message}\n\n${DEFAULT_STRUCTURED_PROMPT_TEMPLATE}`;
        console.log("[useClaudePty] Enhanced prompt with structured commit instructions");
      }

      // Build args similar to commander - each message spawns fresh process
      const claudeArgs: string[] = [
        "-p", finalMessage,
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages"
      ];

      // Add system prompt flag if specified
      if (systemPrompt && systemPrompt.trim()) {
        claudeArgs.push("--append-system-prompt", systemPrompt.trim());
        console.log("[useClaudePty] Using system prompt:", systemPrompt.trim());
      }

      // Add model flag if specified
      if (model) {
        claudeArgs.push("--model", model);
        console.log("[useClaudePty] Using model:", model);
      }

      // Add permission flags based on permission mode
      switch (permissionMode) {
        case 'bypassPermissions':
          // Skip all permission prompts - dangerous but fast
          claudeArgs.push("--dangerously-skip-permissions");
          console.log("[useClaudePty] Using bypass permissions mode");
          break;
        case 'acceptEdits':
          // Allow file edit tools automatically
          claudeArgs.push("--allowedTools", "Edit,Write,Read,Glob,Grep,MultiEdit,NotebookEdit");
          console.log("[useClaudePty] Using acceptEdits mode");
          break;
        case 'plan':
          // Plan mode - only allow read-only tools
          claudeArgs.push("--allowedTools", "Read,Glob,Grep,Task,WebFetch,WebSearch");
          console.log("[useClaudePty] Using plan mode (read-only)");
          break;
        case 'default':
        default:
          // Default: Claude Code will prompt for permissions
          console.log("[useClaudePty] Using default permission mode");
          break;
      }

      // Add --resume flag if we have a Claude session ID to continue conversation
      if (claudeSessionId) {
        claudeArgs.push("--resume", claudeSessionId);
        console.log("[useClaudePty] Using --resume with session:", claudeSessionId);
      } else {
        console.log("[useClaudePty] Starting fresh Claude session (no --resume)");
      }

      console.log("[useClaudePty] Full Claude args:", claudeArgs.join(" "));
      debug.info("PTY", "Spawning Claude for message", { cwd, claudeSessionId, permissionMode, args: claudeArgs });

      const id = await invoke<string>("spawn_pty", {
        args: {
          cmd: "claude",
          args: claudeArgs,
          cols: 120,
          rows: 40,
          cwd,
        },
      });

      debug.info("PTY", "Claude spawned", { id });

      ptyIdRef.current = id;
      setPtyId(id);
      setIsRunning(true);

    } catch (err) {
      debug.error("PTY", "Send message failed", err);
      setIsRunning(false);
    }
  }, []);

  const kill = useCallback(async () => {
    const id = ptyIdRef.current;
    if (!id) return;
    try {
      debug.info("PTY", "Killing process", { id });
      await invoke("kill_pty", { id });
      ptyIdRef.current = null;
      setPtyId(null);
      setIsRunning(false);
    } catch (err) {
      debug.error("PTY", "Kill failed", err);
    }
  }, []);

  return {
    ptyId,
    isRunning,
    spawnClaude,
    write,
    sendMessage,
    kill,
  };
}

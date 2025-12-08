import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { Terminal } from "@xterm/xterm";
import { ClaudeStreamParser } from "../lib/claude-parser";
import type { ClaudeEvent, ParsedMessage } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface PtyOutput {
  id: string;
  data: string;
}

interface PtyExit {
  id: string;
  code: number | null;
}

interface SpawnArgs {
  cmd: string;
  args: string[];
  cwd?: string;
  cols?: number;
  rows?: number;
}

interface UsePtyOptions {
  mode?: "raw" | "stream-json";
  onEvent?: (event: ClaudeEvent) => void;
  onMessage?: (message: ParsedMessage) => void;
}

export function usePty(terminal: Terminal | null, options: UsePtyOptions = {}) {
  const { mode = "raw", onEvent, onMessage } = options;
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const ptyIdRef = useRef<string | null>(null);
  const terminalRef = useRef<Terminal | null>(terminal);
  const parserRef = useRef<ClaudeStreamParser | null>(null);
  const unlistenOutput = useRef<UnlistenFn | null>(null);
  const unlistenExit = useRef<UnlistenFn | null>(null);

  // Keep terminal ref in sync
  useEffect(() => {
    terminalRef.current = terminal;
  }, [terminal]);

  // Create parser for stream-json mode
  useEffect(() => {
    if (mode === "stream-json") {
      parserRef.current = new ClaudeStreamParser(
        (event) => {
          debug.event("ClaudeParser", `Event: ${event.type}`, event);
          onEvent?.(event);
        },
        (message) => {
          debug.event("ClaudeParser", `Message: ${message.role}`, message);
          onMessage?.(message);
        },
        (raw, parsed, error) => {
          if (error) {
            debug.debug("ClaudeParser", error, raw);
          } else {
            debug.pty("ClaudeParser", "Parsed line", { raw: raw.slice(0, 100), parsed });
          }
        }
      );
    } else {
      parserRef.current = null;
    }
  }, [mode, onEvent, onMessage]);

  // Set up global listeners once
  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      unlistenOutput.current = await listen<PtyOutput>("pty-output", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          debug.pty("PTY", "Output received", { length: event.payload.data.length });

          if (mode === "stream-json" && parserRef.current) {
            // Parse JSON events
            parserRef.current.feed(event.payload.data);
            // Also write to terminal for visibility
            terminalRef.current?.write(event.payload.data);
          } else {
            // Raw mode - just write to terminal
            terminalRef.current?.write(event.payload.data);
          }
        }
      });

      unlistenExit.current = await listen<PtyExit>("pty-exit", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          debug.info("PTY", "Process exited", { code: event.payload.code });

          // Flush parser buffer
          if (mode === "stream-json" && parserRef.current) {
            parserRef.current.flush();
          }

          setIsRunning(false);
          setPtyId(null);
          ptyIdRef.current = null;
          terminalRef.current?.writeln("\r\n[Process exited]");
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
  }, [mode]);

  const spawn = useCallback(async (args: SpawnArgs) => {
    const term = terminalRef.current;
    if (!term) {
      debug.error("PTY", "No terminal available");
      return null;
    }

    try {
      debug.info("PTY", "Spawning process", args);
      const id = await invoke<string>("spawn_pty", { args });
      debug.info("PTY", "Process spawned", { id });

      ptyIdRef.current = id;
      setPtyId(id);
      setIsRunning(true);

      return id;
    } catch (err) {
      debug.error("PTY", "Spawn failed", err);
      term.writeln(`\r\nError: ${err}`);
      return null;
    }
  }, []);

  const spawnClaude = useCallback(async (cwd?: string, claudeSessionId?: string | null) => {
    const term = terminalRef.current;
    if (!term) return null;

    const claudeArgs: string[] = [];

    // Add stream-json output format
    if (mode === "stream-json") {
      claudeArgs.push("p", "--output-format", "stream-json");
    }

    // Add --resume flag if we have a Claude session ID to resume
    if (claudeSessionId) {
      claudeArgs.push("--resume", claudeSessionId);
      debug.info("PTY", "Resuming Claude session", { claudeSessionId });
    }

    const args: SpawnArgs = {
      cmd: "claude",
      args: claudeArgs,
      cols: term.cols,
      rows: term.rows,
      cwd,
    };

    return spawn(args);
  }, [spawn, mode]);

  const write = useCallback(async (data: string) => {
    const id = ptyIdRef.current;
    if (!id) return;
    try {
      await invoke("write_pty", { id, data });
    } catch (err) {
      debug.error("PTY", "Write failed", err);
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
    spawn,
    spawnClaude,
    write,
    kill,
  };
}

import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { Terminal } from "@xterm/xterm";

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

export function usePty(terminal: Terminal | null) {
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const ptyIdRef = useRef<string | null>(null);
  const terminalRef = useRef<Terminal | null>(terminal);
  const unlistenOutput = useRef<UnlistenFn | null>(null);
  const unlistenExit = useRef<UnlistenFn | null>(null);

  // Keep terminal ref in sync
  useEffect(() => {
    terminalRef.current = terminal;
  }, [terminal]);

  // Set up global listeners once
  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      unlistenOutput.current = await listen<PtyOutput>("pty-output", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId && terminalRef.current) {
          terminalRef.current.write(event.payload.data);
        }
      });

      unlistenExit.current = await listen<PtyExit>("pty-exit", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          setIsRunning(false);
          setPtyId(null);
          ptyIdRef.current = null;
          if (terminalRef.current) {
            terminalRef.current.writeln("\r\n[Process exited]");
          }
        }
      });
    };

    setupListeners();

    return () => {
      mounted = false;
      unlistenOutput.current?.();
      unlistenExit.current?.();
    };
  }, []);

  const spawn = useCallback(async (args: SpawnArgs) => {
    const term = terminalRef.current;
    if (!term) {
      console.error("No terminal available");
      return null;
    }

    try {
      console.log("Spawning PTY with args:", args);
      const id = await invoke<string>("spawn_pty", { args });
      console.log("PTY spawned with ID:", id);

      // Set the ID in ref immediately so listeners can use it
      ptyIdRef.current = id;
      setPtyId(id);
      setIsRunning(true);

      return id;
    } catch (err) {
      console.error("Failed to spawn PTY:", err);
      term.writeln(`\r\nError: ${err}`);
      return null;
    }
  }, []);

  const write = useCallback(async (data: string) => {
    const id = ptyIdRef.current;
    if (!id) return;
    try {
      await invoke("write_pty", { id, data });
    } catch (err) {
      console.error("Failed to write to PTY:", err);
    }
  }, []);

  const kill = useCallback(async () => {
    const id = ptyIdRef.current;
    if (!id) return;
    try {
      await invoke("kill_pty", { id });
      ptyIdRef.current = null;
      setPtyId(null);
      setIsRunning(false);
    } catch (err) {
      console.error("Failed to kill PTY:", err);
    }
  }, []);

  return {
    ptyId,
    isRunning,
    spawn,
    write,
    kill,
  };
}

import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { GeminiStreamParser } from "../lib/gemini-parser";
import type { GeminiMessage } from "../lib/gemini-types";
import { debug } from "../stores/debugStore";

interface PtyOutput {
  id: string;
  data: string;
}

interface PtyExit {
  id: string;
  code: number | null;
}

interface UseGeminiPtyOptions {
  onMessage?: (message: GeminiMessage) => void;
  onExit?: (code: number | null) => void;
}

export function useGeminiPty(options: UseGeminiPtyOptions = {}) {
  const { onMessage, onExit } = options;
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const ptyIdRef = useRef<string | null>(null);
  const parserRef = useRef<GeminiStreamParser | null>(null);
  const unlistenOutput = useRef<UnlistenFn | null>(null);
  const unlistenExit = useRef<UnlistenFn | null>(null);

  const onMessageRef = useRef(onMessage);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onExitRef.current = onExit;
  }, [onMessage, onExit]);

  useEffect(() => {
    parserRef.current = new GeminiStreamParser((message) => {
      onMessageRef.current?.(message);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      unlistenOutput.current = await listen<PtyOutput>("pty-output", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          parserRef.current?.feed(event.payload.data);
        }
      });

      unlistenExit.current = await listen<PtyExit>("pty-exit", (event) => {
        if (!mounted) return;
        const currentId = ptyIdRef.current;
        if (currentId && event.payload.id === currentId) {
          parserRef.current?.flush();
          setIsRunning(false);
          setPtyId(null);
          ptyIdRef.current = null;
          onExitRef.current?.(event.payload.code);
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

  const configRef = useRef<{
    cwd?: string;
    model?: string | null;
  }>({});

  const spawnGemini = useCallback(async (
    cwd?: string,
    model?: string | null,
  ) => {
    configRef.current = { cwd, model };
    return "session-active";
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    try {
      if (ptyIdRef.current) {
        await invoke("kill_pty", { id: ptyIdRef.current });
      }

      // Reset parser
      // We might need to keep history if we want a chat-like experience, 
      // but if the CLI is one-shot, we can't easily feed history unless we pass it as context.
      // For now, assume single-turn or that the CLI handles context somehow (unlikely for simple --prompt).
      // If we want history, we'd need to append previous messages to the prompt.
      // Let's stick to simple single message for now as per commander's logic.
      
      const { cwd, model } = configRef.current;
      
      const args: string[] = ["--prompt"];
      
      if (model) {
        args.push("--model");
        args.push(model);
      }
      
      args.push(message);

      debug.info("PTY", "Spawning Gemini", { cwd, args });

      const id = await invoke<string>("spawn_pty", {
        args: {
          cmd: "gemini",
          args: args,
          cols: 120,
          rows: 40,
          cwd,
        },
      });

      ptyIdRef.current = id;
      setPtyId(id);
      setIsRunning(true);

    } catch (err) {
      debug.error("PTY", "Send Gemini message failed", err);
      setIsRunning(false);
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
      debug.error("PTY", "Kill failed", err);
    }
  }, []);

  return {
    ptyId,
    isRunning,
    spawnGemini,
    sendMessage,
    kill,
  };
}

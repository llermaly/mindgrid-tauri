import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CodexStreamParser } from "../lib/codexStreamParser";

interface UseCodexRunnerOptions {
  cwd?: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

export function useCodexRunner(options: UseCodexRunnerOptions = {}) {
  const { cwd, onComplete, onError } = options;
  const [isRunning, setIsRunning] = useState(false);
  const parser = new CodexStreamParser();

  const runCodex = useCallback(
    async (prompt: string, model?: string) => {
      if (!prompt.trim()) return;
      setIsRunning(true);
      try {
        const output = await invoke<string>("run_codex", {
          prompt,
          model,
          cwd,
        });
        const parsed = parseCodexOutput(parser, output || "");
        onComplete?.(parsed);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onError?.(message);
      } finally {
        setIsRunning(false);
      }
    },
    [cwd, onComplete, onError]
  );

  return { runCodex, isRunning };
}

function parseCodexOutput(parser: CodexStreamParser, raw: string): string {
  if (!raw.trim()) return "";

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let last: string | undefined;
  for (const line of lines) {
    const out = parser.feed(line);
    if (out !== undefined) {
      last = out;
    }
  }
  return last || "";
}

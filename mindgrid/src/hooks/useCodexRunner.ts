import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CodexStreamParser } from "../lib/codexStreamParser";
import type { ParsedMessage } from "../lib/claude-types";

interface UseCodexRunnerOptions {
  cwd?: string;
  systemPrompt?: string | null;
  onMessage?: (message: ParsedMessage) => void;
  onError?: (error: string) => void;
}

export function useCodexRunner(options: UseCodexRunnerOptions = {}) {
  const { cwd, systemPrompt, onMessage, onError } = options;
  const [isRunning, setIsRunning] = useState(false);

  const runCodex = useCallback(
    async (prompt: string, model?: string) => {
      if (!prompt.trim()) return;
      const parser = new CodexStreamParser();
      setIsRunning(true);
      try {
        const output = await invoke<string>("run_codex", {
          prompt,
          model,
          cwd,
          system_prompt: systemPrompt,
        });
        const parsed = parseCodexOutput(parser, output || "");
        if (parsed.length === 0) {
          onMessage?.({
            id: `codex-${Date.now()}`,
            role: "assistant",
            content: "(no output)",
            timestamp: Date.now(),
          });
        } else {
          for (const message of parsed) {
            onMessage?.(message);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onError?.(message);
      } finally {
        setIsRunning(false);
      }
    },
    [cwd, systemPrompt, onMessage, onError]
  );

  return { runCodex, isRunning };
}

function parseCodexOutput(parser: CodexStreamParser, raw: string): ParsedMessage[] {
  if (!raw.trim()) return [];

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let counter = 0;
  const timestampBase = Date.now();
  for (const line of lines) {
    parser.feed(line);
  }

  return parser.toMessages().map((m) => ({
    id: `codex-${++counter}`,
    role: m.role,
    content: m.content,
    timestamp: timestampBase + counter,
    toolName: m.toolName,
    toolResult: m.toolResult,
    isError: m.isError,
    isThinking: m.isThinking,
    usage: m.usage
      ? {
          input_tokens: m.usage.input_tokens ?? 0,
          output_tokens: m.usage.output_tokens ?? 0,
          cache_read_input_tokens: m.usage.cached_input_tokens,
        }
      : undefined,
  }));
}

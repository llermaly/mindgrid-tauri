import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { usePty } from "../hooks/usePty";
import type { ClaudeEvent, ParsedMessage } from "../lib/claude-types";
import { debug } from "../stores/debugStore";

interface TerminalProps {
  className?: string;
  mode?: "raw" | "stream-json";
  cwd?: string;
  claudeSessionId?: string | null;
  initialCommand?: string;
  onClaudeEvent?: (event: ClaudeEvent) => void;
  onClaudeMessage?: (message: ParsedMessage) => void;
}

export function Terminal({
  className = "",
  mode = "stream-json",
  cwd,
  initialCommand,
  onClaudeEvent,
  onClaudeMessage,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { spawn, write, isRunning } = usePty(terminal, {
    mode,
    onEvent: onClaudeEvent,
    onMessage: onClaudeMessage,
  });

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    debug.info("Terminal", "Initializing xterm");

    const term = new XTerm({
      theme: {
        background: "#18181b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        cursorAccent: "#18181b",
        selectionBackground: "#3f3f46",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#fafafa",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    fitAddonRef.current = fitAddon;
    setTerminal(term);

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    debug.info("Terminal", "xterm initialized", { cols: term.cols, rows: term.rows });

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      setTerminal(null);
      fitAddonRef.current = null;
    };
  }, []);

  // Set up input handling
  useEffect(() => {
    if (!terminal) return;

    const disposable = terminal.onData((data) => {
      if (isRunning) {
        write(data);
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [terminal, isRunning, write]);

  // Auto-start shell when terminal is ready
  useEffect(() => {
    if (!terminal || isRunning) return;

    const startShell = async () => {
      console.log("[Terminal] Auto-spawning shell", { cwd, initialCommand });
      terminal.writeln("Starting shell...");

      // Small delay to ensure PTY listeners are set up
      await new Promise(resolve => setTimeout(resolve, 100));

      const ptyId = await spawn({
        cmd: "/bin/zsh",
        args: [],
        cols: terminal.cols,
        rows: terminal.rows,
        cwd,
      });

      console.log("[Terminal] Shell spawned", { ptyId });

      // If there's an initial command, send it after a short delay to let shell initialize
      if (initialCommand && ptyId) {
        setTimeout(() => {
          console.log("[Terminal] Executing initial command", { initialCommand });
          write(initialCommand + "\n");
        }, 500);
      }
    };

    startShell();
  }, [terminal]); // Only run once when terminal is ready

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div ref={containerRef} className="flex-1 bg-zinc-900 p-1" />
    </div>
  );
}

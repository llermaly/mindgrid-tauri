import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { usePty } from "../hooks/usePty";

interface TerminalProps {
  className?: string;
}

export function Terminal({ className = "" }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { spawn, write, isRunning } = usePty(terminal);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#18181b", // zinc-900
        foreground: "#fafafa", // zinc-50
        cursor: "#fafafa",
        cursorAccent: "#18181b",
        selectionBackground: "#3f3f46", // zinc-700
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

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

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

  const handleSpawnClaude = useCallback(async () => {
    if (!terminal) return;

    terminal.clear();
    terminal.writeln("Starting Claude Code...\r\n");

    const id = await spawn({
      cmd: "claude",
      args: [],
      cols: terminal.cols,
      rows: terminal.rows,
    });

    if (id) {
      terminal.writeln(`PTY ID: ${id}\r\n`);
    }
  }, [terminal, spawn]);

  // Test with a simple shell command
  const handleSpawnShell = useCallback(async () => {
    if (!terminal) return;

    terminal.clear();
    terminal.writeln("Starting shell...\r\n");

    await spawn({
      cmd: "/bin/zsh",
      args: [],
      cols: terminal.cols,
      rows: terminal.rows,
    });
  }, [terminal, spawn]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-sm font-medium text-zinc-300">Terminal</span>
        <div className="flex gap-2">
          <button
            onClick={handleSpawnShell}
            disabled={isRunning || !terminal}
            className="px-3 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200"
          >
            Shell
          </button>
          <button
            onClick={handleSpawnClaude}
            disabled={isRunning || !terminal}
            className="px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-100"
          >
            {isRunning ? "Running..." : "Claude"}
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 bg-zinc-900 p-1" />
    </div>
  );
}

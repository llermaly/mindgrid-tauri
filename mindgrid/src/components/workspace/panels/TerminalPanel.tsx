import { Terminal } from '../../Terminal';

interface TerminalPanelProps {
  cwd: string;
  initialCommand?: string;
}

export function TerminalPanel({ cwd, initialCommand }: TerminalPanelProps) {
  return (
    <div className="h-full w-full">
      <Terminal mode="raw" cwd={cwd} initialCommand={initialCommand} />
    </div>
  );
}

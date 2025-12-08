import { Terminal } from '../../Terminal';

interface TerminalPanelProps {
  cwd: string;
}

export function TerminalPanel({ cwd }: TerminalPanelProps) {
  return (
    <div className="h-full w-full">
      <Terminal mode="raw" cwd={cwd} />
    </div>
  );
}

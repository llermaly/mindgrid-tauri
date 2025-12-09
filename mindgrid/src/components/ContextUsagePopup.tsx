interface ContextUsagePopupProps {
  contextUsed: number; // percentage (0-100)
  model?: string | null;
  position: { x: number; y: number };
  breakdown?: {
    systemPrompt?: { tokens: number; percent: number };
    systemTools?: { tokens: number; percent: number };
    memoryFiles?: { tokens: number; percent: number };
    messages?: { tokens: number; percent: number };
    freeSpace?: { tokens: number; percent: number };
    autocompact?: { tokens: number; percent: number };
  };
  maxTokens?: number;
}

const MODELS: Record<string, { name: string; color: string; contextWindow: number }> = {
  'claude-opus-4-20250514': { name: 'Claude Opus 4', color: '#a855f7', contextWindow: 200000 },
  'claude-sonnet-4-20250514': { name: 'Claude Sonnet 4', color: '#3b82f6', contextWindow: 200000 },
  'claude-sonnet-3-7-20250219': { name: 'Claude Sonnet 3.7', color: '#3b82f6', contextWindow: 200000 },
  'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', color: '#3b82f6', contextWindow: 200000 },
  'claude-3-5-haiku-20241022': { name: 'Claude 3.5 Haiku', color: '#10b981', contextWindow: 200000 },
};

export function ContextUsagePopup({
  contextUsed,
  model,
  position,
  breakdown,
  maxTokens = 200000
}: ContextUsagePopupProps) {
  const modelInfo = model && MODELS[model] ? MODELS[model] : { name: 'Claude', color: '#3b82f6', contextWindow: 200000 };
  const usedTokens = Math.round((contextUsed / 100) * maxTokens);

  // Default breakdown if not provided
  const defaultBreakdown = {
    systemPrompt: { tokens: 3000, percent: 1.5 },
    systemTools: { tokens: 16400, percent: 8.2 },
    memoryFiles: { tokens: 54, percent: 0.0 },
    messages: { tokens: Math.round(usedTokens * 0.6), percent: contextUsed * 0.6 },
    freeSpace: { tokens: maxTokens - usedTokens, percent: 100 - contextUsed },
    autocompact: { tokens: 45000, percent: 22.5 },
  };

  const finalBreakdown = breakdown || defaultBreakdown;

  // Generate visual grid (10x10)
  const generateGrid = () => {
    const grid: string[] = [];
    const totalCells = 100;
    let filled = 0;

    const segments = [
      { count: Math.round(finalBreakdown.systemPrompt?.percent || 0), color: 'text-blue-400' },
      { count: Math.round(finalBreakdown.systemTools?.percent || 0), color: 'text-cyan-400' },
      { count: Math.round(finalBreakdown.memoryFiles?.percent || 0), color: 'text-orange-400' },
      { count: Math.round(finalBreakdown.messages?.percent || 0), color: 'text-purple-400' },
      { count: Math.round(finalBreakdown.freeSpace?.percent || 0), color: 'text-zinc-500' },
      { count: Math.round(finalBreakdown.autocompact?.percent || 0), color: 'text-zinc-700' }
    ];

    for (const seg of segments) {
      for (let i = 0; i < seg.count && filled < totalCells; i++) {
        grid.push(seg.color);
        filled++;
      }
    }
    while (filled < totalCells) {
      grid.push('text-zinc-700');
      filled++;
    }
    return grid;
  };

  const grid = generateGrid();

  // Calculate position to keep popup in viewport
  const popupStyle = {
    left: Math.min(position.x, window.innerWidth - 420),
    top: Math.min(position.y + 10, window.innerHeight - 500)
  };

  return (
    <div
      className="fixed z-[100] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 min-w-96"
      style={popupStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <span className="text-sm font-medium text-white">Context Usage</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: modelInfo.color }} />
          <span className="text-xs text-zinc-400">{modelInfo.name}</span>
        </div>
      </div>

      {/* Main stats */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="text-2xl font-bold"
          style={{ color: contextUsed > 80 ? '#f87171' : contextUsed > 50 ? '#fbbf24' : '#4ade80' }}
        >
          {contextUsed}%
        </div>
        <div className="text-xs text-zinc-400">
          <div>{(usedTokens / 1000).toFixed(1)}k / {(maxTokens / 1000).toFixed(0)}k tokens</div>
          <div className="text-zinc-500">~{Math.round((maxTokens - usedTokens) / 1000)}k remaining</div>
        </div>
      </div>

      {/* Visual grid */}
      <div className="grid grid-cols-10 gap-0.5 mb-4 p-2 bg-zinc-800/50 rounded-lg">
        {grid.map((color, i) => (
          <span key={i} className={`text-xs ${color}`}>⛁</span>
        ))}
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5 text-xs">
        {finalBreakdown.systemPrompt && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-blue-400">⛁</span>
              <span className="text-zinc-300">System prompt</span>
            </span>
            <span className="text-zinc-500">
              {(finalBreakdown.systemPrompt.tokens / 1000).toFixed(1)}k ({finalBreakdown.systemPrompt.percent}%)
            </span>
          </div>
        )}
        {finalBreakdown.systemTools && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-cyan-400">⛁</span>
              <span className="text-zinc-300">System tools</span>
            </span>
            <span className="text-zinc-500">
              {(finalBreakdown.systemTools.tokens / 1000).toFixed(1)}k ({finalBreakdown.systemTools.percent}%)
            </span>
          </div>
        )}
        {finalBreakdown.memoryFiles && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-orange-400">⛁</span>
              <span className="text-zinc-300">Memory files</span>
            </span>
            <span className="text-zinc-500">
              {finalBreakdown.memoryFiles.tokens} ({finalBreakdown.memoryFiles.percent}%)
            </span>
          </div>
        )}
        {finalBreakdown.messages && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-purple-400">⛁</span>
              <span className="text-zinc-300">Messages</span>
            </span>
            <span className="text-zinc-500">
              {(finalBreakdown.messages.tokens / 1000).toFixed(1)}k ({finalBreakdown.messages.percent.toFixed(1)}%)
            </span>
          </div>
        )}
        {finalBreakdown.freeSpace && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-zinc-500">⛶</span>
              <span className="text-zinc-300">Free space</span>
            </span>
            <span className="text-zinc-500">
              {(finalBreakdown.freeSpace.tokens / 1000).toFixed(0)}k ({finalBreakdown.freeSpace.percent.toFixed(1)}%)
            </span>
          </div>
        )}
        {finalBreakdown.autocompact && (
          <div className="flex items-center justify-between text-zinc-600">
            <span className="flex items-center gap-2">
              <span>⛝</span>
              <span>Autocompact buffer</span>
            </span>
            <span>
              {(finalBreakdown.autocompact.tokens / 1000).toFixed(1)}k ({finalBreakdown.autocompact.percent}%)
            </span>
          </div>
        )}
      </div>

      {/* Memory files section */}
      {finalBreakdown.memoryFiles && finalBreakdown.memoryFiles.tokens > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400 font-medium">Memory files</span>
            <span className="text-zinc-600">/memory</span>
          </div>
          <div className="text-xs text-zinc-500 pl-2 border-l border-zinc-700">
            └ Project (CLAUDE.md): <span className="text-zinc-400">{finalBreakdown.memoryFiles.tokens} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

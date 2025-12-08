import { useState } from 'react';

interface FoundationsPanelProps {
  cwd?: string; // May be used in future for file operations
}

// Dummy data for display
const DUMMY_FILES: Record<string, string> = {
  'CLAUDE.md': `# Project: MindGrid

## Overview
Multi-agent AI workspace for software development.

## Architecture
- Tauri 2 desktop app with React frontend
- Multiple chat agents: Research, Coding, Review
- Git worktree per session model

## Key Files
- src/App.tsx - Main application
- src/lib/window-manager.ts - Window management
- src/stores/sessionStore.ts - Session state
`,
  'progress.txt': `Session Progress:
- [x] Setup Tauri project
- [x] Create multi-window architecture
- [x] Implement workspace layout
- [ ] Add model selection
- [ ] Complete git integration
`,
  'features.json': `[
  { "id": 1, "name": "Multi-window support", "passes": true },
  { "id": 2, "name": "Session management", "passes": true },
  { "id": 3, "name": "Workspace layouts", "passes": true },
  { "id": 4, "name": "Git integration", "passes": false },
  { "id": 5, "name": "Model selection", "passes": false }
]`,
  'init.sh': `#!/bin/bash
# Initialize session environment

cd $PROJECT_ROOT
npm install
npm run dev
`
};

const DUMMY_SESSIONS = [
  { id: 1, agent: 'coding', task: 'Implementing workspace layouts', status: 'completed', time: '10:30 AM' },
  { id: 2, agent: 'research', task: 'Exploring Tauri 2 features', status: 'completed', time: '10:15 AM' },
];

export function FoundationsPanel({ cwd: _cwd }: FoundationsPanelProps) {
  const [activeFile, setActiveFile] = useState('CLAUDE.md');
  const [content, setContent] = useState(DUMMY_FILES[activeFile] || '');
  const [view, setView] = useState<'files' | 'progress' | 'features'>('files');

  const files = Object.keys(DUMMY_FILES);

  const fileConfig: Record<string, { icon: string; color: string; desc: string }> = {
    'CLAUDE.md': { icon: 'document', color: 'text-blue-400', desc: 'Project context' },
    'progress.txt': { icon: 'clock', color: 'text-purple-400', desc: 'Session log' },
    'features.json': { icon: 'check', color: 'text-green-400', desc: 'Feature tests' },
    'init.sh': { icon: 'terminal', color: 'text-yellow-400', desc: 'Setup script' }
  };

  // Calculate feature progress
  let featureProgress = 0;
  try {
    const features = JSON.parse(DUMMY_FILES['features.json']);
    const passing = features.filter((f: { passes: boolean }) => f.passes).length;
    featureProgress = Math.round((passing / features.length) * 100);
  } catch {
    // ignore
  }

  const handleFileSelect = (file: string) => {
    setActiveFile(file);
    setContent(DUMMY_FILES[file] || '');
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with view toggles */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
            {featureProgress}% complete
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('files')}
            className={`p-1.5 rounded text-xs ${view === 'files' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Context files"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setView('progress')}
            className={`p-1.5 rounded text-xs ${view === 'progress' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Session history"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setView('features')}
            className={`p-1.5 rounded text-xs ${view === 'features' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            title="Feature tests"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Files View */}
      {view === 'files' && (
        <>
          {/* File tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-800 bg-neutral-800/30 overflow-x-auto">
            {files.map(file => {
              const config = fileConfig[file] || { icon: 'file', color: 'text-neutral-400', desc: file };
              return (
                <button
                  key={file}
                  onClick={() => handleFileSelect(file)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                    activeFile === file
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={config.desc}
                >
                  <span className={config.color}>{file}</span>
                </button>
              );
            })}
            <button className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded" title="Add file">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* File content */}
          <div className="flex-1 overflow-y-auto p-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-transparent text-sm font-mono text-neutral-300 resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </>
      )}

      {/* Progress/Sessions View */}
      {view === 'progress' && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Agent Sessions</div>
            {DUMMY_SESSIONS.map((session, i) => (
              <div key={session.id} className={`p-2.5 rounded-lg border ${i === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-neutral-800/50 border-neutral-700'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      session.agent === 'coding' ? 'bg-blue-500/20 text-blue-400' :
                      session.agent === 'research' ? 'bg-green-500/20 text-green-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {session.agent}
                    </span>
                    <span className="text-xs text-neutral-500">Session #{session.id}</span>
                  </div>
                  <span className="text-xs text-neutral-500">{session.time}</span>
                </div>
                <div className="text-sm text-neutral-300">{session.task}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-xs text-neutral-500 capitalize">{session.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features View */}
      {view === 'features' && (
        <div className="flex-1 overflow-y-auto p-3">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-400">Feature Progress</span>
              <span className="text-green-400">{featureProgress}%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${featureProgress}%` }} />
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-1.5">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Feature Tests</div>
            {(() => {
              try {
                const features = JSON.parse(DUMMY_FILES['features.json']);
                return features.map((f: { id: number; name: string; passes: boolean }) => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded text-sm">
                    <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs ${
                      f.passes ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700 text-neutral-500'
                    }`}>
                      {f.passes ? '✓' : '○'}
                    </span>
                    <span className={f.passes ? 'text-neutral-300' : 'text-neutral-500'}>{f.name}</span>
                  </div>
                ));
              } catch {
                return <div className="text-xs text-neutral-500">No features defined</div>;
              }
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Shared with all agents
        </span>
        <button className="text-blue-400 hover:text-blue-300">Edit in settings</button>
      </div>
    </div>
  );
}

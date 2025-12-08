import { useState } from 'react';

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

interface GitPanelProps {
  changedFiles?: ChangedFile[];
  onCommit?: (message: string) => void;
  onShowReview?: () => void;
}

// Dummy data for display
const DUMMY_CHANGED_FILES: ChangedFile[] = [
  { path: 'src/App.tsx', status: 'modified', additions: 45, deletions: 12 },
  { path: 'src/components/workspace/SessionWorkspace.tsx', status: 'modified', additions: 20, deletions: 5 },
  { path: 'src/components/workspace/panels/FoundationsPanel.tsx', status: 'added', additions: 200, deletions: 0 },
  { path: 'src/components/workspace/panels/GitPanel.tsx', status: 'added', additions: 150, deletions: 0 },
];

export function GitPanel({ changedFiles = DUMMY_CHANGED_FILES, onCommit, onShowReview }: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const hasChanges = changedFiles.length > 0;

  const totalAdditions = changedFiles.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = changedFiles.reduce((sum, f) => sum + f.deletions, 0);

  const handleCommit = () => {
    if (commitMessage.trim() && onCommit) {
      onCommit(commitMessage);
      setCommitMessage('');
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasChanges ? (
          <div className="text-center text-neutral-500 py-8">
            <div className="mb-2">
              <svg className="w-8 h-8 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm">Working tree clean</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400">+{totalAdditions}</span>
              <span className="text-red-400">-{totalDeletions}</span>
              <span className="text-neutral-400">{changedFiles.length} files</span>
            </div>

            {/* File list */}
            <div className="space-y-1">
              {changedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-800 rounded text-sm">
                  <span className={`text-xs px-1 rounded ${
                    file.status === 'added' ? 'bg-green-500/20 text-green-400' :
                    file.status === 'modified' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {file.status === 'added' ? 'A' : file.status === 'modified' ? 'M' : 'D'}
                  </span>
                  <span className="flex-1 truncate text-neutral-300 font-mono text-xs">{file.path}</span>
                  <span className="text-xs text-green-400">+{file.additions}</span>
                  <span className="text-xs text-red-400">-{file.deletions}</span>
                </div>
              ))}
            </div>

            {/* Commit area */}
            <div className="pt-3 border-t border-neutral-800">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onShowReview}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Review First
                </button>
                <button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim()}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    commitMessage.trim()
                      ? 'bg-green-600 hover:bg-green-500'
                      : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

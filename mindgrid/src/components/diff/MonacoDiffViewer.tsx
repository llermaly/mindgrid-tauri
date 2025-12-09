import { useEffect, useRef, useState, useMemo } from 'react';
import { DiffEditor, type MonacoDiffEditor } from '@monaco-editor/react';
import type { GitFileDiff } from '../../lib/git-types';

interface MonacoDiffViewerProps {
  file: GitFileDiff;
  viewType: 'split' | 'inline';
  height?: number;
}

// Language detection based on file extension
const getLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'r': 'r',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'md': 'markdown',
    'markdown': 'markdown',
    'dockerfile': 'dockerfile',
    'toml': 'toml',
    'ini': 'ini',
    'conf': 'ini',
    'env': 'ini',
  };
  return languageMap[ext || ''] || 'plaintext';
};

export function MonacoDiffViewer({ file, viewType, height = 500 }: MonacoDiffViewerProps) {
  const editorRef = useRef<MonacoDiffEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState(height);

  const language = useMemo(() => getLanguage(file.path), [file.path]);

  // Calculate dynamic height based on content
  useEffect(() => {
    const lineCount = Math.max(
      file.old_value.split('\n').length,
      file.new_value.split('\n').length
    );
    // Line height is approximately 19px, add some padding
    const calculatedHeight = Math.min(Math.max(lineCount * 19 + 50, 200), 800);
    setEditorHeight(calculatedHeight);
  }, [file.old_value, file.new_value]);

  const handleEditorMount = (editor: MonacoDiffEditor) => {
    editorRef.current = editor;
  };

  // Handle binary files
  if (file.is_binary) {
    return (
      <div className="flex items-center justify-center h-32 bg-neutral-900 rounded-lg border border-neutral-800">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-neutral-400">Binary file - cannot display diff</p>
          <p className="text-xs text-neutral-500 mt-1">{file.path}</p>
        </div>
      </div>
    );
  }

  // Handle empty files
  if (!file.old_value && !file.new_value) {
    return (
      <div className="flex items-center justify-center h-32 bg-neutral-900 rounded-lg border border-neutral-800">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-neutral-400">Empty file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 overflow-hidden">
      <DiffEditor
        height={editorHeight}
        language={language}
        original={file.old_value}
        modified={file.new_value}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          readOnly: true,
          renderSideBySide: viewType === 'split',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          lineNumbers: 'on',
          folding: true,
          wordWrap: 'on',
          automaticLayout: true,
          renderOverviewRuler: false,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          // Diff-specific options
          enableSplitViewResizing: true,
          renderIndicators: true,
          originalEditable: false,
          diffWordWrap: 'on',
        }}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GitIgnoredFile {
  path: string;
  name: string;
  is_directory: boolean;
  size: number | null;
}

interface GitignoreFilesSelectorProps {
  projectPath: string;
  selectedFiles: string[];
  onSelectionChange: (files: string[]) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GitignoreFilesSelector({
  projectPath,
  selectedFiles,
  onSelectionChange,
  disabled = false,
}: GitignoreFilesSelectorProps) {
  const [files, setFiles] = useState<GitIgnoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (projectPath) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [projectPath]);

  const loadFiles = async () => {
    if (!projectPath) return;

    setLoading(true);
    setError(null);

    try {
      const result = await invoke<GitIgnoredFile[]>("list_gitignored_files", {
        projectPath,
      });
      setFiles(result);

      // Auto-select common env files by default
      if (result.length > 0 && selectedFiles.length === 0) {
        const defaultSelection = result
          .filter(f => f.name.startsWith(".env"))
          .map(f => f.path);
        if (defaultSelection.length > 0) {
          onSelectionChange(defaultSelection);
        }
      }
    } catch (err) {
      console.error("Failed to load gitignored files:", err);
      setError(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    if (disabled) return;

    if (selectedFiles.includes(path)) {
      onSelectionChange(selectedFiles.filter(f => f !== path));
    } else {
      onSelectionChange([...selectedFiles, path]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onSelectionChange(files.map(f => f.path));
  };

  const selectNone = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  // Don't show if no files found
  if (!loading && files.length === 0 && !error) {
    return null;
  }

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">
            Environment Files
          </span>
          {files.length > 0 && (
            <span className="text-xs text-zinc-500">
              ({selectedFiles.length}/{files.length} selected)
            </span>
          )}
        </div>
        {loading && (
          <svg className="w-4 h-4 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-700">
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              Scanning for environment files...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400 text-sm">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No gitignored environment files found
            </div>
          ) : (
            <>
              <div className="p-3 bg-zinc-900/50 border-b border-zinc-700">
                <p className="text-xs text-zinc-400 mb-2">
                  Select files to copy from the main project to the worktree:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={disabled}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    type="button"
                    onClick={selectNone}
                    disabled={disabled}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    Select none
                  </button>
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {files.map((file) => (
                  <label
                    key={file.path}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-zinc-800 last:border-b-0 ${
                      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => toggleFile(file.path)}
                      disabled={disabled}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-zinc-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {file.is_directory ? (
                          <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="text-sm text-zinc-200 font-mono truncate">
                          {file.name}
                        </span>
                      </div>
                    </div>
                    {file.size !== null && (
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

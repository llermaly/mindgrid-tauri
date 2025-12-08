import { parsePath, openInEditor } from "../lib/path-utils";

interface PathLinkProps {
  path: string | undefined | null;
  className?: string;
}

/**
 * Displays a shortened path that opens in VS Code when clicked.
 * Shows project name and worktree name (if applicable) as separate clickable links.
 */
export function PathLink({ path, className = "" }: PathLinkProps) {
  const pathInfo = parsePath(path);

  if (!pathInfo) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => openInEditor(pathInfo.projectPath)}
        className="hover:text-blue-400 hover:underline cursor-pointer transition-colors truncate"
        title={`Open in VS Code: ${pathInfo.projectPath}`}
      >
        {pathInfo.projectName}
      </button>
      {pathInfo.isWorktree && pathInfo.worktreeName && pathInfo.worktreePath && (
        <>
          <span className="text-neutral-600 flex-shrink-0">/</span>
          <button
            onClick={() => openInEditor(pathInfo.worktreePath!)}
            className="hover:text-blue-400 hover:underline cursor-pointer transition-colors truncate"
            title={`Open worktree in VS Code: ${pathInfo.worktreePath}`}
          >
            {pathInfo.worktreeName}
          </button>
        </>
      )}
    </div>
  );
}

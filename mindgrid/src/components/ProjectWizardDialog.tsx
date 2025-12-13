import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ChatType } from "../lib/presets";
import { ModelSelector } from "./ModelSelector";
import type { SessionVariantConfig } from "./CreateSessionDialog";
import { generateDefaultSessionName, validateSessionName } from "../lib/session-utils";
import { useSessionStore } from "../stores/sessionStore";
import { getLastUsedModel, setLastUsedModel } from "../lib/database";
import { MODELS } from "../lib/models";

// Hardcoded projects directory - will be a setting later
const PROJECTS_DIRECTORY = "/Users/gustavollermalylarrain/Documents/proyectos/personales";

interface GitRepoInfo {
  name: string;
  path: string;
}

interface ProjectWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    projectName: string,
    projectPath: string,
    sessionName: string,
    chatTypes: ChatType[],
    filesToCopy?: string[],
    projectCommands?: { buildCommand?: string; runCommand?: string; systemPrompt?: string; initialPrompt?: string },
    options?: { prompt?: string; model?: string | null; variants?: SessionVariantConfig[] }
  ) => Promise<void>;
}

export function ProjectWizardDialog({
  isOpen,
  onClose,
  onCreate,
}: ProjectWizardDialogProps) {
  const { projects, deleteProject } = useSessionStore();

  // Repository state
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitRepoInfo | null>(null);
  const [showAllRepos, setShowAllRepos] = useState(false);

  // Main config
  const [model, setModel] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState(() => generateDefaultSessionName(0));

  // Advanced options
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [initialTask, setInitialTask] = useState("");
  const [previewCommand, setPreviewCommand] = useState("");

  // Parallel sessions (variants)
  const [variants, setVariants] = useState<SessionVariantConfig[]>([]);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute recent projects (repos that have been used as projects before)
  const recentRepos = useMemo(() => {
    const projectPaths = new Set(Object.values(projects).map(p => p.path));
    return repos.filter(r => projectPaths.has(r.path)).slice(0, 5);
  }, [repos, projects]);

  // Remaining repos count for "+N more" chip
  const remainingReposCount = repos.length - recentRepos.length;

  // Filtered repos for search
  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load repos and last used model when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset state
      setSearchQuery("");
      setSelectedRepo(null);
      setShowAllRepos(false);
      setSessionName(generateDefaultSessionName(0));
      setSystemPrompt("");
      setInitialTask("");
      setPreviewCommand("");
      setAdvancedOpen(false);
      setVariants([]);
      setIsCreating(false);
      setIsDeleting(false);
      setError(null);
      setConflictProject(null);

      // Load repos
      loadRepos();

      // Load last used model
      getLastUsedModel().then(lastModel => {
        const defaultModel = MODELS.find(m => m.isDefault)?.id || 'sonnet';
        setModel(lastModel || defaultModel);
      });

      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const result = await invoke<GitRepoInfo[]>("list_git_repos", {
        parentDirectory: PROJECTS_DIRECTORY,
      });
      setRepos(result);
    } catch (err) {
      console.error("Failed to load repos:", err);
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSelectRepo = (repo: GitRepoInfo) => {
    setSelectedRepo(repo);
    setConflictProject(null);
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedRepo(null);
    setShowAllRepos(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
        defaultPath: PROJECTS_DIRECTORY,
      });

      if (selected) {
        const path = selected as string;
        const folderName = path.split("/").pop() || "Untitled";
        setSelectedRepo({ name: folderName, path });
        setConflictProject(null);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    const trimmedSessionName = sessionName.trim();
    if (!trimmedSessionName) {
      setError("Please enter a session name");
      return;
    }

    const validationError = validateSessionName(trimmedSessionName);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Validate variant names
    let normalizedVariants: SessionVariantConfig[] | undefined;
    if (variants.length > 0) {
      normalizedVariants = variants.map((variant, index) => {
        const fallbackName = `Session #${index + 2}`;
        const name = variant.name.trim() || fallbackName;
        const promptValue = (variant.prompt || "").trim();
        return { ...variant, name, prompt: promptValue };
      });

      for (const variant of normalizedVariants) {
        const variantValidationError = validateSessionName(variant.name);
        if (variantValidationError) {
          setError(`Session "${variant.name}": ${variantValidationError}`);
          return;
        }
        if (variant.name === trimmedSessionName) {
          setError("Session names must be unique");
          return;
        }
      }

      const seen = new Set<string>();
      for (const variant of normalizedVariants) {
        if (seen.has(variant.name)) {
          setError(`Duplicate session name "${variant.name}"`);
          return;
        }
        seen.add(variant.name);
      }
    }

    setIsCreating(true);
    setError(null);

    try {
      // Save last used model
      if (model) {
        await setLastUsedModel(model);
      }

      const commands = {
        runCommand: previewCommand.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        initialPrompt: initialTask.trim() || undefined,
      };

      await onCreate(
        selectedRepo.name,
        selectedRepo.path,
        trimmedSessionName,
        [], // chatTypes - empty, not used in new flow
        [], // filesToCopy - empty, not in new spec
        commands,
        {
          prompt: initialTask.trim(),
          model,
          variants: normalizedVariants,
        }
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
      setIsCreating(false);

      if (err instanceof Error && err.message.toLowerCase().includes("project already exists")) {
        setConflictProject(selectedRepo.path);
        setError(null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (selectedRepo && !isCreating) {
        handleSubmit();
      }
    }
  };

  const generateVariantId = () => Math.random().toString(36).slice(2);

  const handleAddVariant = () => {
    setVariants((current) => {
      const nextIndex = current.length + 2;
      return [...current, {
        id: generateVariantId(),
        name: `Session #${nextIndex}`,
        prompt: "",
        model: model,
      }];
    });
  };

  const handleUpdateVariant = (id: string, updates: Partial<SessionVariantConfig>) => {
    setVariants((current) =>
      current.map((variant) => (variant.id === id ? { ...variant, ...updates } : variant))
    );
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== id));
  };

  const handleDeleteAndReplace = async () => {
    if (!conflictProject) return;

    const existingProject = Object.values(projects).find(p => p.path === conflictProject);
    if (!existingProject) {
      setError("Could not find existing project to delete");
      setConflictProject(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(existingProject.id);
      setConflictProject(null);
      await handleSubmit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete existing project";
      setError(msg);
      setConflictProject(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[99] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[580px] bg-[#151518] border-l border-[#2a2a32] z-[100] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f26]">
          <span className="text-lg font-semibold text-white">New Project</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#5a5a70] hover:bg-[#222228] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 slide-over-content">
          {/* Repository Section */}
          <div>
            <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
              Repository
            </div>

            {!selectedRepo ? (
              <>
                {/* Search Input */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5a70] text-sm pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pr-4 py-3 bg-[#222228] border border-[#2a2a32] rounded-md text-white placeholder:text-[#5a5a70] text-sm focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] transition-all"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>

                {/* Recent Projects */}
                {recentRepos.length > 0 && !searchQuery && !showAllRepos && (
                  <div className="mt-3">
                    <div className="text-[11px] text-[#5a5a70] mb-2">Recent</div>
                    <div className="flex flex-wrap gap-2">
                      {recentRepos.map((repo) => (
                        <button
                          key={repo.path}
                          onClick={() => handleSelectRepo(repo)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1e] border border-[#1f1f26] rounded-full text-xs text-[#8888a0] hover:border-[#6366f1] hover:text-white hover:bg-[#222228] transition-all"
                        >
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]" />
                          <span>{repo.name}</span>
                        </button>
                      ))}
                      {remainingReposCount > 0 && (
                        <button
                          onClick={() => setShowAllRepos(true)}
                          className="px-3 py-1.5 border border-dashed border-[#2a2a32] rounded-full text-xs text-[#5a5a70] hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
                        >
                          +{remainingReposCount} more
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Repo List (when searching or showing all) */}
                {(searchQuery || showAllRepos) && (
                  <div className="mt-3 border border-[#2a2a32] rounded-md overflow-hidden">
                    {loadingRepos ? (
                      <div className="p-6 text-center text-[#5a5a70] text-sm">
                        <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </div>
                    ) : filteredRepos.length === 0 ? (
                      <div className="p-6 text-center text-[#5a5a70] text-sm">
                        {searchQuery ? "No matching projects" : "No repositories found"}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {filteredRepos.map((repo) => (
                          <button
                            key={repo.path}
                            onClick={() => handleSelectRepo(repo)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#222228] transition-colors border-b border-[#1f1f26] last:border-b-0 text-left"
                          >
                            <div className="w-8 h-8 rounded-md bg-[#222228] flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-[#8888a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{repo.name}</div>
                              <div className="text-[11px] text-[#5a5a70] font-mono truncate">{repo.path}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Browse folder button */}
                <button
                  onClick={handleSelectFolder}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#2a2a32] rounded-md text-[#8888a0] text-sm hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Browse for folder...
                </button>
              </>
            ) : (
              /* Selected Repository Display */
              <div className="flex items-center gap-3 p-3 bg-[#222228] border border-[#6366f1] rounded-md">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{selectedRepo.name}</div>
                  <div className="text-[11px] text-[#5a5a70] font-mono truncate">
                    {selectedRepo.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-[11px] text-[#6366f1] hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Model + Session Name Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
                Model
              </div>
              <ModelSelector value={model} onChange={setModel} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
                Session Name
              </div>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Session 1"
                className="w-full px-3.5 py-2.5 bg-[#222228] border border-[#2a2a32] rounded-md text-white text-[13px] focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] transition-all"
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-2 py-3 text-[13px] text-[#8888a0] hover:text-white transition-colors"
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-200 ${advancedOpen ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 8 12"
            >
              <path d="M1.5 0L0 1.5 4.5 6 0 10.5 1.5 12 7.5 6z" />
            </svg>
            <span>Advanced options</span>
          </button>

          {/* Advanced Options Content */}
          {advancedOpen && (
            <div className="p-4 bg-[#1a1a1e] border border-[#1f1f26] rounded-md space-y-5">
              {/* System Prompt */}
              <div>
                <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
                  System Prompt
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Instructions that apply to all chats in this project..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#222228] border border-[#2a2a32] rounded-md text-white text-[13px] placeholder:text-[#5a5a70] focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] resize-y transition-all"
                />
                <div className="text-[11px] text-[#5a5a70] mt-1.5">
                  Persists across all chats and conversation resets
                </div>
              </div>

              {/* Initial Task */}
              <div>
                <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
                  Initial Task
                </div>
                <textarea
                  value={initialTask}
                  onChange={(e) => setInitialTask(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Task to execute when project opens..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#222228] border border-[#2a2a32] rounded-md text-white text-[13px] placeholder:text-[#5a5a70] focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] resize-y transition-all"
                />
                <div className="text-[11px] text-[#5a5a70] mt-1.5">
                  Runs once when session starts. Leave empty for blank chat.
                </div>
              </div>

              {/* Preview Command */}
              <div>
                <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px] mb-2.5">
                  Preview Command <span className="opacity-50">(optional)</span>
                </div>
                <input
                  type="text"
                  value={previewCommand}
                  onChange={(e) => setPreviewCommand(e.target.value)}
                  placeholder="npm run dev"
                  className="w-full px-3.5 py-2.5 bg-[#222228] border border-[#2a2a32] rounded-md text-white text-[13px] font-mono placeholder:text-[#5a5a70] focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] transition-all"
                />
                <div className="text-[11px] text-[#5a5a70] mt-1.5">
                  Command to launch the app preview
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#2a2a32]" />

              {/* Parallel Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-semibold text-[#5a5a70] uppercase tracking-[0.5px]">
                    Parallel Sessions
                  </div>
                  <button
                    onClick={handleAddVariant}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-[#2a2a32] rounded-md text-[11px] text-[#8888a0] hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
                  >
                    + Add session
                  </button>
                </div>
                <div className="text-[11px] text-[#5a5a70] mb-3">
                  Launch additional sessions to compare models or parallelize work
                </div>

                {variants.length === 0 ? (
                  <div className="p-5 text-center border border-dashed border-[#2a2a32] rounded-md text-[12px] text-[#5a5a70]">
                    No additional sessions<br />
                    <span className="opacity-70">Click "+ Add session" to compare models or parallelize</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className="p-3 bg-[#222228] border border-[#2a2a32] rounded-md"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[13px] font-medium text-white">
                            Session #{index + 2}
                          </span>
                          <button
                            onClick={() => handleRemoveVariant(variant.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-[#5a5a70] hover:bg-[rgba(239,68,68,0.2)] hover:text-[#ef4444] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-[120px,1fr] gap-2">
                          <div>
                            <div className="text-[10px] text-[#5a5a70] mb-1.5">Model</div>
                            <ModelSelector
                              value={variant.model}
                              onChange={(value) => handleUpdateVariant(variant.id, { model: value })}
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-[#5a5a70] mb-1.5">
                              Task Override <span className="opacity-50">(optional)</span>
                            </div>
                            <textarea
                              value={variant.prompt}
                              onChange={(e) => handleUpdateVariant(variant.id, { prompt: e.target.value })}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Same as primary session..."
                              rows={2}
                              className="w-full px-2.5 py-2 bg-[#1a1a1e] border border-[#2a2a32] rounded-md text-white text-[12px] placeholder:text-[#5a5a70] focus:outline-none focus:border-[#6366f1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.3)] resize-y transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md">
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1f1f26] bg-[#1a1a1e]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-md border border-[#2a2a32] text-[#8888a0] text-[13px] font-medium hover:bg-[#222228] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedRepo || isCreating}
            className="px-5 py-2.5 rounded-md bg-[#6366f1] text-white text-[13px] font-medium hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>

      {/* Conflict Dialog */}
      {conflictProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#151518] border border-[#2a2a32] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(239,68,68,0.2)] text-[#ef4444] flex items-center justify-center font-semibold text-lg">
                !
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Project already exists</div>
                <p className="text-xs text-[#8888a0]">
                  Delete and create a new one, or choose a different folder.
                </p>
              </div>
            </div>
            <div className="bg-[#222228] border border-[#2a2a32] rounded-md p-3 text-xs text-white font-mono break-all">
              {conflictProject}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConflictProject(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-md border border-[#2a2a32] text-white hover:bg-[#222228] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAndReplace}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-md bg-[#ef4444] hover:bg-[#ef4444]/80 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete and Replace"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PRESETS, type ChatType } from "../lib/presets";
import { GitignoreFilesSelector } from "./GitignoreFilesSelector";
import { ModelSelector } from "./ModelSelector";
import type { SessionVariantConfig } from "./CreateSessionDialog";
import { generateDefaultSessionName, validateSessionName } from "../lib/session-utils";

// Hardcoded projects directory - will be a setting later
const PROJECTS_DIRECTORY = "/Users/gustavollermalylarrain/Documents/proyectos/personales";

// Default project for development - mindgrid-tauri
const DEFAULT_PROJECT_PATH = "/Users/gustavollermalylarrain/Documents/proyectos/personales/mindgrid-tauri";

// Main repo path for referencing scripts that may not exist in worktrees
const MAIN_REPO_PATH = "/Users/gustavollermalylarrain/Documents/proyectos/personales/mindgrid-tauri";

// Project-specific build/run commands
const PROJECT_COMMANDS: Record<string, { buildCommand: string; runCommand: string }> = {
  "mindgrid-tauri": {
    buildCommand: "cd mindgrid && npm install && npm run build",
    runCommand: `cd mindgrid && npm install && ${MAIN_REPO_PATH}/mindgrid/scripts/tauri-preview.sh`,
  },
};

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
    projectCommands?: { buildCommand?: string; runCommand?: string },
    options?: { prompt?: string; model?: string | null; variants?: SessionVariantConfig[] }
  ) => Promise<void>;
}

type WizardStep = 'project' | 'configure' | 'variants';

const WIZARD_STEPS: Array<{ id: WizardStep; label: string; helper: string }> = [
  { id: 'project', label: 'Select repository', helper: 'Choose where to work' },
  { id: 'configure', label: 'Session setup', helper: 'Name and prompt' },
  { id: 'variants', label: 'Variants (optional)', helper: 'Parallel sessions' },
];

export function ProjectWizardDialog({
  isOpen,
  onClose,
  onCreate,
}: ProjectWizardDialogProps) {
  const [step, setStep] = useState<WizardStep>('project');
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitRepoInfo | null>(null);
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [sessionName, setSessionName] = useState(() => generateDefaultSessionName(0));
  const [prompt, setPrompt] = useState("Create a HELLO.md markdown file with MINDGRID CREATION as a content.");
  const [model, setModel] = useState<string | null>(null);
  const [chatTypes] = useState<ChatType[]>([]);
  const [filesToCopy, setFilesToCopy] = useState<string[]>([]);
  const [buildCommand, setBuildCommand] = useState("");
  const [runCommand, setRunCommand] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [variants, setVariants] = useState<SessionVariantConfig[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const repoListRef = useRef<HTMLDivElement>(null);

  // Load repos when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('project');
      setSearchQuery("");
      setSelectedRepo(null);
      setProjectPath("");
      setProjectName("");
      setSessionName(generateDefaultSessionName(0));
      setPrompt("Create a HELLO.md markdown file with MINDGRID CREATION as a content.");
      setModel(null);
      setFilesToCopy([]);
      setBuildCommand("");
      setRunCommand("");
      setIsCreating(false);
      setError(null);
      setConflictProject(null);
      setVariants([]);
      loadRepos();
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

      // Pre-select mindgrid-tauri if available
      const defaultRepo = result.find(r => r.path === DEFAULT_PROJECT_PATH);
      if (defaultRepo) {
        setSelectedRepo(defaultRepo);
        setProjectPath(defaultRepo.path);
        setProjectName(defaultRepo.name);
        // Set default commands
        const commands = PROJECT_COMMANDS[defaultRepo.name];
        if (commands) {
          setBuildCommand(commands.buildCommand);
          setRunCommand(commands.runCommand);
        }
        // Scroll to the selected item after render
        setTimeout(() => {
          const selectedElement = repoListRef.current?.querySelector(`[data-path="${defaultRepo.path}"]`);
          selectedElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to load repos:", err);
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRepo = (repo: GitRepoInfo) => {
    setSelectedRepo(repo);
    setProjectPath(repo.path);
    setProjectName(repo.name);
    setConflictProject(null);
    // Set default commands if available
    const commands = PROJECT_COMMANDS[repo.name];
    if (commands) {
      setBuildCommand(commands.buildCommand);
      setRunCommand(commands.runCommand);
    } else {
      setBuildCommand("");
      setRunCommand("");
    }
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
        setProjectPath(path);
        const folderName = path.split("/").pop() || "Untitled";
        setProjectName(folderName);
        setSelectedRepo({ name: folderName, path });
        setConflictProject(null);
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const handleNextFromProject = () => {
    if (!selectedRepo) {
      setError("Select a repository to continue");
      return;
    }
    setError(null);
    setStep('configure');
    // Set default model if not already set
    if (!model) {
      setModel(PRESETS[0].defaults.model || null);
    }
  };

  const handleNextFromConfigure = () => {
    if (!projectPath) {
      setError("Select a project folder to continue");
      return;
    }
    const trimmedSessionName = sessionName.trim();
    const validationError = validateSessionName(trimmedSessionName);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep('variants');
  };

  const handleBack = () => {
    if (step === 'variants') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('project');
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!projectPath) {
      setError("Please select a project folder");
      return;
    }
    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }
    const trimmedSessionName = sessionName.trim();
    if (!trimmedSessionName) {
      setError("Please enter a session name");
      return;
    }
    const baseValidationError = validateSessionName(trimmedSessionName);
    if (baseValidationError) {
      setError(baseValidationError);
      return;
    }
    let normalizedVariants: SessionVariantConfig[] | undefined;
    if (variants.length > 0) {
      normalizedVariants = variants.map((variant, index) => {
        const fallbackName = `Session #${index + 2}`;
        const name = variant.name.trim() || fallbackName;
        const promptValue = (variant.prompt || "").trim();
        return { ...variant, name, prompt: promptValue };
      });
      for (const variant of normalizedVariants) {
        const validationError = validateSessionName(variant.name);
        if (validationError) {
          setError(`Variant "${variant.name}": ${validationError}`);
          return;
        }
        if (variant.name === trimmedSessionName) {
          setError("Variant names must differ from the main session name");
          return;
        }
      }
      const seen = new Set<string>();
      for (const variant of normalizedVariants) {
        if (seen.has(variant.name)) {
          setError(`Duplicate variant name "${variant.name}"`);
          return;
        }
        seen.add(variant.name);
      }
    }

    setIsCreating(true);
    setError(null);
    try {
      // Use the editable command values from state
      const commands = {
        buildCommand: buildCommand.trim() || undefined,
        runCommand: runCommand.trim() || undefined,
      };
      await onCreate(
        projectName.trim(),
        projectPath,
        sessionName.trim(),
        chatTypes,
        filesToCopy,
        commands,
        {
          prompt: prompt.trim(),
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
        setConflictProject(projectPath);
        setError(null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (step === 'project') {
        handleNextFromProject();
      } else if (step === 'configure') {
        handleNextFromConfigure();
      } else if (step === 'variants') {
        handleSubmit();
      }
    }
  };


  const generateVariantId = () => Math.random().toString(36).slice(2);

  const createVariantFromBase = (
    position?: number,
    overrides?: Partial<SessionVariantConfig>
  ): SessionVariantConfig => {
    const variantIndex = position ?? variants.length + 2;
    const fallbackName = `Session #${variantIndex}`;
    return {
      id: generateVariantId(),
      name: overrides?.name ?? fallbackName,
      prompt: overrides?.prompt ?? prompt,
      model: overrides?.model ?? model,
    };
  };

  const handleAddVariant = () => {
    setVariants((current) => {
      const nextIndex = current.length + 2;
      return [...current, createVariantFromBase(nextIndex)];
    });
  };

  const handleUpdateVariant = (id: string, updates: Partial<SessionVariantConfig>) => {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...updates } : variant)));
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== id));
  };

  const currentStepIndex = WIZARD_STEPS.findIndex((wizardStep) => wizardStep.id === step);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-sm z-50 flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white">New Project</span>
            <span className="text-xs text-neutral-500">Step {currentStepIndex + 1} of {WIZARD_STEPS.length}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {WIZARD_STEPS.map((wizardStep, index) => {
              const isActive = wizardStep.id === step;
              const isComplete = index < currentStepIndex;
              return (
                <div key={wizardStep.id} className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded border ${
                      isActive
                        ? 'border-blue-500 text-blue-300'
                        : isComplete
                          ? 'border-emerald-600 text-emerald-300'
                          : 'border-neutral-700'
                    }`}
                    title={wizardStep.helper}
                  >
                    {wizardStep.label}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && <span className="text-neutral-600">→</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-700"
          >
            Close
          </button>
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-700"
              disabled={isCreating}
            >
              Back
            </button>
          )}
          <button
            onClick={
              step === 'project'
                ? handleNextFromProject
                : step === 'configure'
                  ? handleNextFromConfigure
                  : handleSubmit
            }
            disabled={
              isCreating ||
              (step === 'project' && !selectedRepo) ||
              (step === 'configure' && (!projectPath || !sessionName.trim()))
            }
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              step === 'variants' ? 'Create project' : 'Continue'
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'project' && (
            <div className="space-y-4 max-w-5xl">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                  {loadingRepos ? (
                    <div className="p-8 text-center text-zinc-500">
                      <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading repositories...
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      {searchQuery ? "No matching projects found" : "No git repositories found"}
                    </div>
                  ) : (
                    <div ref={repoListRef} className="max-h-[520px] overflow-y-auto">
                      {filteredRepos.map((repo) => (
                        <div
                          key={repo.path}
                          data-path={repo.path}
                          onClick={() => handleSelectRepo(repo)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-zinc-800 last:border-b-0 ${
                            selectedRepo?.path === repo.path
                              ? 'bg-blue-500/20 border-l-2 border-l-blue-500'
                              : 'hover:bg-zinc-800'
                          }`}
                        >
                          <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{repo.name}</div>
                            <div className="text-xs text-zinc-500 font-mono truncate">{repo.path}</div>
                          </div>
                          {selectedRepo?.path === repo.path && (
                            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSelectFolder}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-zinc-600 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors bg-zinc-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Browse for another folder...
                  </button>
                  <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-neutral-400">
                    Showing repositories from:
                    <div className="mt-1 font-mono text-neutral-300">{PROJECTS_DIRECTORY}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="p-2 space-y-6 max-w-5xl">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">
                  Session name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Session 1"
                />
                <p className="text-xs text-zinc-500">
                  Creates the primary git worktree for this project.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Task / prompt <span className="text-neutral-500">(optional)</span>
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the objective for this session"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Preferred model <span className="text-neutral-500">(optional)</span>
                  </label>
                  <ModelSelector value={model} onChange={setModel} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Build command</label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="npm run build"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Run command (for preview)</label>
                  <input
                    type="text"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="npm run dev"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Commands run from the worktree directory. Use the Run button to execute the preview.
              </p>


            </div>
          )}

          {step === 'variants' && (
            <div className="p-2 space-y-5 max-w-5xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Parallel variants (optional)</div>
                  <p className="text-sm text-neutral-400">
                    Launch additional sessions to compare models, prompt tweaks, or split features.
                  </p>
                </div>
              </div>

              <div className="p-3 border border-dashed border-zinc-700 rounded-lg bg-zinc-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Custom variants</div>
                    <p className="text-xs text-zinc-500">
                      Add additional sessions. Your current prompt is applied to every variant by default.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-200 transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-emerald-400 text-base leading-none">+</span>
                    Add variant
                  </button>
                </div>

                {variants.length === 0 && (
                  <div className="text-xs text-zinc-500">No variants added. Click "Add variant" to create parallel sessions.</div>
                )}

                {variants.length > 0 && (
                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div key={variant.id} className="p-3 rounded-lg border border-zinc-700 bg-zinc-900 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">
                              Variant name
                            </label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => handleUpdateVariant(variant.id, { name: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                              placeholder={`Session #${index + 2}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Remove variant"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">Model</label>
                            <ModelSelector
                              value={variant.model}
                              onChange={(value) => handleUpdateVariant(variant.id, { model: value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">Prompt</label>
                            <textarea
                              value={variant.prompt}
                              onChange={(e) => handleUpdateVariant(variant.id, { prompt: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
                              placeholder={prompt || "Describe this variant's goal"}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div>{variants.length} session{variants.length === 1 ? "" : "s"} will be created in addition to the primary session.</div>
                    </div>
                  </div>
                )}

              </div>

              <GitignoreFilesSelector
                projectPath={projectPath}
                selectedFiles={filesToCopy}
                onSelectionChange={setFilesToCopy}
                disabled={isCreating}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {conflictProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-300 flex items-center justify-center font-semibold">!</div>
                <div>
                  <div className="text-sm font-semibold text-white">Project already exists</div>
                  <p className="text-xs text-neutral-400">
                    There is already a project at this path. Open it from the list or choose a different folder.
                  </p>
                </div>
              </div>
              <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 text-xs text-neutral-300 font-mono break-all">
                {conflictProject}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConflictProject(null)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Pane */}
        <aside className="w-80 border-l border-neutral-800 bg-neutral-900/80 backdrop-blur-sm p-4 space-y-4 hidden lg:block">
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Project</div>
            <div className="text-sm text-white truncate">{projectName || "—"}</div>
            <div className="text-[11px] text-neutral-500 truncate font-mono">{projectPath || "Select a repo"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Primary Session</div>
            <div className="text-sm text-white truncate">{sessionName || "Not set"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Prompt / Model</div>
            <div className="text-sm text-white truncate">{prompt || "No prompt"}</div>
            <div className="text-[11px] text-neutral-500">{model || "Default model"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Variants</div>
            <div className="text-sm text-white">
              {variants.length > 0 ? `${variants.length} variant${variants.length === 1 ? "" : "s"}` : "Single session"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Commands</div>
            <div className="text-[12px] text-neutral-300 font-mono truncate">{buildCommand || "—"}</div>
            <div className="text-[12px] text-neutral-300 font-mono truncate">{runCommand || "—"}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

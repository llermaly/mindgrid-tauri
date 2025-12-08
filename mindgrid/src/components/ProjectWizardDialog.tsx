import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PRESETS, CHAT_TYPES, type ProjectPreset, type ChatType } from "../lib/presets";

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
    chatTypes: ChatType[]
  ) => Promise<void>;
}

type WizardStep = 'project' | 'configure';

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
  const [selectedPreset, setSelectedPreset] = useState<ProjectPreset | null>(null);
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [sessionName, setSessionName] = useState("Main");
  const [chatTypes, setChatTypes] = useState<ChatType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load repos when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('project');
      setSearchQuery("");
      setSelectedRepo(null);
      setSelectedPreset(null);
      setProjectPath("");
      setProjectName("");
      setSessionName("Main");
      setChatTypes([]);
      setIsCreating(false);
      setError(null);
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
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const handlePresetSelect = (preset: ProjectPreset) => {
    setSelectedPreset(preset);
    setChatTypes([...preset.chatTypes]);
  };

  const handleNext = () => {
    if (step === 'project' && selectedRepo) {
      setStep('configure');
      // Auto-select first preset if none selected
      if (!selectedPreset) {
        setSelectedPreset(PRESETS[0]);
        setChatTypes([...PRESETS[0].chatTypes]);
      }
    }
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('project');
    }
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
    if (!sessionName.trim()) {
      setError("Please enter a session name");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await onCreate(projectName.trim(), projectPath, sessionName.trim(), chatTypes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (step === 'project' && selectedRepo) {
        handleNext();
      } else if (step === 'configure' && projectPath && projectName.trim() && sessionName.trim()) {
        handleSubmit();
      }
    }
  };

  const toggleChatType = (type: ChatType) => {
    if (chatTypes.includes(type)) {
      setChatTypes(chatTypes.filter(t => t !== type));
    } else {
      setChatTypes([...chatTypes, type]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-100">
            {step === 'project' ? 'Select Project' : 'Configure Session'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {step === 'project'
              ? 'Choose a git repository to open'
              : 'Set up your session and choose which chat windows to open'
            }
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'project' && (
            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-3">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Repo List */}
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
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredRepos.map((repo) => (
                      <div
                        key={repo.path}
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

              {/* Manual folder picker */}
              <button
                onClick={handleSelectFolder}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Browse for another folder...
              </button>

              {/* Source directory info */}
              <p className="mt-3 text-xs text-zinc-600 text-center">
                Showing repositories from: {PROJECTS_DIRECTORY}
              </p>
            </div>
          )}

          {step === 'configure' && (
            <div className="p-6 space-y-6">
              {/* Selected Project */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{projectName}</div>
                    <div className="text-xs text-zinc-500 font-mono truncate">{projectPath}</div>
                  </div>
                  <button
                    onClick={handleBack}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Session Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Main"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This will create a git worktree for this session
                </p>
              </div>

              {/* Workflow Presets */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Workflow
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.slice(0, 6).map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                        selectedPreset?.id === preset.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white mx-auto mb-2"
                        style={{ backgroundColor: preset.color }}
                      >
                        {preset.icon}
                      </div>
                      <div className="text-xs font-medium text-white">{preset.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Types Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Chat Windows
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(CHAT_TYPES).map(info => {
                    const isSelected = chatTypes.includes(info.id);
                    return (
                      <div
                        key={info.id}
                        onClick={() => toggleChatType(info.id)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: `${info.color}30`, color: info.color }}
                          >
                            {info.icon}
                          </div>
                          <span className="text-sm text-white">{info.name}</span>
                          {isSelected && (
                            <svg className="w-4 h-4 text-blue-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {chatTypes.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    No chat windows will open. You can add them later.
                  </p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-between">
          <div>
            {step === 'configure' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {step === 'project' && (
              <button
                onClick={handleNext}
                disabled={!selectedRepo}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
            {step === 'configure' && (
              <button
                onClick={handleSubmit}
                disabled={!projectPath || !projectName.trim() || !sessionName.trim() || isCreating}
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
                  "Create Project"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

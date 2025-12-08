import { useEffect, useMemo, useState, type ReactNode } from "react";

type SettingsSection = "appearance" | "ai-providers" | "security" | "projects" | "agents" | "updates" | "advanced";

interface SettingsPageProps {
  onBack?: () => void;
}

interface SettingsState {
  theme: "light" | "dark" | "system";
  aiProvider: "claude-code" | "claude-code-router";
  customClaudeInstallation: string;
  bypassPermissions: boolean;
  globalInstructions: string;
  codingAgentPrompt: string;
  researchAgentPrompt: string;
  autoUpdates: boolean;
  verboseLogging: boolean;
  devMode: boolean;
  additionalPaths: string[];
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: "system",
  aiProvider: "claude-code",
  customClaudeInstallation: "",
  bypassPermissions: false,
  globalInstructions: "",
  codingAgentPrompt: "",
  researchAgentPrompt: "",
  autoUpdates: true,
  verboseLogging: false,
  devMode: false,
  additionalPaths: [],
};

const NAV_ITEMS: { id: SettingsSection; label: string; icon: JSX.Element }[] = [
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: "ai-providers",
    label: "AI Providers",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    id: "security",
    label: "Security",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c.667 0 2-.4 2-2a2 2 0 10-4 0c0 1.6 1.333 2 2 2zm0 0v1m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7v13h14V7m-5-4H9v4h6V3z" />
      </svg>
    ),
  },
  {
    id: "agents",
    label: "Agents",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2 2 2 3-3-6-6-6 6 3 3 2-2 2 2z" />
      </svg>
    ),
  },
  {
    id: "updates",
    label: "Updates",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.5 9a7.5 7.5 0 0113-2.5M18.5 15a7.5 7.5 0 01-13 2.5" />
      </svg>
    ),
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-zinc-700"}`}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : ""}`}
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${className}`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
    />
  );
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-4">
      <div className="mb-4">
        <h3 className="text-white font-medium mb-1">{title}</h3>
        {description && <p className="text-sm text-neutral-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
  vertical,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  vertical?: boolean;
}) {
  return (
    <div className={`py-3 ${vertical ? "" : "flex items-center justify-between gap-4"}`}>
      <div className={vertical ? "mb-3" : "flex-1"}>
        <div className="text-sm text-neutral-200">{label}</div>
        {description && <div className="text-xs text-neutral-500 mt-1">{description}</div>}
      </div>
      <div className={vertical ? "w-full" : ""}>{children}</div>
    </div>
  );
}

function PathDirectoryList({ paths, onChange }: { paths: string[]; onChange: (next: string[]) => void }) {
  const addPath = () => onChange([...paths, ""]);

  const updatePath = (index: number, value: string) => {
    const next = [...paths];
    next[index] = value;
    onChange(next);
  };

  const removePath = (index: number) => {
    onChange(paths.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {paths.map((path, index) => (
        <div key={`${path}-${index}`} className="flex items-center gap-2">
          <input
            value={path}
            onChange={(e) => updatePath(index, e.target.value)}
            placeholder="/path/to/directory"
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => removePath(index)}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Remove path"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={addPath}
        className="px-3 py-2 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
      >
        + Add directory
      </button>
    </div>
  );
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const saved = localStorage.getItem("mindgrid-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SettingsState>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (err) {
        console.error("Failed to parse saved settings", err);
      }
    }
  }, []);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveState("idle");
  };

  const handleSave = () => {
    localStorage.setItem("mindgrid-settings", JSON.stringify(settings));
    setHasChanges(false);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1500);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    setSaveState("idle");
  };

  const resetWarning = useMemo(() => {
    if (!settings.bypassPermissions) return null;
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="text-red-400 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-red-400">Security warning</div>
            <div className="text-xs text-neutral-400 mt-1">
              Bypassing permissions allows agents to run commands without approval. Use carefully on trusted projects only.
            </div>
          </div>
        </div>
      </div>
    );
  }, [settings.bypassPermissions]);

  const renderContent = () => {
    switch (activeSection) {
      case "appearance":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Appearance</h2>
            <SettingSection title="Theme" description="Choose how MindGrid looks on your device">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Light", icon: "L" },
                  { value: "dark", label: "Dark", icon: "D" },
                  { value: "system", label: "System", icon: "S" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting("theme", option.value as SettingsState["theme"])}
                    className={`p-4 border rounded-xl transition-all ${
                      settings.theme === option.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </SettingSection>
          </>
        );
      case "ai-providers":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">AI Providers</h2>
            <SettingSection title="Default Provider" description="Select which AI provider to use for code generation">
              <SettingRow label="AI Provider">
                <Select
                  value={settings.aiProvider}
                  onChange={(value) => updateSetting("aiProvider", value as SettingsState["aiProvider"])}
                  options={[
                    { value: "claude-code", label: "Claude Code" },
                    { value: "claude-code-router", label: "Claude Code Router (coming soon)" },
                  ]}
                />
              </SettingRow>
              <div className="border-t border-neutral-800 mt-2 pt-2">
                <SettingRow
                  label="Custom Claude Installation"
                  description="Leave empty to use 'claude' command (default)"
                  vertical
                >
                  <TextInput
                    value={settings.customClaudeInstallation}
                    onChange={(value) => updateSetting("customClaudeInstallation", value)}
                    placeholder="/usr/local/bin/claude"
                    className="w-full font-mono"
                  />
                </SettingRow>
              </div>
            </SettingSection>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-400">Claude Code Router</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Route requests to different AI providers based on task complexity. Coming soon.
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case "security":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Security</h2>
            <SettingSection title="Permissions" description="Control how MindGrid handles permission requests">
              <SettingRow
                label="Bypass Permissions"
                description="Automatically approve all permission requests (not recommended)"
              >
                <Toggle enabled={settings.bypassPermissions} onChange={(value) => updateSetting("bypassPermissions", value)} />
              </SettingRow>
            </SettingSection>
            {resetWarning}
          </>
        );
      case "projects":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Projects</h2>
            <SettingSection
              title="Global Instructions"
              description="These instructions will be included in every project session"
            >
              <TextArea
                value={settings.globalInstructions}
                onChange={(value) => updateSetting("globalInstructions", value)}
                placeholder={
                  "Enter global instructions for all projects...\n\nExample:\n- Always use TypeScript strict mode\n- Follow the existing code style\n- Write tests for new features"
                }
                rows={8}
              />
              <div className="mt-3 text-xs text-neutral-500">
                These instructions will be prepended to every AI session. Use this for coding standards, preferences, or project-wide rules.
              </div>
            </SettingSection>
          </>
        );
      case "agents":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Agents</h2>
            <SettingSection title="Coding Agent" description="Default system prompt for the Coding agent">
              <div className="flex items-center gap-3 mb-3 p-3 bg-neutral-800/50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
                  C
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Coding Agent</div>
                  <div className="text-xs text-neutral-400">Implements features, fixes bugs, refactors code</div>
                </div>
              </div>
              <TextArea
                value={settings.codingAgentPrompt}
                onChange={(value) => updateSetting("codingAgentPrompt", value)}
                placeholder={
                  "Custom instructions for the Coding agent...\n\nExample:\n- Write clean, maintainable code\n- Add comments for complex logic\n- Follow SOLID principles"
                }
                rows={6}
              />
            </SettingSection>

            <SettingSection title="Research Agent" description="Default system prompt for the Research agent">
              <div className="flex items-center gap-3 mb-3 p-3 bg-neutral-800/50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-semibold">
                  R
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Research Agent</div>
                  <div className="text-xs text-neutral-400">Explores codebase, answers questions, writes docs</div>
                </div>
              </div>
              <TextArea
                value={settings.researchAgentPrompt}
                onChange={(value) => updateSetting("researchAgentPrompt", value)}
                placeholder={
                  "Custom instructions for the Research agent...\n\nExample:\n- Provide detailed explanations\n- Include code examples\n- Reference file paths"
                }
                rows={6}
              />
            </SettingSection>

            <div className="p-4 bg-neutral-800/30 border border-neutral-700 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-neutral-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-300">About agent prompts</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    These prompts are added to the system instructions for each agent type. Project-specific prompts will be combined with these defaults.
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case "updates":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Updates</h2>
            <SettingSection title="Automatic Updates" description="Keep MindGrid up to date with the latest features and security fixes">
              <SettingRow
                label="Enable automatic updates"
                description="MindGrid will automatically download and install updates"
              >
                <Toggle enabled={settings.autoUpdates} onChange={(value) => updateSetting("autoUpdates", value)} />
              </SettingRow>
            </SettingSection>

            <SettingSection title="Version Information">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Current Version</span>
                  <span className="text-white font-mono">0.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Last Checked</span>
                  <span className="text-neutral-300">Just now</span>
                </div>
                <button className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-white transition-colors">
                  Check for updates
                </button>
              </div>
            </SettingSection>
          </>
        );
      case "advanced":
        return (
          <>
            <h2 className="text-xl font-semibold text-white mb-6">Advanced</h2>
            <SettingSection title="Debugging" description="Options for troubleshooting and development">
              <SettingRow label="Enable verbose logging" description="Show detailed logs in the console for debugging">
                <Toggle enabled={settings.verboseLogging} onChange={(value) => updateSetting("verboseLogging", value)} />
              </SettingRow>
              <div className="border-t border-neutral-800 mt-2 pt-2">
                <SettingRow
                  label="Developer Mode"
                  description="Returns raw JSON responses from Claude (for debugging)"
                >
                  <Toggle enabled={settings.devMode} onChange={(value) => updateSetting("devMode", value)} />
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title="Additional PATH Directories" description="Add custom directories to the PATH environment variable">
              <PathDirectoryList paths={settings.additionalPaths} onChange={(next) => updateSetting("additionalPaths", next)} />
              <div className="mt-3 text-xs text-neutral-500">
                These directories will be added to the PATH when running commands. Useful for custom tool installations.
              </div>
            </SettingSection>

            <SettingSection title="Reset Settings" description="Reset all settings to their default values">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 rounded-lg text-sm transition-colors"
              >
                Reset all settings
              </button>
            </SettingSection>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              aria-label="Back to dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">Settings</span>
              <span className="px-2 py-0.5 rounded text-xs bg-neutral-800 text-neutral-400">MindGrid</span>
            </div>
            {hasChanges && <div className="text-xs text-orange-400 mt-1">Unsaved changes</div>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saved" && <span className="text-xs text-emerald-400">Saved</span>}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasChanges
                ? "bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/50 text-emerald-400"
                : "bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed"
            }`}
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-60 border-r border-neutral-800 p-4 flex flex-col bg-neutral-900">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
                  activeSection === item.id ? "bg-neutral-800 text-white border border-neutral-700" : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-neutral-800 text-xs text-neutral-500">
            Settings are stored locally on this device.
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <div className="max-w-3xl">{renderContent()}</div>
        </section>
      </div>
    </div>
  );
}

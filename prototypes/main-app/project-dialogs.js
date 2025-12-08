    // Create Project Dialog
    function CreateProjectDialog({ isOpen, onClose, onComplete }) {
      const [step, setStep] = useState(1);
      const [selectedPreset, setSelectedPreset] = useState(null);
      const [isOpenExisting, setIsOpenExisting] = useState(false);
      const [existingPath, setExistingPath] = useState('');
      const [config, setConfig] = useState({
        projectName: '',
        prompt: '',
        agents: ['coding'],
        variants: []
      });
      const [showVariants, setShowVariants] = useState(false);

      // Auto-detect project name from path
      useEffect(() => {
        if (isOpenExisting && existingPath) {
          const pathParts = existingPath.split('/').filter(Boolean);
          const folderName = pathParts[pathParts.length - 1] || '';
          if (folderName && !config.projectName) {
            setConfig(prev => ({ ...prev, projectName: folderName }));
          }
        }
      }, [existingPath, isOpenExisting]);

      useEffect(() => {
        if (selectedPreset && step === 2 && config.variants.length === 0) {
          // Initialize first variant when moving to step 2
          setConfig(prev => ({
            ...prev,
            variants: [{
              id: Date.now(),
              name: 'Main',
              model: selectedPreset.defaults.model,
              prompt: prev.prompt,
              agents: prev.agents
            }]
          }));
        }
      }, [step, selectedPreset]);

      const canProceed = () => {
        if (step === 1) {
          if (isOpenExisting) {
            return existingPath.trim().length > 0;
          }
          return selectedPreset !== null;
        }
        return true;
      };

      const handleNext = () => {
        if (step === 1) {
          if (isOpenExisting) {
            // When opening existing, use Custom preset by default
            const customPreset = PRESETS.find(p => p.id === 'custom');
            setSelectedPreset(customPreset);
            // Set project name from path if not already set
            const pathParts = existingPath.split('/').filter(Boolean);
            const folderName = pathParts[pathParts.length - 1] || 'Existing Project';
            setConfig(prev => ({
              ...prev,
              projectName: prev.projectName || folderName,
              existingPath: existingPath
            }));
          }
          setStep(2);
        } else if (step === 2) {
          if (showVariants) {
            onComplete({ preset: selectedPreset, config, isOpenExisting, existingPath });
          } else {
            setShowVariants(true);
          }
        }
      };

      const handleBack = () => {
        if (showVariants) {
          setShowVariants(false);
        } else if (step === 2) {
          setStep(1);
        }
      };

      if (!isOpen) return null;

      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {step === 1 ? '+' : showVariants ? '#' : '*'}
                </span>
                <div>
                  <h2 className="font-medium text-white">
                    {step === 1 ? 'New Project' : showVariants ? 'Configure Variants' : 'Configure Session'}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Step {showVariants ? 3 : step} of 3
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress */}
            <div className="px-6 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex-1 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      (s < step || (s === 2 && step === 2 && !showVariants) || (s === 3 && showVariants))
                        ? 'bg-blue-600 text-white'
                        : s === step || (s === 2 && !showVariants && step === 2) || (s === 3 && showVariants)
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-700 text-neutral-400'
                    }`}>
                      {s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-0.5 ${s < step || (s === 1 && step >= 2) || (s === 2 && showVariants) ? 'bg-blue-600' : 'bg-neutral-700'}`} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-neutral-500">
                <span>Choose Preset</span>
                <span>Configure</span>
                <span>Variants</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              {step === 1 && (
                <PresetSelection
                  selected={selectedPreset}
                  onSelect={setSelectedPreset}
                  isOpenExisting={isOpenExisting}
                  onOpenExistingChange={setIsOpenExisting}
                  existingPath={existingPath}
                  onExistingPathChange={setExistingPath}
                />
              )}
              {step === 2 && !showVariants && selectedPreset && (
                <SessionConfiguration
                  preset={selectedPreset}
                  config={config}
                  onChange={setConfig}
                />
              )}
              {step === 2 && showVariants && (
                <VariantsConfiguration
                  config={config}
                  onChange={setConfig}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
              <button
                onClick={step === 1 ? onClose : handleBack}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <div className="flex items-center gap-3">
                {step === 2 && !showVariants && (
                  <button
                    onClick={() => {
                      // Skip variants, create single session
                      onComplete({ preset: selectedPreset, config: { ...config, variants: config.variants.slice(0, 1) } });
                    }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Skip Variants
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    !canProceed()
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                      : showVariants
                        ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/50 text-emerald-400'
                        : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-white'
                  }`}
                >
                  {showVariants
                    ? `Create ${config.variants.length} Session${config.variants.length !== 1 ? 's' : ''}`
                    : step === 2
                      ? 'Configure Variants'
                      : 'Next'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Edit Project Dialog
    function EditProjectDialog({ isOpen, project, onClose, onSave, onDelete, onArchive }) {
      const [config, setConfig] = useState({
        name: '',
        path: '',
        preset: 'custom',
        model: 'claude-sonnet',
        permissionMode: 'auto',
        commitMode: 'checkpoint',
        runScript: '',
        agents: ['coding'],
        systemPrompt: ''
      });

      useEffect(() => {
        if (project) {
          const preset = PRESETS.find(p => p.id === project.preset);
          setConfig({
            name: project.name,
            path: project.path,
            preset: project.preset,
            model: project.model || preset?.defaults?.model || 'claude-sonnet',
            permissionMode: project.permissionMode || preset?.defaults?.permissionMode || 'auto',
            commitMode: project.commitMode || preset?.defaults?.commitMode || 'checkpoint',
            runScript: project.runScript || preset?.defaults?.runScript || '',
            agents: project.agents || ['coding'],
            systemPrompt: project.systemPrompt || ''
          });
        }
      }, [project]);

      if (!isOpen || !project) return null;

      const selectedPreset = PRESETS.find(p => p.id === config.preset);

      const handlePresetChange = (preset) => {
        setConfig(prev => ({
          ...prev,
          preset: preset.id,
          model: preset.defaults.model,
          permissionMode: preset.defaults.permissionMode,
          commitMode: preset.defaults.commitMode,
          runScript: preset.defaults.runScript || ''
        }));
      };

      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                     style={{ background: selectedPreset?.color || '#6b7280' }}>
                  {selectedPreset?.icon || '?'}
                </div>
                <div>
                  <h2 className="font-medium text-white">Edit Project</h2>
                  <p className="text-xs text-neutral-500">{config.name || 'Configure project settings'}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
              {/* Project Name & Path */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="my-awesome-project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Project Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.path}
                      onChange={(e) => setConfig({ ...config, path: e.target.value })}
                      className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Project Preset</label>
                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => handlePresetChange(preset)}
                      className={`preset-card p-3 border rounded-lg cursor-pointer ${
                        config.preset === preset.id
                          ? 'selected border-blue-500 bg-blue-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg" style={{ color: preset.color }}>{preset.icon}</span>
                        <span className="text-sm font-medium text-white">{preset.name}</span>
                      </div>
                      <p className="text-xs text-neutral-400">{preset.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Default Agents</label>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_TYPES.filter(a => a.id !== 'review').map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => {
                        const agents = config.agents.includes(agent.id)
                          ? config.agents.filter(a => a !== agent.id)
                          : [...config.agents, agent.id];
                        setConfig({ ...config, agents });
                      }}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        config.agents.includes(agent.id)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="text-xl mb-1">{agent.icon}</div>
                      <div className="text-sm font-medium text-white">{agent.name}</div>
                      <div className="text-xs text-neutral-400">{agent.description}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Review agent appears automatically when committing code
                </p>
              </div>

              {/* Settings Grid */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Session Settings</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Model */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Model</label>
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      {MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Permission Mode */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Permission Mode</label>
                    <select
                      value={config.permissionMode}
                      onChange={(e) => setConfig({ ...config, permissionMode: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="auto">Auto-approve</option>
                      <option value="approve">Manual approve</option>
                      <option value="strict">Strict (ask always)</option>
                    </select>
                  </div>

                  {/* Commit Mode */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Commit Mode</label>
                    <select
                      value={config.commitMode}
                      onChange={(e) => setConfig({ ...config, commitMode: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="checkpoint">Checkpoint (auto)</option>
                      <option value="manual">Manual</option>
                      <option value="none">No commits</option>
                    </select>
                  </div>

                  {/* Run Script */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Run Script</label>
                    <input
                      type="text"
                      value={config.runScript}
                      onChange={(e) => setConfig({ ...config, runScript: e.target.value })}
                      placeholder="npm run dev"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Project System Prompt</label>
                <textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  placeholder="Custom instructions for AI agents working on this project..."
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-neutral-500 mt-1">These instructions will be included in every session for this project</p>
              </div>

              {/* Archive */}
              <div className="pt-4 border-t border-neutral-800">
                <button
                  onClick={() => onArchive(project)}
                  className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archive Project
                </button>
              </div>

              {/* Danger Zone - Collapsed by default */}
              <details className="pt-4 border-t border-neutral-800 group/danger">
                <summary className="text-sm text-neutral-500 hover:text-neutral-400 cursor-pointer list-none flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open/danger:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Danger Zone
                </summary>
                <div className="mt-3 pl-6">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) {
                        onDelete(project);
                      }
                    }}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </details>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave({ ...project, ...config })}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/50 text-emerald-400 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      );
    }

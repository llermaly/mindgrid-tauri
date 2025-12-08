    // Preset Selection Step
    function PresetSelection({ selected, onSelect, isOpenExisting, onOpenExistingChange, existingPath, onExistingPathChange }) {
      return (
        <div className="space-y-4">
          {/* Open Existing Project Option */}
          <div
            onClick={() => onOpenExistingChange(true)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              isOpenExisting
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">Open Existing Project</div>
                <p className="text-xs text-neutral-400">Import an existing folder as a Multitable project</p>
              </div>
              {isOpenExisting && (
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {isOpenExisting && (
              <div className="mt-4 pt-4 border-t border-neutral-700" onClick={(e) => e.stopPropagation()}>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Project Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={existingPath}
                    onChange={(e) => onExistingPathChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="/path/to/your/project"
                  />
                  <button className="px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">Select or enter the path to your existing project folder</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-700" />
            <span className="text-xs text-neutral-500">or create new</span>
            <div className="flex-1 h-px bg-neutral-700" />
          </div>

          {/* Preset Selection */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-3">Choose a preset</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => {
                    onOpenExistingChange(false);
                    onSelect(preset);
                  }}
                  className={`preset-card p-4 border rounded-lg cursor-pointer ${
                    !isOpenExisting && selected?.id === preset.id
                      ? 'selected border-blue-500'
                      : 'border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl" style={{ color: preset.color }}>{preset.icon}</span>
                    <span className="font-medium text-white">{preset.name}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">{preset.description}</p>
                  {preset.stack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {preset.stack.map(tech => (
                        <span key={tech} className="px-1.5 py-0.5 text-xs bg-neutral-800 rounded text-neutral-400">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Session Configuration Step
    function SessionConfiguration({ preset, config, onChange }) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Configure your session</h3>
            <p className="text-sm text-neutral-400">
              Pre-filled based on <span className="text-blue-400">{preset.name}</span> preset
            </p>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Project Name</label>
            <input
              type="text"
              value={config.projectName}
              onChange={(e) => onChange({ ...config, projectName: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="my-awesome-project"
            />
          </div>

          {/* Initial Prompt */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              What do you want to build?
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => onChange({ ...config, prompt: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Describe your project or first task..."
            />
          </div>

          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Starting Agents</label>
            <div className="grid grid-cols-3 gap-2">
              {AGENT_TYPES.filter(a => a.id !== 'review').map(agent => (
                <div
                  key={agent.id}
                  onClick={() => {
                    const agents = config.agents.includes(agent.id)
                      ? config.agents.filter(a => a !== agent.id)
                      : [...config.agents, agent.id];
                    onChange({ ...config, agents });
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

          {/* Quick Settings (pre-filled from preset) */}
          <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-300">Pre-configured settings</span>
              <button className="text-xs text-blue-400 hover:text-blue-300">Customize</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Model:</span>
                <span className="text-neutral-300">{preset.defaults.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Permissions:</span>
                <span className="text-neutral-300">{preset.defaults.permissionMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Commits:</span>
                <span className="text-neutral-300">{preset.defaults.commitMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Run script:</span>
                <span className="text-neutral-300 font-mono">{preset.defaults.runScript}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Variants Configuration Step
    function VariantsConfiguration({ config, onChange }) {
      const addVariant = () => {
        const newVariant = {
          id: Date.now(),
          name: `Variant ${config.variants.length + 1}`,
          model: config.variants[0]?.model || 'claude-sonnet',
          prompt: config.variants[0]?.prompt || config.prompt,
          agents: [...(config.variants[0]?.agents || config.agents)]
        };
        onChange({ ...config, variants: [...config.variants, newVariant] });
      };

      const updateVariant = (id, updates) => {
        onChange({
          ...config,
          variants: config.variants.map(v => v.id === id ? { ...v, ...updates } : v)
        });
      };

      const removeVariant = (id) => {
        if (config.variants.length > 1) {
          onChange({ ...config, variants: config.variants.filter(v => v.id !== id) });
        }
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Test Variants</h3>
              <p className="text-sm text-neutral-400">
                Run the same task with different configurations
              </p>
            </div>
            <button
              onClick={addVariant}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg text-sm flex items-center gap-1 text-white transition-colors"
            >
              <span className="text-emerald-400">+</span> Add Variant
            </button>
          </div>

          <div className="space-y-3">
            {config.variants.map((variant, index) => (
              <div key={variant.id} className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                    className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-blue-500"
                  />
                  {config.variants.length > 1 && (
                    <button
                      onClick={() => removeVariant(variant.id)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Model Selection */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Model</label>
                    <select
                      value={variant.model}
                      onChange={(e) => updateVariant(variant.id, { model: e.target.value })}
                      className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Agents */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Agents</label>
                    <div className="flex gap-1">
                      {AGENT_TYPES.filter(a => a.id !== 'review').map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            const agents = variant.agents.includes(agent.id)
                              ? variant.agents.filter(a => a !== agent.id)
                              : [...variant.agents, agent.id];
                            updateVariant(variant.id, { agents });
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            variant.agents.includes(agent.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-700 text-neutral-400'
                          }`}
                          title={agent.description}
                        >
                          {agent.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Prompt override */}
                <div className="mt-3">
                  <label className="block text-xs text-neutral-400 mb-1">
                    Prompt {index === 0 ? '(base)' : '(override)'}
                  </label>
                  <textarea
                    value={variant.prompt}
                    onChange={(e) => updateVariant(variant.id, { prompt: e.target.value })}
                    className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-600 rounded text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-800/50 rounded-lg border border-dashed border-neutral-600">
            <p className="text-sm text-neutral-400 text-center">
              {config.variants.length} session{config.variants.length !== 1 ? 's' : ''} will be created in a folder
            </p>
          </div>
        </div>
      );
    }

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { MODELS, type ModelConfig } from '../lib/models';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelId: string) => void;
  size?: 'sm' | 'md';
  allowedProviders?: Array<'anthropic' | 'openai' | 'google'>;
}

export function ModelSelector({
  value,
  onChange,
  size = 'sm',
  allowedProviders,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [remoteModels, setRemoteModels] = useState<ModelConfig[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    let isMounted = true;

    const fetchModels = async () => {
      try {
        const models = await invoke<Array<{ id: string; name?: string; shortName?: string }>>('codex_list_models');
        if (!isMounted || !models) return;

        const mapped: ModelConfig[] = models
          .filter((m) => m.id)
          .map((m) => ({
            id: m.id,
            name: m.name || prettifyModel(m.id),
            shortName: m.shortName || prettifyShortName(m.id),
            color: '#22c55e',
            provider: 'openai',
            contextWindow: 200000,
          }));

        setRemoteModels(mapped);
      } catch (err) {
        console.warn('Failed to load Codex models from CLI, using defaults', err);
      } finally {
        if (isMounted) {
          setRemoteLoaded(true);
        }
      }
    };

    fetchModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableModels = useMemo(() => {
    const combined = [...MODELS, ...remoteModels].filter((m) => {
      if (!allowedProviders || allowedProviders.length === 0) return true;
      return allowedProviders.includes(m.provider);
    });
    const seen = new Set<string>();
    const unique = combined.filter((model) => {
      if (seen.has(model.id)) return false;
      seen.add(model.id);
      return true;
    });

    // Sort by provider (anthropic first, then openai, then google), then by name
    const providerOrder: Record<string, number> = { anthropic: 0, openai: 1, google: 2 };
    return unique.sort((a, b) => {
      const providerDiff = (providerOrder[a.provider] ?? 3) - (providerOrder[b.provider] ?? 3);
      if (providerDiff !== 0) return providerDiff;
      return a.name.localeCompare(b.name);
    });
  }, [remoteModels, allowedProviders]);

  const fallbackPool =
    availableModels.length > 0
      ? availableModels
      : MODELS.filter((m) => {
          if (!allowedProviders || allowedProviders.length === 0) return true;
          return allowedProviders.includes(m.provider);
        });
  const currentModel = availableModels.find((m) => m.id === value) || fallbackPool[0] || MODELS[0];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-md transition-colors border border-neutral-700 hover:border-neutral-600 ${
          size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'
        } hover:bg-neutral-800`}
        title={remoteLoaded ? 'Change model' : 'Loading models...'}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: currentModel.color }}
        />
        <span className={`font-medium text-neutral-300 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {currentModel.shortName}
        </span>
        <svg className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-[9999] py-1 min-w-48 max-h-80 overflow-y-auto"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {availableModels.map((model, index) => {
              const prevModel = index > 0 ? availableModels[index - 1] : null;
              const showHeader = !prevModel || prevModel.provider !== model.provider;
              const providerLabels: Record<string, string> = {
                anthropic: 'Anthropic',
                openai: 'OpenAI',
                google: 'Google',
              };

              return (
                <div key={model.id}>
                  {showHeader && (
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-t border-neutral-700 first:border-t-0 mt-1 first:mt-0">
                      {providerLabels[model.provider] || model.provider}
                    </div>
                  )}
                  <button
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 ${
                      value === model.id ? 'bg-neutral-700/50' : ''
                    }`}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: model.color }}
                    />
                    <span className="flex-1 truncate">{model.name}</span>
                    {value === model.id && (
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
            {!remoteLoaded && (
              <div className="px-3 py-2 text-xs text-neutral-400 border-t border-neutral-700">
                Loading models...
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

interface ModelBadgeProps {
  modelId: string | null | undefined;
  size?: 'xs' | 'sm';
}

export function ModelBadge({ modelId, size = 'sm' }: ModelBadgeProps) {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) {
    return (
      <span className={`inline-flex items-center gap-1 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
        <span className={`rounded-full ${size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} style={{ background: '#22c55e' }} />
        <span className="text-neutral-400">{modelId || 'Model'}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
      <span
        className={`rounded-full ${size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ background: model.color }}
      />
      <span className="text-neutral-400">{model.shortName}</span>
    </span>
  );
}

function prettifyModel(id: string) {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function prettifyShortName(id: string) {
  const cleaned = prettifyModel(id);
  return cleaned.length > 12 ? cleaned.slice(0, 12) : cleaned;
}

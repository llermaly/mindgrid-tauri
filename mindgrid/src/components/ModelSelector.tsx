import { useState } from 'react';
import { MODELS, getModelById } from '../lib/models';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelId: string) => void;
  size?: 'sm' | 'md';
}

export function ModelSelector({ value, onChange, size = 'sm' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentModel = getModelById(value) || MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-md transition-colors border border-neutral-700 hover:border-neutral-600 ${
          size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'
        } hover:bg-neutral-800`}
        title="Change model"
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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1 min-w-40">
            {MODELS.map(model => (
              <button
                key={model.id}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 ${
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
                <span className="flex-1">{model.name}</span>
                {value === model.id && (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ModelBadgeProps {
  modelId: string | null | undefined;
  size?: 'xs' | 'sm';
}

export function ModelBadge({ modelId, size = 'sm' }: ModelBadgeProps) {
  const model = getModelById(modelId);
  if (!model) return null;

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

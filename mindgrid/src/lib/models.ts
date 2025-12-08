export interface ModelConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  provider: 'anthropic' | 'openai' | 'google';
  contextWindow: number;
  isDefault?: boolean;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet 4',
    color: '#8b5cf6',
    provider: 'anthropic',
    contextWindow: 200000,
    isDefault: true,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    shortName: 'Opus 4',
    color: '#f97316',
    provider: 'anthropic',
    contextWindow: 200000,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    shortName: 'Sonnet 3.5',
    color: '#a855f7',
    provider: 'anthropic',
    contextWindow: 200000,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    shortName: 'Haiku',
    color: '#06b6d4',
    provider: 'anthropic',
    contextWindow: 200000,
  },
];

export const DEFAULT_MODEL = MODELS.find(m => m.isDefault) || MODELS[0];

export function getModelById(id: string | null | undefined): ModelConfig | undefined {
  if (!id) return undefined;
  return MODELS.find(m => m.id === id);
}

export function getModelColor(id: string | null | undefined): string {
  const model = getModelById(id);
  return model?.color || '#6b7280';
}

export function getModelShortName(id: string | null | undefined): string {
  const model = getModelById(id);
  return model?.shortName || 'Model';
}

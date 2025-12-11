export interface ModelConfig {
  id: string; // CLI flag value (e.g., 'sonnet', 'opus', 'haiku', 'gpt-5.1-codex')
  name: string;
  shortName: string;
  color: string;
  provider: 'anthropic' | 'openai' | 'google';
  contextWindow: number;
  isDefault?: boolean;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4.5',
    shortName: 'Sonnet 4.5',
    color: '#8b5cf6',
    provider: 'anthropic',
    contextWindow: 200000,
    isDefault: true,
  },
  {
    id: 'opus',
    name: 'Claude Opus 4.5',
    shortName: 'Opus 4.5',
    color: '#f97316',
    provider: 'anthropic',
    contextWindow: 200000,
  },
  {
    id: 'haiku',
    name: 'Claude Haiku 4.5',
    shortName: 'Haiku 4.5',
    color: '#06b6d4',
    provider: 'anthropic',
    contextWindow: 200000,
  },
  {
    id: 'gpt-5.1-codex-max',
    name: 'GPT-5.1 Codex Max',
    shortName: 'Codex Max',
    color: '#22c55e',
    provider: 'openai',
    contextWindow: 200000,
  },
  {
    id: 'gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    shortName: 'Codex',
    color: '#16a34a',
    provider: 'openai',
    contextWindow: 200000,
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'GPT-5.1 Codex Mini',
    shortName: 'Codex Mini',
    color: '#10b981',
    provider: 'openai',
    contextWindow: 200000,
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    shortName: 'GPT-5.1',
    color: '#38bdf8',
    provider: 'openai',
    contextWindow: 200000,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    shortName: 'Gemini Pro',
    color: '#4285F4',
    provider: 'google',
    contextWindow: 1000000,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    shortName: 'Gemini Flash',
    color: '#FBBC05',
    provider: 'google',
    contextWindow: 1000000,
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

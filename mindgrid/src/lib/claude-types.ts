// Claude CLI stream-json event types

// Permission modes for Claude Code
export type PermissionMode =
  | 'default'        // Standard behavior - prompts for permission on first use
  | 'acceptEdits'    // Auto-accepts file edit permissions
  | 'plan'           // Plan mode - analyze only, no modifications
  | 'bypassPermissions'; // Skip all permission prompts (dangerous)

// High-risk tools that modify files or execute commands
export const HIGH_RISK_TOOLS = [
  'Bash',
  'Write',
  'Edit',
  'MultiEdit',
  'Delete',
  'NotebookEdit',
] as const;

// Permission request from Claude
export interface PermissionRequest {
  id: string;
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
}

// Permission response to Claude
export interface PermissionResponse {
  allow: boolean;
  reason?: string;
}

// Commit modes for worktree changes
export type CommitMode = 'checkpoint' | 'structured' | 'disabled';

export interface CommitModeSettings {
  mode: CommitMode;
  checkpointPrefix?: string; // Default: "checkpoint: "
  structuredPromptTemplate?: string; // Template to append for structured mode
}

export const DEFAULT_COMMIT_MODE_SETTINGS: CommitModeSettings = {
  mode: 'checkpoint',
  checkpointPrefix: 'checkpoint: ',
};

export const COMMIT_MODE_INFO: Record<CommitMode, { label: string; description: string; color: string }> = {
  checkpoint: {
    label: 'Checkpoint',
    description: 'Auto-commit after each response',
    color: 'text-green-400',
  },
  structured: {
    label: 'Structured',
    description: 'Claude handles commits properly',
    color: 'text-blue-400',
  },
  disabled: {
    label: 'Manual',
    description: 'No auto-commits',
    color: 'text-zinc-400',
  },
};

export type ClaudeEventType =
  | "system"
  | "assistant"
  | "user"
  | "tool_use"
  | "tool_result"
  | "result"
  | "error"
  | "message_start"
  | "message_delta"
  | "message_stop"
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop";

export interface ClaudeSystemEvent {
  type: "system";
  subtype: "init" | "api_key_source";
  session_id?: string;
  tools?: string[];
  mcp_servers?: string[];
  model?: string;
  api_key_source?: string;
  context_tokens?: number;
  context_window?: number;
}

export interface ClaudeAssistantEvent {
  type: "assistant";
  message: ClaudeMessage;
  session_id: string;
}

export interface ClaudeUserEvent {
  type: "user";
  message: {
    role: "user";
    content: string;
  };
  session_id: string;
}

export interface ClaudeToolUseEvent {
  type: "tool_use";
  tool_use_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
}

export interface ClaudeToolResultEvent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
  session_id: string;
}

export interface ClaudeResultEvent {
  type: "result";
  subtype: "success" | "error";
  result?: string;
  error?: string;
  session_id: string;
  cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  is_error?: boolean;
  num_turns?: number;
  total_cost_usd?: number;
  modelUsage?: {
    [modelName: string]: {
      inputTokens?: number;
      cacheReadInputTokens?: number;
      cacheCreationInputTokens?: number;
      outputTokens?: number;
      contextWindow?: number;
    };
  };
}

export interface ClaudeErrorEvent {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export interface ClaudeMessage {
  id?: string;
  type?: "message";
  role?: "assistant" | "user";
  content?: ContentBlock[];
  model?: string;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: Usage;
}

export interface ClaudeMessageStartEvent {
  type: "message_start";
  message: ClaudeMessage;
  session_id?: string;
}

export interface ClaudeMessageDeltaEvent {
  type: "message_delta";
  delta?: {
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: Partial<Usage>;
  };
  session_id?: string;
}

export interface ClaudeMessageStopEvent {
  type: "message_stop";
  message?: ClaudeMessage;
  session_id?: string;
}

export interface ClaudeContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block: ContentBlock;
  session_id?: string;
}

export interface ClaudeContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta: {
    type?: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: ContentBlock;
  session_id?: string;
}

export interface ClaudeContentBlockStopEvent {
  type: "content_block_stop";
  index: number;
  content_block?: ContentBlock;
  session_id?: string;
}

export type ClaudeEvent =
  | ClaudeSystemEvent
  | ClaudeAssistantEvent
  | ClaudeUserEvent
  | ClaudeToolUseEvent
  | ClaudeToolResultEvent
  | ClaudeResultEvent
  | ClaudeErrorEvent
  | ClaudeMessageStartEvent
  | ClaudeMessageDeltaEvent
  | ClaudeMessageStopEvent
  | ClaudeContentBlockStartEvent
  | ClaudeContentBlockDeltaEvent
  | ClaudeContentBlockStopEvent;

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking" | "assistant_response" | string;
  text?: string;
  id?: string;
  index?: number;
  name?: string;
  input?: Record<string, unknown>;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// Parsed message for UI display
export interface ParsedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  isError?: boolean;
  usage?: Usage;
  cost?: number;
  isPartial?: boolean;
}

// Session state
export interface ClaudeSession {
  id: string;
  sessionId: string | null; // Claude's session ID
  messages: ParsedMessage[];
  isRunning: boolean;
  totalCost: number;
  model: string | null;
}

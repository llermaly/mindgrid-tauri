import type { ParsedMessage } from "./claude-types";

export type GeminiMessage = ParsedMessage;

export interface GeminiEvent {
  type: "content" | "error" | "system";
  content?: string;
  error?: string;
}
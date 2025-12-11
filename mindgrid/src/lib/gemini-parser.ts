import type { GeminiMessage } from "./gemini-types";

type MessageCallback = (message: GeminiMessage) => void;

export class GeminiStreamParser {
  private buffer = "";
  private onMessage: MessageCallback;
  private messageCounter = 0;
  private currentId: string | null = null;

  constructor(onMessage: MessageCallback) {
    this.onMessage = onMessage;
  }

  feed(data: string): void {
    if (!data) return;

    this.buffer += data;
    
    if (!this.currentId) {
      this.currentId = `gemini-${++this.messageCounter}`;
    }

    this.onMessage({
      id: this.currentId,
      role: "assistant",
      content: this.buffer,
      timestamp: Date.now(),
      isPartial: true
    });
  }

  flush(): void {
    if (this.buffer && this.currentId) {
       this.onMessage({
        id: this.currentId,
        role: "assistant",
        content: this.buffer,
        timestamp: Date.now(),
        isPartial: false // Finalize
      });
    }
    this.buffer = "";
    this.currentId = null;
  }
}
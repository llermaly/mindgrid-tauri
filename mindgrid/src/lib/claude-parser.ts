import type { ClaudeEvent, ParsedMessage, Usage, ContentBlock } from "./claude-types";

type EventCallback = (event: ClaudeEvent) => void;
type MessageCallback = (message: ParsedMessage) => void;
type DebugCallback = (raw: string, parsed: ClaudeEvent | null, error?: string) => void;

export class ClaudeStreamParser {
  private buffer = "";
  private onEvent: EventCallback;
  private onMessage: MessageCallback;
  private onDebug?: DebugCallback;
  private messageCounter = 0;
  private currentAssistantId: string | null = null;
  private textBlocks = new Map<number, string>();
  private toolBlocks = new Map<
    number,
    {
      id?: string;
      name?: string;
      inputChunks: string[];
      initialInput?: Record<string, unknown>;
    }
  >();
  private currentUsage: Usage | null = null;

  constructor(
    onEvent: EventCallback,
    onMessage: MessageCallback,
    onDebug?: DebugCallback
  ) {
    this.onEvent = onEvent;
    this.onMessage = onMessage;
    this.onDebug = onDebug;
  }

  // Feed raw PTY output
  feed(data: string): void {
    if (data) {
      this.buffer += data;
    }

    const objects = this.extractJsonObjects();
    if (objects.length === 0) return;

    for (const raw of objects) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      try {
        const event = JSON.parse(trimmed) as ClaudeEvent;
        this.onDebug?.(trimmed, event);
        this.handleEvent(event);
      } catch (err) {
        // Try again after stripping ANSI codes
        const cleaned = this.stripAnsi(trimmed);
        try {
          const event = JSON.parse(cleaned) as ClaudeEvent;
          this.onDebug?.(cleaned, event, `Recovered from parse error: ${err}`);
          this.handleEvent(event);
        } catch (err2) {
          this.onDebug?.(trimmed, null, `Parse error: ${err} / ${err2}`);
        }
      }
    }
  }

  private extractJsonObjects(): string[] {
    const out: string[] = [];
    let start = -1;
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < this.buffer.length; i++) {
      const ch = this.buffer[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === "\"") {
          inString = false;
        }
        continue;
      }

      if (ch === "\"") {
        inString = true;
        continue;
      }

      if (ch === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && start >= 0) {
          out.push(this.buffer.slice(start, i + 1));
          start = -1;
        }
      }
    }

    if (out.length > 0) {
      const last = out[out.length - 1];
      const endIndex = this.buffer.lastIndexOf(last) + last.length;
      this.buffer = this.buffer.slice(endIndex);
    } else if (this.buffer.length > 5000) {
      // Avoid unbounded buffer growth if we never see JSON
      this.onDebug?.(this.buffer, null, "Non-JSON output");
      this.buffer = "";
    }

    return out;
  }

  private stripAnsi(input: string): string {
    return input.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
  }

  private resetStreamState(): void {
    this.textBlocks.clear();
    this.toolBlocks.clear();
    this.currentAssistantId = null;
    this.currentUsage = null;
  }

  private mergeUsage(delta?: Partial<Usage>): void {
    if (!delta) return;
    if (!this.currentUsage) {
      this.currentUsage = { input_tokens: 0, output_tokens: 0 };
    }
    this.currentUsage.input_tokens += delta.input_tokens ?? 0;
    this.currentUsage.output_tokens += delta.output_tokens ?? 0;

    if (delta.cache_creation_input_tokens !== undefined) {
      this.currentUsage.cache_creation_input_tokens =
        (this.currentUsage.cache_creation_input_tokens ?? 0) + delta.cache_creation_input_tokens;
    }
    if (delta.cache_read_input_tokens !== undefined) {
      this.currentUsage.cache_read_input_tokens =
        (this.currentUsage.cache_read_input_tokens ?? 0) + delta.cache_read_input_tokens;
    }
  }

  private normalizeUsage(usage: Usage | null): Usage | undefined {
    if (!usage) return undefined;
    return {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
    };
  }

  private buildAssistantText(): string {
    return Array.from(this.textBlocks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, text]) => text)
      .join("");
  }

  private emitAssistantMessage(content: string, usage?: Usage | null, id?: string): void {
    if (!content) return;

    this.onMessage({
      id: id || `msg-${++this.messageCounter}`,
      role: "assistant",
      content,
      timestamp: Date.now(),
      usage: this.normalizeUsage(usage ?? null),
    });
  }

  private emitToolUse(index: number, contentBlock?: ContentBlock): void {
    const meta = this.toolBlocks.get(index);
    if (!meta && contentBlock?.type !== "tool_use") return;

    const name = meta?.name || contentBlock?.name || "Tool";
    const chunks = meta?.inputChunks ?? [];
    const combined = chunks.join("");
    let parsedInput: Record<string, unknown> | undefined = meta?.initialInput;

    if (combined.trim()) {
      try {
        parsedInput = JSON.parse(combined);
      } catch {
        parsedInput = { raw: combined };
      }
    }

    this.onMessage({
      id: meta?.id || contentBlock?.id || `tool-${++this.messageCounter}`,
      role: "tool",
      content: `Using tool: ${name}`,
      timestamp: Date.now(),
      toolName: name,
      toolInput: parsedInput,
    });

    this.toolBlocks.delete(index);
  }

  private handleEvent(event: ClaudeEvent): void {
    this.onEvent(event);

    // Convert to ParsedMessage for UI
    switch (event.type) {
      case "system":
        if (event.subtype === "init") {
          this.onMessage({
            id: `msg-${++this.messageCounter}`,
            role: "system",
            content: `Session initialized. Model: ${event.model || "unknown"}`,
            timestamp: Date.now(),
          });
        }
        break;

      case "message_start":
        this.resetStreamState();
        this.currentAssistantId = event.message?.id || `msg-${++this.messageCounter}`;
        this.currentUsage = event.message?.usage ?? null;
        break;

      case "content_block_start": {
        const blockType = event.content_block?.type;
        const index = event.index ?? 0;

        if (blockType === "text" || blockType === "thinking" || blockType === "assistant_response") {
          this.textBlocks.set(index, "");
        } else if (blockType === "tool_use") {
          this.toolBlocks.set(index, {
            id: event.content_block?.id,
            name: event.content_block?.name,
            inputChunks: [],
            initialInput: event.content_block?.input,
          });
        }
        break;
      }

      case "content_block_delta": {
        const index = event.index ?? 0;
        const addition = event.delta?.text ?? event.delta?.partial_json ?? "";

        if (this.textBlocks.has(index)) {
          const prev = this.textBlocks.get(index) || "";
          this.textBlocks.set(index, prev + addition);

          // Emit partial update for text content
          const content = this.buildAssistantText();
          if (content && (this.currentAssistantId || this.messageCounter)) {
             // If we don't have an ID yet, we might need to wait or use a temp one.
             // Usually message_start gives us an ID.
             const id = this.currentAssistantId || `msg-${this.messageCounter + 1}`;
             
             this.onMessage({
               id,
               role: "assistant",
               content,
               timestamp: Date.now(),
               usage: this.normalizeUsage(this.currentUsage),
               isPartial: true,
             });
          }

        } else if (this.toolBlocks.has(index) && addition) {
          const meta = this.toolBlocks.get(index)!;
          meta.inputChunks.push(addition);
          this.toolBlocks.set(index, meta);
        }
        break;
      }

      case "content_block_stop":
        this.emitToolUse(event.index ?? 0, event.content_block);
        break;

      case "message_delta":
        this.mergeUsage(event.delta?.usage);
        break;

      case "message_stop": {
        if (event.message?.usage) {
          this.currentUsage = event.message.usage;
        }

        const content = this.buildAssistantText();
        this.emitAssistantMessage(content, this.currentUsage, this.currentAssistantId || event.message?.id);
        this.resetStreamState();
        break;
      }

      case "user":
        // Skip user messages - we add them immediately in the UI
        // This prevents duplicate messages when Claude echoes them back
        console.log("[ClaudeParser] Skipping user message echo");
        break;

      case "assistant":
        // Extract text content from blocks
        const contentBlocks = event.message.content ?? [];
        const textContent = contentBlocks
          .filter((block) => block.type === "text")
          .map((block) => block.text || "")
          .join("");

        if (textContent) {
          this.onMessage({
            id: event.message.id || `msg-${++this.messageCounter}`,
            role: "assistant",
            content: textContent,
            timestamp: Date.now(),
            usage: event.message.usage,
          });
        }

        // Handle tool_use blocks within assistant message
        for (const block of contentBlocks) {
          if (block.type === "tool_use") {
            this.onMessage({
              id: block.id || `msg-${++this.messageCounter}`,
              role: "tool",
              content: `Using tool: ${block.name}`,
              timestamp: Date.now(),
              toolName: block.name,
              toolInput: block.input,
            });
          }
        }
        break;

      case "tool_use":
        this.onMessage({
          id: event.tool_use_id || `msg-${++this.messageCounter}`,
          role: "tool",
          content: `Tool: ${event.tool_name}`,
          timestamp: Date.now(),
          toolName: event.tool_name,
          toolInput: event.tool_input,
        });
        break;

      case "tool_result":
        this.onMessage({
          id: `result-${event.tool_use_id}`,
          role: "tool",
          content: event.content.slice(0, 500) + (event.content.length > 500 ? "..." : ""),
          timestamp: Date.now(),
          toolResult: event.content,
          isError: event.is_error,
        });
        break;

      case "result":
        if (event.subtype === "success" && this.textBlocks.size > 0) {
          // Fallback: emit any accumulated text in case message_stop wasn't received
          const content = this.buildAssistantText();
          this.emitAssistantMessage(content, this.currentUsage, this.currentAssistantId || undefined);
          this.resetStreamState();
        }

        if (event.subtype === "success") {
          this.onMessage({
            id: `msg-${++this.messageCounter}`,
            role: "system",
            content: `Completed. Cost: $${event.cost_usd?.toFixed(4) || "0"}`,
            timestamp: Date.now(),
            cost: event.cost_usd,
          });
        } else if (event.subtype === "error") {
          this.onMessage({
            id: `msg-${++this.messageCounter}`,
            role: "system",
            content: `Error: ${event.error}`,
            timestamp: Date.now(),
            isError: true,
          });
        }
        break;

      case "error":
        this.onMessage({
          id: `msg-${++this.messageCounter}`,
          role: "system",
          content: `Error: ${event.error.message}`,
          timestamp: Date.now(),
          isError: true,
        });
        break;
    }
  }

  // Flush any remaining buffer
  flush(): void {
    if (this.buffer.trim()) {
      this.onDebug?.(this.buffer, null, "Flushed incomplete buffer");
    }
    this.buffer = "";
    this.resetStreamState();
  }
}

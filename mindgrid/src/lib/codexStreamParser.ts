/**
 * Minimal Codex stream parser adapted from commander.
 * Feeds Codex SDK event envelopes (outer JSON with `content` string) and
 * accumulates reasoning, agent messages, and usage into a formatted string.
 */
type TimelineStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface TimelineEntry {
  id: string;
  label: string;
  detail?: string;
  status: TimelineStatus;
}

export class CodexStreamParser {
  private sections = {
    reasoning: [] as string[],
    messages: [] as string[],
    usage: null as { input_tokens?: number; cached_input_tokens?: number; output_tokens?: number } | null,
  };

  private steps: TimelineEntry[] = [];
  private stepMap = new Map<string, TimelineEntry>();

  feed(raw: string): string | undefined {
    if (!raw.trim()) return;

    let envelope: any;
    try {
      envelope = JSON.parse(raw);
    } catch {
      // Not JSON, treat as plain text
      this.sections.messages.push(raw);
      return this.buildOutput();
    }

    const content = envelope?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return this.buildOutput();
    }

    let event: any;
    try {
      event = JSON.parse(content);
    } catch {
      this.sections.messages.push(content);
      return this.buildOutput();
    }

    return this.handleEvent(event);
  }

  private recordStep(id: string, label: string, detail: string | undefined, status: TimelineStatus) {
    const existing = this.stepMap.get(id);
    if (existing) {
      existing.status = status;
      if (detail) existing.detail = detail;
      return;
    }
    const entry: TimelineEntry = { id, label, detail, status };
    this.steps.push(entry);
    this.stepMap.set(id, entry);
  }

  private handleEvent(event: any): string | undefined {
    const eventType = event?.type;

    if (eventType === 'turn.completed' && event.usage) {
      this.sections.usage = event.usage;
      return this.buildOutput();
    }

    if (eventType === 'item.completed' && event.item) {
      return this.handleItem(event.item);
    }

    return this.buildOutput();
  }

  private handleItem(item: any): string | undefined {
    switch (item.type) {
      case 'agent_message':
        if (item.text) this.sections.messages.push(item.text);
        return this.buildOutput();
      case 'reasoning':
        if (item.text) this.sections.reasoning.push(item.text);
        return this.buildOutput();
      case 'command_execution': {
        const detail = item.aggregated_output
          ? `\n\`\`\`sh\n$ ${item.command}\n${item.aggregated_output}\n\`\`\``
          : undefined;
        this.recordStep(item.id, item.command, detail, this.mapStatus(item.status));
        return this.buildOutput();
      }
      case 'file_change': {
        const changes = (item.changes || [])
          .map((c: any) => {
            const action = c.kind === 'add' ? 'Created' : c.kind === 'delete' ? 'Deleted' : 'Modified';
            return `${action}: ${c.path}`;
          })
          .join('\n');
        this.recordStep(item.id, 'File updates', changes || undefined, item.status === 'failed' ? 'failed' : 'completed');
        return this.buildOutput();
      }
      default:
        return this.buildOutput();
    }
  }

  private mapStatus(status?: string): TimelineStatus {
    if (!status) return 'in_progress';
    switch (status) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'in_progress':
        return 'in_progress';
      default:
        return 'in_progress';
    }
  }

  private buildOutput(): string {
    const parts: string[] = [];
    if (this.sections.reasoning.length) {
      parts.push(this.sections.reasoning.map((r) => `_${r}_`).join('\n\n'));
    }
    if (this.sections.messages.length) {
      parts.push(this.sections.messages.join('\n\n'));
    }
    if (this.sections.usage) {
      const { input_tokens, output_tokens } = this.sections.usage;
      parts.push(`Usage — In: ${input_tokens ?? '?'}, Out: ${output_tokens ?? '?'}`);
    }
    if (this.steps.length) {
      const stepLines = this.steps.map((s) => {
        const status = s.status === 'failed' ? '✖' : s.status === 'completed' ? '✓' : '…';
        return `${status} ${s.label}${s.detail ? `\n${s.detail}` : ''}`;
      });
      parts.push(stepLines.join('\n'));
    }
    return parts.join('\n\n');
  }
}

/**
 * BulkSessionTemplateGrid Component
 * Grid of template cards for quick bulk session creation
 */

import { useState } from "react";
import { SESSION_TEMPLATES, getTemplateIcon, type SessionTemplate } from "../lib/session-templates";

interface BulkSessionTemplateGridProps {
  onSelectTemplate: (template: SessionTemplate) => void;
  onCustom: () => void;
}

export function BulkSessionTemplateGrid({ onSelectTemplate, onCustom }: BulkSessionTemplateGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {SESSION_TEMPLATES.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isHovered={hoveredId === template.id}
          onMouseEnter={() => setHoveredId(template.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onSelectTemplate(template)}
        />
      ))}

      {/* Custom option */}
      <button
        onClick={onCustom}
        onMouseEnter={() => setHoveredId("custom")}
        onMouseLeave={() => setHoveredId(null)}
        className={`group p-4 rounded-xl border-2 border-dashed transition-all text-left ${
          hoveredId === "custom"
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary-muted)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              hoveredId === "custom"
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-surface)] text-[var(--text-tertiary)] group-hover:bg-[var(--accent-primary-muted)] group-hover:text-[var(--accent-primary)]"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className={`text-sm font-medium transition-colors ${
            hoveredId === "custom"
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
          }`}>
            Custom
          </span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">Create your own session configuration</p>
      </button>
    </div>
  );
}

interface TemplateCardProps {
  template: SessionTemplate;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function TemplateCard({ template, isHovered, onMouseEnter, onMouseLeave, onClick }: TemplateCardProps) {
  const iconPath = getTemplateIcon(template.icon);

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group p-4 rounded-xl border transition-all text-left ${
        isHovered
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary-muted)]"
          : "border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            isHovered
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-surface)] text-[var(--text-tertiary)] group-hover:bg-[var(--accent-primary-muted)] group-hover:text-[var(--accent-primary)]"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium transition-colors block truncate ${
            isHovered
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
          }`}>
            {template.name}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">{template.sessionCount} sessions</span>
        </div>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{template.description}</p>
    </button>
  );
}

/**
 * Compact template selector shown inline in dialogs
 */
interface TemplateQuickSelectProps {
  selectedTemplate: SessionTemplate | null;
  onSelectTemplate: (template: SessionTemplate | null) => void;
}

export function TemplateQuickSelect({ selectedTemplate, onSelectTemplate }: TemplateQuickSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SESSION_TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(selectedTemplate?.id === template.id ? null : template)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedTemplate?.id === template.id
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          {template.name} ({template.sessionCount})
        </button>
      ))}
    </div>
  );
}

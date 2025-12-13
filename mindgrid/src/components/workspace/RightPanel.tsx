import { useState } from "react";

type TabId = "skills" | "tools" | "knowledge";

interface RightPanelProps {
  className?: string;
}

export function RightPanel({ className = "" }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("skills");

  return (
    <div className={`flex flex-col bg-[var(--bg-elevated)] border-l border-[var(--border-subtle)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-subtle)]">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          Skills & Tools
        </span>
        <button className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          +
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)]">
        {(["skills", "tools", "knowledge"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] transition-all relative ${
              activeTab === tab
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {activeTab === "tools" && <ToolsContent />}
        {activeTab === "skills" && <SkillsContent />}
        {activeTab === "knowledge" && <KnowledgeContent />}
      </div>
    </div>
  );
}

function ToolsContent() {
  const tools = [
    { id: "file", name: "File Read/Write", icon: "folder", enabled: true },
    { id: "search", name: "Search", icon: "search", enabled: true },
    { id: "terminal", name: "Terminal", icon: "terminal", enabled: true },
    { id: "web", name: "Web Fetch", icon: "globe", enabled: false },
  ];

  return (
    <>
      <SectionHeader title="Tools" action="Enable all" />

      {tools.map((tool) => (
        <ToolItem key={tool.id} {...tool} />
      ))}

      <div className="h-px bg-[var(--border)] my-3" />

      <SectionHeader title="Active Skills" />

      <SkillItem
        name="Test Writer"
        description="Generate unit tests"
        icon="&#x1F9EA;"
        active
      />
      <SkillItem
        name="Bank Compliance"
        description="Security patterns"
        icon="&#x1F3E6;"
        badge="Kibernum"
      />
    </>
  );
}

function SkillsContent() {
  return (
    <>
      <SectionHeader title="Available Skills" />

      <SkillItem
        name="Test Writer"
        description="Generate unit tests"
        icon="&#x1F9EA;"
        active
      />
      <SkillItem
        name="Bank Compliance"
        description="Security patterns"
        icon="&#x1F3E6;"
        badge="Kibernum"
      />
      <SkillItem
        name="Code Reviewer"
        description="Review and suggest improvements"
        icon="&#x1F50D;"
      />
      <SkillItem
        name="Documentation"
        description="Generate docs from code"
        icon="&#x1F4DD;"
      />
    </>
  );
}

function KnowledgeContent() {
  const files = [
    { name: "CLAUDE.md", path: ".claude/CLAUDE.md" },
    { name: "README.md", path: "README.md" },
    { name: "package.json", path: "package.json" },
  ];

  return (
    <>
      <SectionHeader title="Context Files" action="Add file" />

      {files.map((file) => (
        <div
          key={file.path}
          className="flex items-center gap-2.5 px-2.5 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-md mb-1 cursor-pointer hover:border-[var(--border)] transition-all"
        >
          <span className="text-sm">&#x1F4C4;</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--text-primary)] truncate">
              {file.name}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              {file.path}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
        {title}
      </span>
      {action && (
        <button className="text-[10px] text-[var(--accent)] hover:underline">
          {action}
        </button>
      )}
    </div>
  );
}

function ToolItem({
  name,
  icon,
  enabled,
}: {
  name: string;
  icon: string;
  enabled: boolean;
}) {
  const iconMap: Record<string, string> = {
    folder: "&#x1F4C1;",
    search: "&#x1F50D;",
    terminal: "&#x1F4BB;",
    globe: "&#x1F310;",
  };

  return (
    <div
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-1 cursor-pointer transition-all ${
        enabled
          ? "bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.3)]"
          : "bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border)]"
      }`}
    >
      <span className="text-sm" dangerouslySetInnerHTML={{ __html: iconMap[icon] || "&#x1F4E6;" }} />
      <span
        className={`flex-1 text-xs ${
          enabled ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {name}
      </span>
      <div
        className={`w-7 h-4 rounded-full relative transition-all ${
          enabled
            ? "bg-[var(--green)] border-[var(--green)]"
            : "bg-[var(--bg-input)] border border-[var(--border)]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${
            enabled ? "left-3.5 bg-white" : "left-0.5 bg-[var(--text-muted)]"
          }`}
        />
      </div>
    </div>
  );
}

function SkillItem({
  name,
  description,
  icon,
  active,
  badge,
}: {
  name: string;
  description: string;
  icon: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-md mb-1.5 cursor-pointer transition-all ${
        active
          ? "bg-[rgba(99,102,241,0.1)] border border-[var(--accent)]"
          : "bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--accent)]"
      }`}
    >
      <div className="w-7 h-7 flex items-center justify-center bg-[var(--bg-input)] rounded-md text-sm">
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--text-primary)]">{name}</div>
        <div className="text-[10px] text-[var(--text-muted)]">{description}</div>
      </div>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(99,102,241,0.2)] text-[var(--accent)]">
          {badge}
        </span>
      )}
    </div>
  );
}

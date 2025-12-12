import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PRESETS, type ChatType } from "../lib/presets";
import { GitignoreFilesSelector } from "./GitignoreFilesSelector";
import { ModelSelector } from "./ModelSelector";
import type { SessionVariantConfig } from "./CreateSessionDialog";
import { generateDefaultSessionName, validateSessionName } from "../lib/session-utils";
import { useSessionStore } from "../stores/sessionStore";

// Hardcoded projects directory - will be a setting later
const PROJECTS_DIRECTORY = "/Users/gustavollermalylarrain/Documents/proyectos/personales";

// Default project for development - mindgrid-tauri
const DEFAULT_PROJECT_PATH = "/Users/gustavollermalylarrain/Documents/proyectos/personales/mindgrid-tauri";

// Project-specific build/run commands
const PROJECT_COMMANDS: Record<string, { buildCommand: string; runCommand: string }> = {
  "mindgrid-tauri": {
    buildCommand: "cd mindgrid && npm install && npm run build",
    runCommand: "cd mindgrid && npm install && ./scripts/tauri-preview.sh",
  },
};

interface GitRepoInfo {
  name: string;
  path: string;
}

interface ProjectWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    projectName: string,
    projectPath: string,
    sessionName: string,
    chatTypes: ChatType[],
    filesToCopy?: string[],
    projectCommands?: { buildCommand?: string; runCommand?: string; systemPrompt?: string; initialPrompt?: string },
    options?: { prompt?: string; model?: string | null; variants?: SessionVariantConfig[] }
  ) => Promise<void>;
}

type WizardStep = 'intention' | 'project' | 'configure' | 'variants';

const WIZARD_STEPS: Array<{ id: WizardStep; label: string; helper: string }> = [
  { id: 'intention', label: 'Intention', helper: 'Choose your goal' },
  { id: 'project', label: 'Repository', helper: 'Choose where to work' },
  { id: 'configure', label: 'Session', helper: 'Name and prompt' },
  { id: 'variants', label: 'Variants', helper: 'Parallel sessions' },
];

type IntentionId = "start" | "compare" | "research" | "train";

const INTENTIONS: Array<{
  id: IntentionId;
  label: string;
  helper: string;
  iconBg: string;
  iconFg: string;
  accentGradient: string;
  accentBar: string;
}> = [
  {
    id: "start",
    label: "Start from scratch",
    helper: "Create a brand‑new project",
    iconBg: "bg-emerald-500/15",
    iconFg: "text-emerald-300",
    accentGradient: "bg-gradient-to-r from-emerald-400/15 via-teal-400/10 to-transparent",
    accentBar: "bg-emerald-300/70",
  },
  {
    id: "compare",
    label: "Compare",
    helper: "Contrast ideas or versions",
    iconBg: "bg-violet-500/15",
    iconFg: "text-violet-300",
    accentGradient: "bg-gradient-to-r from-violet-400/15 via-indigo-400/10 to-transparent",
    accentBar: "bg-violet-300/70",
  },
  {
    id: "research",
    label: "Research",
    helper: "Explore and gather context",
    iconBg: "bg-sky-500/15",
    iconFg: "text-sky-300",
    accentGradient: "bg-gradient-to-r from-sky-400/15 via-cyan-400/10 to-transparent",
    accentBar: "bg-sky-300/70",
  },
  {
    id: "train",
    label: "Train",
    helper: "Teach MindGrid your style",
    iconBg: "bg-amber-500/15",
    iconFg: "text-amber-300",
    accentGradient: "bg-gradient-to-r from-amber-400/15 via-orange-400/10 to-transparent",
    accentBar: "bg-amber-300/70",
  },
];

const INTENTION_ORDER: IntentionId[] = INTENTIONS.map((i) => i.id);

function cycleIntention(current: IntentionId, delta: 1 | -1): IntentionId {
  const index = INTENTION_ORDER.indexOf(current);
  if (index === -1) return INTENTION_ORDER[0] ?? current;
  const nextIndex = (index + delta + INTENTION_ORDER.length) % INTENTION_ORDER.length;
  return INTENTION_ORDER[nextIndex]!;
}

const INTENTION_DETAILS: Record<IntentionId, { description: string; steps: string[]; highlights: string[] }> = {
  start: {
    description: "Spin up a fresh AI‑assisted workspace from any repository or folder.",
    steps: [
      "Pick a repository to dive into",
      "Name your main session and give it a first mission",
      "Add side‑by‑side variants (optional)",
    ],
    highlights: ["Fast setup", "Polished defaults", "Variants ready"],
  },
  compare: {
    description: "Put ideas, models, or branches next to each other and see what wins.",
    steps: [
      "Choose the repo you want to compare in",
      "Set a shared goal or baseline prompt",
      "Add two or more variants for a fair showdown",
    ],
    highlights: ["Baseline vs challengers", "Side‑by‑side outputs", "Pick a winner"],
  },
  research: {
    description: "Explore a repo with curiosity and gather context before you build.",
    steps: [
      "Select a repository to explore",
      "Write a guiding question or research goal",
      "Add variants for different angles",
    ],
    highlights: ["Scan the codebase", "Collect context", "Summarize findings"],
  },
  train: {
    description: "Teach MindGrid your style so it feels like your teammate.",
    steps: [
      "Choose a repo (or an examples folder)",
      "Add your rules and a training task",
      "Spin up variants to validate the vibe",
    ],
    highlights: ["Rules & examples", "Consistent tone", "Iterate quickly"],
  },
};

const INTENTION_THEME: Record<
  IntentionId,
  {
    heroGradient: string;
    glow: string;
    kickerBg: string;
    kickerBorder: string;
    kickerText: string;
    iconBg: string;
    iconFg: string;
    ctaGradient: string;
    welcome: string;
    subline: string;
  }
> = {
  start: {
    heroGradient: "from-emerald-400/25 via-teal-500/15 to-transparent",
    glow: "bg-emerald-500/30",
    kickerBg: "bg-emerald-400/10",
    kickerBorder: "border-emerald-300/30",
    kickerText: "text-emerald-100",
    iconBg: "bg-emerald-500/20",
    iconFg: "text-emerald-100",
    ctaGradient: "from-fuchsia-500 via-indigo-500 to-cyan-400",
    welcome: "Let’s build something new",
    subline: INTENTION_DETAILS.start.description,
  },
  compare: {
    heroGradient: "from-violet-400/25 via-indigo-500/15 to-transparent",
    glow: "bg-violet-500/30",
    kickerBg: "bg-violet-400/10",
    kickerBorder: "border-violet-300/30",
    kickerText: "text-violet-100",
    iconBg: "bg-violet-500/20",
    iconFg: "text-violet-100",
    ctaGradient: "from-fuchsia-500 via-indigo-500 to-cyan-400",
    welcome: "Let’s compare side‑by‑side",
    subline: INTENTION_DETAILS.compare.description,
  },
  research: {
    heroGradient: "from-sky-400/25 via-cyan-500/15 to-transparent",
    glow: "bg-sky-500/30",
    kickerBg: "bg-sky-400/10",
    kickerBorder: "border-sky-300/30",
    kickerText: "text-sky-100",
    iconBg: "bg-sky-500/20",
    iconFg: "text-sky-100",
    ctaGradient: "from-fuchsia-500 via-indigo-500 to-cyan-400",
    welcome: "Let’s explore together",
    subline: INTENTION_DETAILS.research.description,
  },
  train: {
    heroGradient: "from-amber-400/25 via-orange-500/15 to-transparent",
    glow: "bg-amber-500/30",
    kickerBg: "bg-amber-400/10",
    kickerBorder: "border-amber-300/30",
    kickerText: "text-amber-100",
    iconBg: "bg-amber-500/20",
    iconFg: "text-amber-100",
    ctaGradient: "from-fuchsia-500 via-indigo-500 to-cyan-400",
    welcome: "Let’s tune MindGrid to you",
    subline: INTENTION_DETAILS.train.description,
  },
};

function WizardStepIcon({ id, className }: { id: WizardStep; className?: string }) {
  switch (id) {
    case "intention":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="m12 3-1.912 5.813a2 2 0 0 1-1.264 1.264L3 12l5.813 1.912a2 2 0 0 1 1.264 1.264L12 21l1.912-5.813a2 2 0 0 1 1.264-1.264L21 12l-5.813-1.912a2 2 0 0 1-1.264-1.264L12 3z"
          />
        </svg>
      );
    case "project":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      );
    case "configure":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M8 10h8M8 14h5m-7 6l3-3h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11l2-2z"
          />
        </svg>
      );
    case "variants":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            d="M7 7h10M7 17h10M9 7v10m6-10v10"
          />
        </svg>
      );
    default:
      return null;
  }
}

function FlowStepIcon({ index, className }: { index: number; className?: string }) {
  switch (index) {
    case 0:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 1:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m-7 6l3-3h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11l2-2z" />
        </svg>
      );
    case 2:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 17h10M9 7v10m6-10v10" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" strokeWidth={2} />
        </svg>
      );
  }
}

function IntentionIcon({ id, className }: { id: IntentionId; className?: string }) {
  switch (id) {
    case "start":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="m12 3-1.912 5.813a2 2 0 0 1-1.264 1.264L3 12l5.813 1.912a2 2 0 0 1 1.264 1.264L12 21l1.912-5.813a2 2 0 0 1 1.264-1.264L21 12l-5.813-1.912a2 2 0 0 1-1.264-1.264L12 3z" />
        </svg>
      );
    case "compare":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3.5" y="4.5" width="7" height="7" rx="2" strokeWidth={1.9} />
          <rect x="13.5" y="12.5" width="7" height="7" rx="2" strokeWidth={1.9} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M10.5 8h5m0 0-2-2m2 2-2 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M13.5 16h-5m0 0 2-2m-2 2 2 2" />
        </svg>
      );
    case "research":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth={1.9} />
          <polygon points="16 8 14 14 8 16 10 10 16 8" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "train":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" strokeWidth={1.9} strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth={1.9} strokeLinecap="round" />
          <line x1="4" y1="18" x2="20" y2="18" strokeWidth={1.9} strokeLinecap="round" />
          <circle cx="9" cy="6" r="2.2" strokeWidth={1.9} />
          <circle cx="15" cy="12" r="2.2" strokeWidth={1.9} />
          <circle cx="11" cy="18" r="2.2" strokeWidth={1.9} />
        </svg>
      );
    default:
      return null;
  }
}

function IntentionOrbs({ intention, theme }: { intention: IntentionId; theme: (typeof INTENTION_THEME)[IntentionId] }) {
  const bubbleShell =
    "relative rounded-full border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.06)]";
  const bubbleHighlight =
    "absolute inset-0 rounded-full bg-[radial-gradient(140px_120px_at_35%_25%,rgba(255,255,255,0.55),transparent_62%)] opacity-40 mix-blend-screen";

  const intentionLabel = INTENTIONS.find((i) => i.id === intention)?.label ?? "Intention";
  const subtitle =
    intention === "start"
      ? "New workspace"
      : intention === "compare"
        ? "Side‑by‑side"
        : intention === "research"
          ? "Deep dive"
          : "Your style";

  const positions: Record<IntentionId, { big: string; a: string; b: string; c: string; mini: string }> = {
    start: {
      big: "left-4 top-10",
      a: "right-2 top-6",
      b: "right-20 bottom-4",
      c: "left-40 bottom-0",
      mini: "left-56 top-2",
    },
    compare: {
      big: "left-8 top-14",
      a: "right-4 top-2",
      b: "right-24 bottom-2",
      c: "left-44 bottom-4",
      mini: "left-60 top-10",
    },
    research: {
      big: "left-6 top-16",
      a: "right-2 top-10",
      b: "right-20 bottom-2",
      c: "left-44 bottom-0",
      mini: "left-60 top-2",
    },
    train: {
      big: "left-10 top-6",
      a: "right-4 top-12",
      b: "right-24 bottom-0",
      c: "left-52 bottom-6",
      mini: "left-60 top-2",
    },
  };

  const p = positions[intention];

  return (
    <div className="hidden lg:block absolute right-2 top-0 bottom-0 w-[360px] pointer-events-none will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)]">
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[360px] h-[300px]">
        <div className={`absolute -top-16 -right-10 w-56 h-56 rounded-full ${theme.iconBg} blur-3xl opacity-70 animate-float-soft`} />
        <div className={`absolute -bottom-20 -left-10 w-64 h-64 rounded-full ${theme.iconBg} blur-3xl opacity-55 animate-float-soft-reverse`} />

        <div className={`absolute ${p.big}`}>
          <div className="animate-float-soft-slow">
            <div className={`${bubbleShell} w-[220px] h-[220px] group-hover:scale-[1.02] transition-transform duration-500`}>
              <div className={`absolute inset-0 rounded-full ${theme.iconBg} opacity-80`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center text-center gap-2">
                <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
                  <IntentionIcon id={intention} className={`w-7 h-7 ${theme.iconFg}`} />
                </div>
                <div className="text-sm font-semibold text-white leading-tight">{intentionLabel}</div>
                <div className="text-xs text-white/65">{subtitle}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute ${p.a}`}>
          <div className="animate-float-soft">
            <div className={`${bubbleShell} w-28 h-28 group-hover:scale-[1.03] transition-transform duration-500`}>
              <div className={`absolute inset-0 rounded-full ${theme.kickerBg} opacity-70`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center gap-1">
                <FlowStepIcon index={0} className={`w-7 h-7 ${theme.iconFg}`} />
                <div className="text-[11px] text-white/70">Repo</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute ${p.b}`}>
          <div className="animate-float-soft-reverse">
            <div className={`${bubbleShell} w-32 h-32 group-hover:scale-[1.03] transition-transform duration-500`}>
              <div className={`absolute inset-0 rounded-full ${theme.kickerBg} opacity-60`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center gap-1">
                <FlowStepIcon index={1} className={`w-8 h-8 ${theme.iconFg}`} />
                <div className="text-[11px] text-white/70">Prompt</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute ${p.c}`}>
          <div className="animate-float-soft">
            <div className={`${bubbleShell} w-24 h-24 group-hover:scale-[1.03] transition-transform duration-500`}>
              <div className={`absolute inset-0 rounded-full ${theme.kickerBg} opacity-60`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center gap-1">
                <FlowStepIcon index={2} className={`w-6 h-6 ${theme.iconFg}`} />
                <div className="text-[11px] text-white/70">Variants</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute ${p.mini}`}>
          <div className="animate-float-soft-slow">
            <div className={`${bubbleShell} w-14 h-14 group-hover:scale-105 transition-transform duration-500`}>
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-90" />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex items-center justify-center">
                <svg className={`w-5 h-5 ${theme.iconFg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l1.8 5.6a2 2 0 001.3 1.3L20.7 11l-5.6 1.8a2 2 0 00-1.3 1.3L12 19.7l-1.8-5.6a2 2 0 00-1.3-1.3L3.3 11l5.6-1.8a2 2 0 001.3-1.3L12 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareScene({ theme }: { theme: (typeof INTENTION_THEME)[IntentionId] }) {
  const sceneShell =
    "hidden lg:block absolute right-2 top-0 bottom-0 w-[360px] pointer-events-none will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)]";
  const bubbleShell =
    "relative rounded-full border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.06)]";
  const bubbleHighlight =
    "absolute inset-0 rounded-full bg-[radial-gradient(140px_120px_at_35%_25%,rgba(255,255,255,0.55),transparent_62%)] opacity-40 mix-blend-screen";

  return (
    <div className={sceneShell}>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[360px] h-[300px]">
        <div className={`absolute -top-16 -right-10 w-56 h-56 rounded-full ${theme.iconBg} blur-3xl opacity-70 animate-float-soft`} />
        <div className={`absolute -bottom-20 -left-10 w-64 h-64 rounded-full ${theme.iconBg} blur-3xl opacity-55 animate-float-soft-reverse`} />

        <div className="absolute inset-0 opacity-55">
          <div className="absolute left-1/2 top-6 bottom-6 w-px bg-white/15" />
          <div className="absolute left-1/2 top-0 h-full w-24 -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.22),transparent)] blur-xl opacity-45 animate-wizard-compare-scan" />
        </div>

        <div className="absolute left-6 top-10">
          <div className="animate-float-soft-slow">
            <div className={`${bubbleShell} w-[176px] h-[176px]`}>
              <div className={`absolute inset-0 rounded-full ${theme.kickerBg} opacity-70`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center text-center gap-1.5">
                <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
                  <div className="text-white font-semibold text-lg">A</div>
                </div>
                <div className="text-sm font-semibold text-white leading-tight">Variant A</div>
                <div className="text-xs text-white/65">Baseline</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-4 bottom-8">
          <div className="animate-float-soft">
            <div className={`${bubbleShell} w-[196px] h-[196px]`}>
              <div className={`absolute inset-0 rounded-full ${theme.kickerBg} opacity-60`} />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center text-center gap-1.5">
                <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
                  <div className="text-white font-semibold text-lg">B</div>
                </div>
                <div className="text-sm font-semibold text-white leading-tight">Variant B</div>
                <div className="text-xs text-white/65">Challenger</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-[168px] top-[132px]">
          <div className="animate-pulse-dot">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
              <div className="text-[11px] font-semibold tracking-wide text-white/90">VS</div>
            </div>
          </div>
        </div>

        <div className="absolute right-8 top-9">
          <div className="animate-float-soft-reverse">
            <div className={`${bubbleShell} w-20 h-20`}>
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-90" />
              <div className={bubbleHighlight} />
              <div className="relative h-full w-full flex flex-col items-center justify-center gap-1">
                <svg className={`w-5 h-5 ${theme.iconFg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h10M10 12h10M10 18h10M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
                <div className="text-[10px] text-white/70">Diff</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchScene({ theme }: { theme: (typeof INTENTION_THEME)[IntentionId] }) {
  const sceneShell =
    "hidden lg:block absolute right-2 top-0 bottom-0 w-[360px] pointer-events-none will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)]";

  return (
    <div className={sceneShell}>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[360px] h-[300px]">
        <div className={`absolute -top-16 -right-10 w-56 h-56 rounded-full ${theme.iconBg} blur-3xl opacity-60 animate-float-soft`} />
        <div className={`absolute -bottom-20 -left-10 w-64 h-64 rounded-full ${theme.iconBg} blur-3xl opacity-50 animate-float-soft-reverse`} />

        <div className="absolute left-10 top-6">
          <div className="animate-float-soft-slow">
            <div className="relative w-[240px] h-[240px] rounded-full border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_55px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(160px_160px_at_45%_40%,rgba(255,255,255,0.16),transparent_65%)] opacity-70" />
              <div className={`absolute inset-0 ${theme.kickerBg} opacity-30`} />
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-65 animate-wizard-radar-sweep" />
              <div className="absolute inset-8 rounded-full border border-white/10" />
              <div className="absolute inset-14 rounded-full border border-white/10" />
              <div className="absolute inset-20 rounded-full border border-white/10" />

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.55)]" />

              <div className="absolute left-[70px] top-[78px] w-2 h-2 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.45)] animate-pulse-dot" />
              <div className="absolute left-[156px] top-[110px] w-2 h-2 rounded-full bg-white/65 shadow-[0_0_12px_rgba(255,255,255,0.4)] animate-pulse-dot" />
              <div className="absolute left-[120px] top-[58px] w-1.5 h-1.5 rounded-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.35)] animate-pulse-dot" />

              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
                  <IntentionIcon id="research" className={`w-6 h-6 ${theme.iconFg}`} />
                </div>
                <div className="text-sm font-semibold text-white leading-tight">Signal hunting</div>
                <div className="text-xs text-white/65">Scan • collect • summarize</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainScene({ theme }: { theme: (typeof INTENTION_THEME)[IntentionId] }) {
  const sceneShell =
    "hidden lg:block absolute right-2 top-0 bottom-0 w-[360px] pointer-events-none will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)]";

  const nodeShell =
    "rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[0_14px_38px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.06)]";

  return (
    <div className={sceneShell}>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[360px] h-[300px]">
        <div className={`absolute -top-16 -right-10 w-56 h-56 rounded-full ${theme.iconBg} blur-3xl opacity-70 animate-float-soft`} />
        <div className={`absolute -bottom-20 -left-10 w-64 h-64 rounded-full ${theme.iconBg} blur-3xl opacity-55 animate-float-soft-reverse`} />

        <div className="absolute left-6 top-6 w-[320px] h-[280px]">
          <svg className="absolute inset-0 opacity-55" viewBox="0 0 320 280" fill="none">
            <defs>
              <linearGradient id="trainLine" x1="0" y1="0" x2="320" y2="280" gradientUnits="userSpaceOnUse">
                <stop stopColor="rgba(255,255,255,0.20)" />
                <stop offset="0.5" stopColor="rgba(255,255,255,0.10)" />
                <stop offset="1" stopColor="rgba(255,255,255,0.22)" />
              </linearGradient>
            </defs>
            <path d="M54 76 C 110 30, 178 30, 240 84" stroke="url(#trainLine)" strokeWidth="1.4" />
            <path d="M54 76 C 120 120, 120 168, 78 212" stroke="url(#trainLine)" strokeWidth="1.2" />
            <path d="M240 84 C 214 132, 210 174, 252 212" stroke="url(#trainLine)" strokeWidth="1.2" />
            <path d="M78 212 C 140 236, 194 236, 252 212" stroke="url(#trainLine)" strokeWidth="1.4" />
            <path d="M160 140 C 126 128, 108 104, 54 76" stroke="url(#trainLine)" strokeWidth="1.0" opacity="0.7" />
          </svg>

          <div className={`absolute left-[42px] top-[60px] w-6 h-6 ${nodeShell} animate-wizard-node-pulse`} />
          <div className={`absolute left-[230px] top-[70px] w-7 h-7 ${nodeShell} animate-wizard-node-pulse-slow`} />
          <div className={`absolute left-[64px] top-[198px] w-7 h-7 ${nodeShell} animate-wizard-node-pulse`} />
          <div className={`absolute left-[244px] top-[198px] w-6 h-6 ${nodeShell} animate-wizard-node-pulse-slow`} />

          <div className="absolute left-[128px] top-[94px] w-[120px] h-[120px] rounded-full border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_22px_70px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center gap-2 animate-float-soft-slow">
            <div className={`w-14 h-14 rounded-3xl ${theme.iconBg} border border-white/15 flex items-center justify-center shadow-sm`}>
              <IntentionIcon id="train" className={`w-7 h-7 ${theme.iconFg}`} />
            </div>
            <div className="text-sm font-semibold text-white leading-tight">Training loop</div>
            <div className="text-xs text-white/65">Rules • examples • refine</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntentionScene({ intention, theme }: { intention: IntentionId; theme: (typeof INTENTION_THEME)[IntentionId] }) {
  if (intention === "compare") return <CompareScene theme={theme} />;
  if (intention === "research") return <ResearchScene theme={theme} />;
  if (intention === "train") return <TrainScene theme={theme} />;

  return (
    <>
      <IntentionOrbs intention={intention} theme={theme} />
      <div className="hidden lg:block absolute right-2 top-0 bottom-0 w-[360px] pointer-events-none will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)]">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[360px] h-[300px]">
          <div className="absolute left-2 top-6 w-[264px] h-[264px] rounded-full border border-white/10 opacity-40 animate-wizard-ambient-spin" />
          <div className="absolute left-2 top-6 w-[264px] h-[264px] rounded-full border border-white/10 opacity-20 animate-wizard-ambient-spin-reverse" />
        </div>
      </div>
    </>
  );
}

export function ProjectWizardDialog({
  isOpen,
  onClose,
  onCreate,
}: ProjectWizardDialogProps) {
  const { projects, deleteProject } = useSessionStore();
  const [step, setStep] = useState<WizardStep>('intention');
  const [intention, setIntention] = useState<IntentionId>("start");
  const [repos, setRepos] = useState<GitRepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitRepoInfo | null>(null);
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [sessionName, setSessionName] = useState(() => generateDefaultSessionName(0));
  const [systemPrompt, setSystemPrompt] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("Create a HELLO.md markdown file with MINDGRID CREATION as a content.");
  const [model, setModel] = useState<string | null>(null);
  const [chatTypes] = useState<ChatType[]>([]);
  const [filesToCopy, setFilesToCopy] = useState<string[]>([]);
  const [buildCommand, setBuildCommand] = useState("");
  const [runCommand, setRunCommand] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [variants, setVariants] = useState<SessionVariantConfig[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const repoListRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const pageMotionRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<WizardStep>("intention");
  const prevIntentionRef = useRef<IntentionId>("start");
  const intentionNavDeltaRef = useRef<1 | -1 | 0>(0);
  const prefersReducedMotionRef = useRef(false);
  const parallaxRef = useRef<{
    targetX: number;
    targetY: number;
    currentX: number;
    currentY: number;
    rafId: number | null;
    hovering: boolean;
  }>({ targetX: 0, targetY: 0, currentX: 0, currentY: 0, rafId: null, hovering: false });

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    const el = pageMotionRef.current;
    if (!el || prefersReducedMotionRef.current) {
      prevStepRef.current = step;
      prevIntentionRef.current = intention;
      intentionNavDeltaRef.current = 0;
      return;
    }

    const prevStep = prevStepRef.current;
    const prevIntention = prevIntentionRef.current;
    const prevIndex = WIZARD_STEPS.findIndex((s) => s.id === prevStep);
    const nextIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

    let direction: "forward" | "back" = nextIndex >= prevIndex ? "forward" : "back";
    if (step === "intention" && prevStep === "intention" && prevIntention !== intention) {
      const delta = intentionNavDeltaRef.current;
      if (delta === -1) direction = "back";
      if (delta === 1) direction = "forward";
    }

    intentionNavDeltaRef.current = 0;
    el.classList.remove("wizard-enter-forward", "wizard-enter-back");
    void el.offsetWidth;
    el.classList.add(direction === "back" ? "wizard-enter-back" : "wizard-enter-forward");

    prevStepRef.current = step;
    prevIntentionRef.current = intention;
  }, [step, intention]);

  useEffect(() => {
    return () => {
      const rafId = parallaxRef.current.rafId;
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  const runParallaxFrame = () => {
    const el = modalRef.current;
    const state = parallaxRef.current;
    if (!el) {
      state.rafId = null;
      return;
    }

    const speed = 0.10;
    state.currentX += (state.targetX - state.currentX) * speed;
    state.currentY += (state.targetY - state.currentY) * speed;

    el.style.setProperty("--mx", state.currentX.toFixed(4));
    el.style.setProperty("--my", state.currentY.toFixed(4));

    const settled =
      Math.abs(state.currentX - state.targetX) < 0.001 &&
      Math.abs(state.currentY - state.targetY) < 0.001;

    if (!state.hovering && settled && state.targetX === 0 && state.targetY === 0) {
      state.rafId = null;
      return;
    }

    state.rafId = requestAnimationFrame(runParallaxFrame);
  };

  const startParallax = () => {
    if (prefersReducedMotionRef.current) return;
    if (parallaxRef.current.rafId != null) return;
    parallaxRef.current.rafId = requestAnimationFrame(runParallaxFrame);
  };

  const handleParallaxMove = (e: React.MouseEvent) => {
    if (prefersReducedMotionRef.current) return;
    const el = modalRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const nx = Math.max(-1, Math.min(1, (x - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, (y - 0.5) * 2));
    parallaxRef.current.targetX = nx;
    parallaxRef.current.targetY = ny;
    parallaxRef.current.hovering = true;
    startParallax();
  };

  const handleParallaxLeave = () => {
    if (prefersReducedMotionRef.current) return;
    parallaxRef.current.targetX = 0;
    parallaxRef.current.targetY = 0;
    parallaxRef.current.hovering = false;
    startParallax();
  };

  // Load repos when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('intention');
      setIntention("start");
      setSearchQuery("");
      setShowSearch(false);
      setShowAllRepos(false);
      setSelectedRepo(null);
      setProjectPath("");
      setProjectName("");
      setSessionName(generateDefaultSessionName(0));
      setSystemPrompt("");
      setInitialPrompt("Create a HELLO.md markdown file with MINDGRID CREATION as a content.");
      setModel(null);
      setFilesToCopy([]);
      setBuildCommand("");
      setRunCommand("");
      setIsCreating(false);
      setIsDeleting(false);
      setError(null);
      setConflictProject(null);
      setVariants([]);
      loadRepos();
    }
  }, [isOpen]);

  const handleStartOver = () => {
    setStep("intention");
    setShowSearch(false);
    setSearchQuery("");
    setShowAllRepos(false);
    setSelectedRepo(null);
    setProjectPath("");
    setProjectName("");
    setSessionName(generateDefaultSessionName(0));
    setSystemPrompt("");
    setInitialPrompt("Create a HELLO.md markdown file with MINDGRID CREATION as a content.");
    setModel(null);
    setFilesToCopy([]);
    setBuildCommand("");
    setRunCommand("");
    setIsCreating(false);
    setIsDeleting(false);
    setError(null);
    setConflictProject(null);
    setVariants([]);
  };

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const result = await invoke<GitRepoInfo[]>("list_git_repos", {
        parentDirectory: PROJECTS_DIRECTORY,
      });
      setRepos(result);

      // Pre-select mindgrid-tauri if available
      const defaultRepo = result.find(r => r.path === DEFAULT_PROJECT_PATH);
      if (defaultRepo) {
        setSelectedRepo(defaultRepo);
        setProjectPath(defaultRepo.path);
        setProjectName(defaultRepo.name);
        // Set default commands
        const commands = PROJECT_COMMANDS[defaultRepo.name];
        if (commands) {
          setBuildCommand(commands.buildCommand);
          setRunCommand(commands.runCommand);
        }
        // Scroll to the selected item after render
        setTimeout(() => {
          const selectedElement = repoListRef.current?.querySelector(`[data-path="${defaultRepo.path}"]`);
          selectedElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to load repos:", err);
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRepo = (repo: GitRepoInfo) => {
    setSelectedRepo(repo);
    setProjectPath(repo.path);
    setProjectName(repo.name);
    setConflictProject(null);
    // Set default commands if available
    const commands = PROJECT_COMMANDS[repo.name];
    if (commands) {
      setBuildCommand(commands.buildCommand);
      setRunCommand(commands.runCommand);
    } else {
      setBuildCommand("");
      setRunCommand("");
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
        defaultPath: PROJECTS_DIRECTORY,
      });

      if (selected) {
        const path = selected as string;
        setProjectPath(path);
        const folderName = path.split("/").pop() || "Untitled";
        setProjectName(folderName);
        setSelectedRepo({ name: folderName, path });
        setConflictProject(null);
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const handleNextFromIntention = () => {
    setError(null);
    setStep("project");
  };

  const handleNextFromProject = () => {
    if (!selectedRepo) {
      setError("Select a repository to continue");
      return;
    }
    setError(null);
    setStep('configure');
    // Set default model if not already set
    if (!model) {
      setModel(PRESETS[0].defaults.model || null);
    }
  };

  const handleNextFromConfigure = () => {
    if (!projectPath) {
      setError("Select a project folder to continue");
      return;
    }
    const trimmedSessionName = sessionName.trim();
    const validationError = validateSessionName(trimmedSessionName);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep('variants');
  };

  const handleBack = () => {
    if (step === 'variants') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('project');
    } else if (step === 'project') {
      setStep('intention');
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!projectPath) {
      setError("Please select a project folder");
      return;
    }
    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }
    const trimmedSessionName = sessionName.trim();
    if (!trimmedSessionName) {
      setError("Please enter a session name");
      return;
    }
    const baseValidationError = validateSessionName(trimmedSessionName);
    if (baseValidationError) {
      setError(baseValidationError);
      return;
    }
    let normalizedVariants: SessionVariantConfig[] | undefined;
    if (variants.length > 0) {
      normalizedVariants = variants.map((variant, index) => {
        const fallbackName = `Session #${index + 2}`;
        const name = variant.name.trim() || fallbackName;
        const promptValue = (variant.prompt || "").trim();
        return { ...variant, name, prompt: promptValue };
      });
      for (const variant of normalizedVariants) {
        const validationError = validateSessionName(variant.name);
        if (validationError) {
          setError(`Variant "${variant.name}": ${validationError}`);
          return;
        }
        if (variant.name === trimmedSessionName) {
          setError("Variant names must differ from the main session name");
          return;
        }
      }
      const seen = new Set<string>();
      for (const variant of normalizedVariants) {
        if (seen.has(variant.name)) {
          setError(`Duplicate variant name "${variant.name}"`);
          return;
        }
        seen.add(variant.name);
      }
    }

    setIsCreating(true);
    setError(null);
    try {
      // Use the editable command values from state
      const commands = {
        buildCommand: buildCommand.trim() || undefined,
        runCommand: runCommand.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        initialPrompt: initialPrompt.trim() || undefined,
      };
      await onCreate(
        projectName.trim(),
        projectPath,
        sessionName.trim(),
        chatTypes,
        filesToCopy,
        commands,
        {
          prompt: initialPrompt.trim(),
          model,
          variants: normalizedVariants,
        }
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
      setIsCreating(false);
      if (err instanceof Error && err.message.toLowerCase().includes("project already exists")) {
        setConflictProject(projectPath);
        setError(null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (step === "intention" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const delta = (e.key === "ArrowRight" ? 1 : -1) as 1 | -1;
      intentionNavDeltaRef.current = delta;
      setIntention(cycleIntention(intention, delta));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (step === "intention") {
        handleNextFromIntention();
      } else if (step === 'project') {
        handleNextFromProject();
      } else if (step === 'configure') {
        handleNextFromConfigure();
      } else if (step === 'variants') {
        handleSubmit();
      }
    }
  };


  const generateVariantId = () => Math.random().toString(36).slice(2);

  const createVariantFromBase = (
    position?: number,
    overrides?: Partial<SessionVariantConfig>
  ): SessionVariantConfig => {
    const variantIndex = position ?? variants.length + 2;
    const fallbackName = `Session #${variantIndex}`;
    return {
      id: generateVariantId(),
      name: overrides?.name ?? fallbackName,
      prompt: overrides?.prompt ?? initialPrompt,
      model: overrides?.model ?? model,
    };
  };

  const handleAddVariant = () => {
    setVariants((current) => {
      const nextIndex = current.length + 2;
      return [...current, createVariantFromBase(nextIndex)];
    });
  };

  const handleUpdateVariant = (id: string, updates: Partial<SessionVariantConfig>) => {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...updates } : variant)));
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== id));
  };

  const handleDeleteAndReplace = async () => {
    if (!conflictProject) return;

    // Find the existing project by path
    const existingProject = Object.values(projects).find(p => p.path === conflictProject);
    if (!existingProject) {
      setError("Could not find existing project to delete");
      setConflictProject(null);
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the existing project
      await deleteProject(existingProject.id);

      // Close the conflict dialog
      setConflictProject(null);

      // Retry the creation
      await handleSubmit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete existing project";
      setError(msg);
      setConflictProject(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentStepIndex = WIZARD_STEPS.findIndex((wizardStep) => wizardStep.id === step);
  const intentionMeta = INTENTIONS.find((item) => item.id === intention);
  const intentionTheme = INTENTION_THEME[intention];
  const intentionPlanTitle =
    intention === "start"
      ? "Your launch plan"
      : intention === "compare"
        ? "Your comparison plan"
        : intention === "research"
          ? "Your exploration plan"
          : "Your training plan";
  const intentionPlanSubtitle =
    intention === "start"
      ? "A quick guided flow, then you’re in."
      : intention === "compare"
        ? "Set a baseline, then try bold variants."
        : intention === "research"
          ? "Gather context before you change anything."
          : "Teach MindGrid your style with examples.";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        onMouseMove={handleParallaxMove}
        onMouseLeave={handleParallaxLeave}
        style={
          {
            ["--mx" as never]: 0,
            ["--my" as never]: 0,
          } as React.CSSProperties
        }
        className="relative w-[min(1220px,96vw)] h-[min(820px,94vh)] rounded-[28px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.7)] ring-1 ring-white/10 bg-[var(--bg-secondary)] animate-scale-in"
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#2c1460] via-[#1b2c7a] to-[#0b3a53] opacity-85 will-change-transform [transform:translate3d(calc(var(--mx)*10px),calc(var(--my)*8px),0)_scale(1.03)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(900px_700px_at_0%_0%,rgba(168,85,247,0.55),transparent_55%),radial-gradient(800px_700px_at_100%_0%,rgba(59,130,246,0.5),transparent_60%),radial-gradient(900px_700px_at_50%_120%,rgba(236,72,153,0.45),transparent_60%)] opacity-70 mix-blend-screen will-change-transform [transform:translate3d(calc(var(--mx)*-16px),calc(var(--my)*14px),0)_scale(1.04)]" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_18%,transparent_82%,rgba(0,0,0,0.35))] will-change-transform [transform:translate3d(calc(var(--mx)*4px),calc(var(--my)*-4px),0)]" />
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-xl"
            data-tauri-drag-region
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleStartOver}
                disabled={isCreating}
                className="group inline-flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 px-3 py-2 text-xs text-white/75 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 opacity-80 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 9A9 9 0 006 6.3L4 10m0 5a9 9 0 0014 2.7L20 14" />
                </svg>
                Start over
              </button>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-semibold text-white tracking-tight leading-tight">Create Project</span>
                <span className="text-[11px] text-white/55 leading-tight">{WIZARD_STEPS[currentStepIndex]?.helper}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="relative flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="absolute inset-0 pointer-events-none opacity-55 bg-[radial-gradient(420px_120px_at_50%_0%,rgba(255,255,255,0.16),transparent_62%)]" />
                {WIZARD_STEPS.map((wizardStep, index) => {
                  const isActive = wizardStep.id === step;
                  const isComplete = index < currentStepIndex;
                  const canJumpBack = index <= currentStepIndex;
                  return (
                    <button
                      key={wizardStep.id}
                      type="button"
                      disabled={!canJumpBack || isCreating}
                      onClick={() => {
                        if (!canJumpBack) return;
                        setStep(wizardStep.id);
                        setError(null);
                      }}
                      title={wizardStep.helper}
                      className={`group relative flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium tracking-wide transition-all duration-300 ${
                        isActive
                          ? "bg-white/15 border border-white/25 text-white shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                          : isComplete
                            ? "bg-white/5 border border-white/10 text-white/75 hover:bg-white/10 hover:text-white"
                            : "bg-transparent border border-transparent text-white/45 hover:text-white/70 hover:bg-white/5"
                      } ${canJumpBack ? "" : "opacity-50 cursor-not-allowed"}`}
                    >
                      <span
                        className={`relative w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                          isActive
                            ? "bg-white/10 border-white/20"
                            : isComplete
                              ? "bg-white/5 border-white/10"
                              : "bg-transparent border-transparent group-hover:bg-white/5 group-hover:border-white/10"
                        }`}
                      >
                        {isComplete ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <WizardStepIcon id={wizardStep.id} className="w-4 h-4 text-white/85" />
                        )}
                      </span>
                      <span className="hidden lg:block">{wizardStep.label}</span>
                      {isActive && (
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(120deg,rgba(255,255,255,0.18),transparent_55%)] opacity-60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onClose}
              className="group justify-self-end flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 text-xs text-white/80 transition-all duration-200"
            >
              <svg className="w-4 h-4 opacity-80 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Intentions Sidebar */}
            <aside className="w-[92px] shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-2xl p-3 flex flex-col items-center gap-3">
              <div className="w-full pt-1 pb-2 flex flex-col items-center gap-2">
                <div className="relative w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(60px_60px_at_30%_25%,rgba(255,255,255,0.18),transparent_60%)]" />
                  <IntentionIcon id={intention} className="relative w-5 h-5 text-white/85" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Intentions</div>
              </div>
              {INTENTIONS.map((item) => {
                const active = intention === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (intention !== item.id) setIntention(item.id);
                      if (step !== "intention") setStep("intention");
                      setError(null);
                    }}
                    title={item.helper}
                    aria-label={item.label}
                    className={`group relative w-full rounded-2xl border overflow-visible transition-all duration-300 ease-out ${
                      active
                        ? "bg-white/10 border-white/20 shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${item.accentGradient} ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    />
                    <div className={`absolute -inset-6 rounded-full blur-2xl opacity-0 transition-opacity duration-300 ${item.iconBg} ${active ? "opacity-40" : "group-hover:opacity-60"}`} />
                    <div className="relative flex items-center justify-center py-3">
                      <div
                        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:-rotate-2 group-hover:scale-[1.03] ${
                          active ? "bg-white/10 border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.45)]" : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className={`absolute inset-0 rounded-2xl ${item.accentGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        <IntentionIcon id={item.id} className={`relative w-5 h-5 ${item.iconFg} drop-shadow-sm`} />
                      </div>
                    </div>
                    {active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.65)] animate-pulse-dot" />
                    )}

                    <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-30 opacity-0 translate-x-[-6px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out">
                      <div className="relative rounded-2xl bg-black/35 backdrop-blur-xl border border-white/15 shadow-[0_18px_50px_rgba(0,0,0,0.6)] px-3 py-2 min-w-[200px]">
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-black/35 border-l border-t border-white/15" />
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-white/65 mt-0.5">{item.helper}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div
                className={`flex-1 min-h-0 ${step === "project" ? "overflow-y-hidden" : "overflow-y-auto"} scrollbar-thin`}
              >
                <div className={`min-h-full px-6 py-6 ${step === "project" ? "h-full flex flex-col" : ""}`}>
                  <div
                    ref={pageMotionRef}
                    className={`${step === "project" ? "flex flex-col flex-1 min-h-0" : ""} will-change-transform`}
                  >
          {intention === "start" && step !== "intention" && (
            <div className="max-w-5xl mb-5 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                {projectName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                    <span className="text-white/50">Repo</span>
                    <span className="font-medium truncate max-w-[200px]">{projectName}</span>
                  </div>
                )}
                {projectPath && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                    <span className="text-white/50">Path</span>
                    <span className="font-mono truncate max-w-[320px]">{projectPath}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                  <span className="text-white/50">Session</span>
                  <span className="font-medium truncate max-w-[180px]">{sessionName}</span>
                </div>
                {model && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                    <span className="text-white/50">Model</span>
                    <span className="font-medium truncate max-w-[180px]">{model}</span>
                  </div>
                )}
                {variants.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                    <span className="text-white/50">Variants</span>
                    <span className="font-medium">{variants.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === "intention" && (
            <div key={intention} className="max-w-5xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1.15fr,0.85fr] gap-6">
	                <div
	                  className={`group relative overflow-hidden rounded-3xl p-6 md:p-7 bg-gradient-to-br ${intentionTheme.heroGradient} border border-white/10 hover:border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.5)]`}
	                >
	                  <div className={`absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl opacity-70 ${intentionTheme.glow}`} />
	                  <IntentionScene intention={intention} theme={intentionTheme} />
	                  <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 p-1 shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
	                    <button
	                      type="button"
	                      onClick={() => {
	                        intentionNavDeltaRef.current = -1;
	                        setIntention(cycleIntention(intention, -1));
	                      }}
	                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors active:scale-95"
	                      aria-label="Previous intention"
	                    >
	                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
	                      </svg>
	                    </button>
	                    <div className="flex items-center gap-1 px-1.5">
	                      {INTENTION_ORDER.map((id) => (
	                        <div
	                          key={id}
	                          className={`w-1.5 h-1.5 rounded-full transition-all ${
	                            id === intention
	                              ? "bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
	                              : "bg-white/25 group-hover:bg-white/40"
	                          }`}
	                        />
	                      ))}
	                    </div>
	                    <button
	                      type="button"
	                      onClick={() => {
	                        intentionNavDeltaRef.current = 1;
	                        setIntention(cycleIntention(intention, 1));
	                      }}
	                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors active:scale-95"
	                      aria-label="Next intention"
	                    >
	                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
	                      </svg>
	                    </button>
	                  </div>
                  <div className="relative max-w-[560px]">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] tracking-[0.12em] uppercase border ${intentionTheme.kickerBg} ${intentionTheme.kickerBorder} ${intentionTheme.kickerText}`}
                    >
                      {intentionMeta?.label}
                    </div>
                    <div className={`mt-5 w-14 h-14 rounded-2xl flex items-center justify-center ${intentionTheme.iconBg} shadow-sm`}>
                      <IntentionIcon id={intention} className={`w-6 h-6 ${intentionTheme.iconFg}`} />
                    </div>
	                    <h2 className="mt-4 text-3xl md:text-4xl font-semibold text-white tracking-tight">
	                      {intentionTheme.welcome}
	                    </h2>
	                    <p className="mt-2 text-base md:text-lg text-white/80 leading-relaxed">
	                      {intentionTheme.subline}
	                    </p>
	                    <div className="mt-5 flex flex-wrap gap-2">
	                      {INTENTION_DETAILS[intention].highlights.map((highlight) => (
	                        <div
	                          key={highlight}
	                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/75 hover:text-white transition-colors"
	                        >
	                          <span className={`w-1.5 h-1.5 rounded-full ${intentionTheme.iconBg}`} />
	                          <span className="leading-none">{highlight}</span>
	                        </div>
	                      ))}
	                    </div>
	                    <p className="mt-3 text-sm text-white/55">
	                      You can switch intentions anytime from the left.
	                    </p>
	                  </div>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen will-change-transform [transform:translate3d(calc(var(--mx)*-6px),calc(var(--my)*6px),0)] bg-[radial-gradient(420px_240px_at_0%_0%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(520px_320px_at_100%_100%,rgba(255,255,255,0.08),transparent_60%)]" />
	                  <div className="relative">
	                    <div className="flex items-center justify-between gap-3">
	                      <div className="min-w-0">
	                        <div className="text-sm font-semibold text-white">{intentionPlanTitle}</div>
	                        <div className="text-xs text-white/55 mt-1">{intentionPlanSubtitle}</div>
	                      </div>
	                      <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-white/70">
	                        <span>←</span>
	                        <span>→</span>
	                        <span className="text-white/50">switch</span>
	                      </div>
	                    </div>
	
	                    <div className="relative mt-5">
	                      <div className="pointer-events-none absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
	                      <div className="space-y-2">
	                        {INTENTION_DETAILS[intention].steps.map((s, idx) => (
	                          <div
	                            key={s}
	                            className="group relative flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
	                          >
	                            <div className="relative w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.42)] transition-shadow">
	                              <div className={`absolute inset-0 rounded-2xl ${intentionTheme.kickerBg} opacity-40`} />
	                              <FlowStepIcon index={idx} className={`relative w-5 h-5 ${intentionTheme.iconFg}`} />
	                            </div>
	                            <div className="pt-1 text-sm text-white/80 leading-snug group-hover:text-white">{s}</div>
	                            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(260px_120px_at_20%_20%,rgba(255,255,255,0.12),transparent_60%)] opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
	                          </div>
	                        ))}
	                      </div>
	                    </div>

	                    {intention !== "start" && (
	                      <div className="mt-4 relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-3">
	                        <div className={`absolute inset-0 bg-gradient-to-br ${intentionTheme.heroGradient} opacity-40`} />
	                        <div className="relative flex items-start gap-3">
	                          <div className={`w-9 h-9 rounded-2xl ${intentionTheme.iconBg} border border-white/15 flex items-center justify-center shadow-sm`}>
	                            <IntentionIcon id={intention} className={`w-4 h-4 ${intentionTheme.iconFg}`} />
	                          </div>
	                          <div className="min-w-0">
	                            <div className="text-xs font-semibold text-white/90">Coming soon</div>
	                            <div className="text-xs text-white/65 mt-0.5">
	                              We’re crafting a specialized flow for <span className="text-white/85">{intentionMeta?.label}</span>. You can proceed with the standard flow for now.
	                            </div>
	                          </div>
	                        </div>
	                      </div>
	                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "project" && (
            <div className="max-w-5xl flex-1 min-h-0 flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white tracking-tight">Choose a repository</h2>
                  <p className="text-sm text-white/60 mt-1">Pick where MindGrid will work for this intention.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSearch((v) => !v)}
                    className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 transition-all"
                  >
                    {showSearch ? "Hide search" : "Search"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFolder}
                    className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 transition-all"
                  >
                    Browse…
                  </button>
                </div>
              </div>

              {(showSearch || searchQuery) && (
                <div className="relative">
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories…"
                    className="w-full pl-14 pr-4 py-3 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/20 transition-all duration-200"
                  />
                </div>
              )}

              <div className="rounded-3xl bg-white/5 border border-white/10 p-3 md:p-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex-1 min-h-0 flex flex-col">
                {loadingRepos ? (
                  <div className="flex-1 min-h-0 p-8 text-center text-white/60 flex flex-col items-center justify-center">
                    <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading repositories…
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex-1 min-h-0 p-8 text-center text-white/60 flex items-center justify-center">
                    {searchQuery ? "No matching repositories" : "No git repositories found"}
                  </div>
                ) : (
                  <>
	                    <div
	                      ref={repoListRef}
	                      className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin"
	                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(showAllRepos ? filteredRepos : filteredRepos.slice(0, 8)).map((repo) => {
                          const selected = selectedRepo?.path === repo.path;
                          return (
                            <button
                              key={repo.path}
                              type="button"
                              data-path={repo.path}
                              onClick={() => handleSelectRepo(repo)}
                              className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                                selected
                                  ? "bg-white/10 border border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-white truncate">{repo.name}</div>
                                <div className="text-xs text-white/50 font-mono truncate">{repo.path}</div>
                              </div>
                              {selected && (
                                <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {!showAllRepos && filteredRepos.length > 8 && (
                      <div className="pt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllRepos(true)}
                          className="px-3 py-1.5 rounded-full text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        >
                          Show all {filteredRepos.length} repositories
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="text-xs text-white/50">
                Showing repositories from <span className="font-mono text-white/70">{PROJECTS_DIRECTORY}</span>
              </div>
            </div>
          )}

          {step === "configure" && (
            <div className="max-w-5xl space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">Session setup</h2>
                <p className="text-sm text-white/60 mt-1">
                  Name your main session and add the first task you want MindGrid to do.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wide text-white/60">Session name</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all"
                      placeholder="Session 1"
                    />
                    <p className="text-xs text-white/50">This creates the primary worktree session.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wide text-white/60">
                      Preferred model <span className="text-white/40 normal-case">(optional)</span>
                    </label>
                    <ModelSelector value={model} onChange={setModel} />
                  </div>
                </div>

                <div className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wide text-white/60">
                      System prompt <span className="text-white/40 normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all resize-y"
                      rows={3}
                      placeholder="Persistent instructions for this session"
                    />
                    <p className="text-xs text-white/50">Persists even after clearing the conversation.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wide text-white/60">
                      Initial prompt / task <span className="text-white/40 normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={initialPrompt}
                      onChange={(e) => setInitialPrompt(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all resize-y"
                      rows={4}
                      placeholder="Describe what you want to accomplish first"
                    />
                    <p className="text-xs text-white/50">Sent once when the chat opens.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Commands (optional)</div>
                    <p className="text-xs text-white/55 mt-1">Helpful build/run shortcuts for previewing this project.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase tracking-wide text-white/60">Build command</label>
                    <input
                      type="text"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-sm placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all"
                      placeholder="npm run build"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase tracking-wide text-white/60">Run command</label>
                    <input
                      type="text"
                      value={runCommand}
                      onChange={(e) => setRunCommand(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-sm placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all"
                      placeholder="npm run dev"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "variants" && (
            <div className="max-w-5xl space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">Variants</h2>
                <p className="text-sm text-white/60 mt-1">
                  Optional parallel sessions to compare ideas, models, or approaches.
                </p>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-5 md:p-6 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Parallel sessions</div>
                    <p className="text-xs text-white/55 mt-1">
                      Each variant starts with your current prompt by default.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-400/20 via-sky-400/15 to-violet-400/20 border border-white/15 text-xs text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] hover:brightness-110 hover:border-white/25 transition-[filter,border-color] flex items-center gap-2"
                  >
                    <span className="text-white text-base leading-none">+</span>
                    Add variant
                  </button>
                </div>

                {variants.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="w-full group rounded-2xl border border-dashed border-white/15 bg-white/5 hover:bg-white/10 transition-colors p-5 flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl shadow-sm group-hover:scale-105 transition-transform">
                      +
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Add your first variant</div>
                      <div className="text-xs text-white/60 mt-1">
                        Great for comparing prompts or models side‑by‑side.
                      </div>
                    </div>
                  </button>
                )}

                {variants.length > 0 && (
                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3 transition-all hover:bg-white/10 hover:border-white/20"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-xs font-semibold text-white/90 shrink-0">
                              {index + 2}
                            </div>
                            <div className="flex-1 space-y-1.5">
                            <label className="block text-xs uppercase tracking-wide text-white/60">Variant name</label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => handleUpdateVariant(variant.id, { name: e.target.value })}
                              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all"
                              placeholder={`Session #${index + 2}`}
                            />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            aria-label="Remove variant"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="w-full md:w-1/2">
                          <label className="block text-xs uppercase tracking-wide text-white/60 mb-1.5">Model</label>
                          <ModelSelector
                            value={variant.model}
                            onChange={(value) => handleUpdateVariant(variant.id, { model: value })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs uppercase tracking-wide text-white/60">Prompt</label>
                          <textarea
                            value={variant.prompt}
                            onChange={(e) => handleUpdateVariant(variant.id, { prompt: e.target.value })}
                            onKeyDown={(e) => e.stopPropagation()}
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/15 transition-all resize-y"
                            placeholder={initialPrompt || "Describe this variant's goal"}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="text-xs text-white/55">
                      {variants.length} variant{variants.length === 1 ? "" : "s"} will be created in addition to the primary session.
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <GitignoreFilesSelector
                  projectPath={projectPath}
                  selectedFiles={filesToCopy}
                  onSelectionChange={setFilesToCopy}
                  disabled={isCreating}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 max-w-5xl rounded-2xl bg-red-500/10 border border-red-400/30 p-3 text-sm text-red-100 shadow-sm">
              {error}
            </div>
          )}
                  </div>
                </div>
              </div>

        {conflictProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-error-muted)] text-[var(--accent-error)] flex items-center justify-center font-semibold">!</div>
                <div>
                  <div className="text-sm font-semibold text-white">Project already exists</div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    There is already a project at this path. You can delete it and create a new one, or choose a different folder.
                  </p>
                </div>
              </div>
              <div className="bg-[var(--bg-hover)]/60 border border-[var(--border-default)] rounded-lg p-3 text-xs text-[var(--text-primary)] font-mono break-all">
                {conflictProject}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConflictProject(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAndReplace}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-error)] hover:bg-[var(--accent-error)]/80 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete and Replace"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between px-6 py-3 h-16 shrink-0 border-t border-white/10 bg-black/10 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs text-white/65 min-w-0">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
          <span className="text-white/55">{currentStepIndex + 1}</span>
          <span className="text-white/35">/</span>
          <span className="text-white/55">{WIZARD_STEPS.length}</span>
        </div>
        <div className="truncate">
          {step === "intention" && "Choose an intention to begin"}
          {step === "project" && !selectedRepo && "Pick a repository to continue"}
          {step === "project" && selectedRepo && `Selected: ${selectedRepo.name}`}
          {step === "configure" && "Name your session and add a first task"}
          {step === "variants" && "Add optional variants or finish"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentStepIndex > 0 && (
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreating}
          >
            <svg className="w-4 h-4 opacity-80 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <button
          onClick={
            step === "intention"
              ? handleNextFromIntention
              : step === "project"
                ? handleNextFromProject
                : step === "configure"
                  ? handleNextFromConfigure
                  : handleSubmit
          }
          disabled={
            isCreating ||
            (step === "project" && !selectedRepo) ||
            (step === "configure" && (!projectPath || !sessionName.trim()))
          }
          className={`group relative px-6 py-2.5 min-w-[160px] text-sm font-semibold rounded-full text-white bg-gradient-to-r ${intentionTheme.ctaGradient} shadow-[0_14px_42px_rgba(0,0,0,0.48)] hover:shadow-[0_22px_64px_rgba(0,0,0,0.65)] active:scale-[0.98] transition-[box-shadow,transform,filter] duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/25 transform-gpu`}
        >
          <span className={`pointer-events-none absolute -inset-1 rounded-full blur-2xl opacity-60 ${intentionTheme.glow}`} />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.42),transparent_58%)] opacity-30" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(220px_90px_at_30%_10%,rgba(255,255,255,0.40),transparent_60%)] opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
          <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
            <span className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-[-16deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] opacity-0 group-hover:opacity-60 group-hover:animate-wizard-cta-shine" />
          </span>
          {isCreating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </>
          ) : (
            step === "variants" ? "Create project" : "Continue"
          )}
        </button>
      </div>
    </div>
        </div>
      </div>
    </div>
  );
}

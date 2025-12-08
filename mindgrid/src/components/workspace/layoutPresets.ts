import { PanelType } from './Panel';

export interface LayoutPreset {
  name: string;
  description: string;
  mode: 'rows' | 'columns';
  rows?: PanelType[][];
  columns?: PanelType[][];
  rowHeights?: number[];
  collapsed: PanelType[];
}

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  default: {
    name: 'Default',
    description: 'Research + Coding | Foundations + Browser | Terminal',
    mode: 'rows',
    rows: [
      ['research', 'coding'],
      ['foundations', 'browser'],
      ['terminal']
    ],
    rowHeights: [50, 35, 15],
    collapsed: ['review', 'git']
  },
  vibe: {
    name: 'Vibe Mode',
    description: 'Coding | Browser - minimal distraction',
    mode: 'columns',
    columns: [
      ['coding'],
      ['browser']
    ],
    collapsed: ['research', 'review', 'git', 'foundations', 'terminal']
  },
  research: {
    name: 'Research Mode',
    description: 'Research | Coding + Browser',
    mode: 'columns',
    columns: [
      ['research'],
      ['coding', 'browser']
    ],
    collapsed: ['review', 'git', 'foundations', 'terminal']
  },
  review: {
    name: 'Review Mode',
    description: 'Coding + Git | Review',
    mode: 'columns',
    columns: [
      ['coding', 'git'],
      ['review']
    ],
    collapsed: ['research', 'foundations', 'browser', 'terminal']
  },
  full: {
    name: 'Full Stack',
    description: 'All panels visible',
    mode: 'rows',
    rows: [
      ['research', 'coding', 'review'],
      ['foundations', 'browser', 'git'],
      ['terminal']
    ],
    rowHeights: [45, 40, 15],
    collapsed: []
  }
};

// Default positions for panels when re-adding
export const PANEL_DEFAULT_POSITIONS: Record<PanelType, { mode: 'rows' | 'columns'; row?: number; column?: number; position: number }> = {
  research: { mode: 'rows', row: 0, position: 0 },
  coding: { mode: 'rows', row: 0, position: 1 },
  review: { mode: 'columns', column: 1, position: 0 },
  git: { mode: 'rows', row: 1, position: 2 },
  foundations: { mode: 'rows', row: 1, position: 0 },
  browser: { mode: 'rows', row: 1, position: 1 },
  terminal: { mode: 'rows', row: 2, position: 0 }
};

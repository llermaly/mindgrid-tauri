# Prototypes overview

The large prototype pages are now split into feature-focused modules so each file stays small for LLM context.

## main-app
- `main-app-data.js`: shared hooks and preset/model data.
- `status-badge.js`: status chip used across cards and tables.
- `project-detail-view.js`: tabbed project detail panes.
- `project-card.js`: dashboard project tiles.
- `project-wizard.js`: preset/session/variant setup steps.
- `project-dialogs.js`: create and edit project dialogs.
- `main-app-app.js`: app state orchestration and render.

## ui-prototype
- `ui-prototype-data.js`: layout context, constants, and dummy session data.
- `ui-core-components.js`: resizers, status badges, and context usage visuals.
- `ui-messaging-panels.js`: panel controls plus message rendering and filters.
- `ui-files-and-agents.js`: file navigator and agent panel.
- `ui-tool-panels.js`: git, foundations, browser, and terminal panels.
- `ui-dialogs.js`: review and compare-model dialogs.
- `ui-session-shell.js`: session cards, overview mode, and flexible rows.
- `ui-prototype-layout.js`: icons, layout wiring, and App mount.

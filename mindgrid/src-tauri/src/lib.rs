mod pty;
mod git;
mod codex;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_sql::{Migration, MigrationKind};

// Global flag to track if we're in dev mode
static DEV_MODE: AtomicBool = AtomicBool::new(false);

/// Check if the application is running in developer mode
#[tauri::command]
fn is_dev_mode() -> bool {
    DEV_MODE.load(Ordering::Relaxed)
}

/// Get the database name based on dev mode
fn get_db_name() -> &'static str {
    if DEV_MODE.load(Ordering::Relaxed) {
        "mindgrid-dev.db"
    } else {
        "mindgrid.db"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Check for dev mode via environment variable
    if std::env::var("MINDGRID_DEV_MODE").is_ok() {
        DEV_MODE.store(true, Ordering::Relaxed);
        println!("[MindGrid] Running in DEVELOPER MODE - using isolated data storage");
    }

    let pty_state = Arc::new(pty::PtyState::new());

    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    cwd TEXT NOT NULL,
                    total_cost REAL DEFAULT 0,
                    model TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tool_name TEXT,
                    tool_input TEXT,
                    tool_result TEXT,
                    is_error INTEGER DEFAULT 0,
                    cost REAL,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
                CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_claude_session_id",
            sql: r#"
                ALTER TABLE sessions ADD COLUMN claude_session_id TEXT;
            "#,
            kind: MigrationKind::Up,
        },
    ];

    // Build database URI based on dev mode
    let db_uri = format!("sqlite:{}", get_db_name());
    println!("[MindGrid] Using database: {}", db_uri);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db_uri, migrations)
                .build(),
        )
        .manage(pty_state)
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::kill_pty,
            pty::get_claude_usage,
            pty::get_codex_usage,
            git::list_git_repos,
            git::validate_git_repository,
            git::get_git_worktrees,
            git::create_workspace_worktree,
            git::remove_workspace_worktree,
            git::get_git_status,
            git::get_git_diff,
            git::git_add_all,
            git::git_commit,
            git::git_checkpoint_commit,
            git::git_has_changes,
            git::git_get_last_commit,
            git::git_push,
            git::git_check_gh_cli,
            git::git_get_pr_info,
            git::git_create_pr,
            git::git_merge_to_main,
            git::git_merge_pr,
            git::open_in_editor,
            codex::codex_list_models,
            codex::run_codex,
            is_dev_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

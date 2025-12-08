mod pty;

use std::sync::Arc;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mindgrid.db", migrations)
                .build(),
        )
        .manage(pty_state)
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::kill_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

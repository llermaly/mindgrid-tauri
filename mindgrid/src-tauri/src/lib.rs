mod pty;
mod git;
mod codex;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_sql::{Migration, MigrationKind};

// Global flag to track if we're in dev mode
static DEV_MODE: AtomicBool = AtomicBool::new(false);

/// Check if the application is running in developer mode
#[tauri::command]
fn is_dev_mode() -> bool {
    DEV_MODE.load(Ordering::Relaxed)
}

/// Get worktree info if running from a git worktree
/// Returns None if running from main repo, Some(worktree_name) if running from a worktree
#[tauri::command]
fn get_worktree_info() -> Option<String> {
    // Get the directory where the binary is running from
    let current_dir = std::env::current_dir().ok()?;
    let path_str = current_dir.to_string_lossy();

    // Check if we're in a .mindgrid/worktrees directory
    if path_str.contains(".mindgrid/worktrees/") {
        // Extract the worktree name from the path
        if let Some(pos) = path_str.find(".mindgrid/worktrees/") {
            let after = &path_str[pos + ".mindgrid/worktrees/".len()..];
            // Get the worktree folder name (up to the next slash or end)
            let worktree_name = after.split('/').next().unwrap_or(after);
            return Some(worktree_name.to_string());
        }
    }
    None
}


/// Get the database name based on dev mode
fn get_db_name() -> &'static str {
    if DEV_MODE.load(Ordering::Relaxed) {
        "mindgrid-dev.db"
    } else {
        "mindgrid.db"
    }
}

/// Get the path to the mindgrid zsh config directory
fn get_zsh_config_dir() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push("mindgrid-zsh");
    path
}

/// Create custom zsh config for mindgrid shell with git-aware prompt
fn setup_zsh_config() {
    let config_dir = get_zsh_config_dir();

    // Create directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&config_dir) {
        eprintln!("[MindGrid] Failed to create zsh config dir: {}", e);
        return;
    }

    // Create .zshrc with custom prompt
    let zshrc_content = r#"# MindGrid Shell Configuration
# Git prompt function - shows branch and dirty state
__git_prompt() {
  local branch=$(git symbolic-ref --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    local dirty=""
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
      dirty="*"
    fi
    echo " %F{yellow}($branch$dirty)%f"
  fi
}

# Enable prompt substitution for git info
setopt PROMPT_SUBST

# Custom prompt: cyan folder name only, yellow git branch with dirty indicator
# %1~ shows only the current directory name, not the full path
PROMPT='%F{cyan}%1~%f$(__git_prompt) %F{white}$%f '

# Enable colors
export CLICOLOR=1
export LSCOLORS=GxFxCxDxBxegedabagaced

# Aliases
alias ls='ls -G'
alias ll='ls -la'
alias la='ls -A'

# Git aliases with color
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline --graph --color'
alias gb='git branch --color'
"#;

    let zshrc_path = config_dir.join(".zshrc");
    if let Err(e) = fs::write(&zshrc_path, zshrc_content) {
        eprintln!("[MindGrid] Failed to write .zshrc: {}", e);
        return;
    }

    // Create .zshenv to prevent loading user's zshenv
    let zshenv_content = "# MindGrid zsh environment - minimal setup\n";
    let zshenv_path = config_dir.join(".zshenv");
    if let Err(e) = fs::write(&zshenv_path, zshenv_content) {
        eprintln!("[MindGrid] Failed to write .zshenv: {}", e);
        return;
    }

    println!("[MindGrid] Created zsh config at {:?}", config_dir);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Check for dev mode via environment variable (must be "1" or "true")
    if let Ok(val) = std::env::var("MINDGRID_DEV_MODE") {
        if val == "1" || val.to_lowercase() == "true" {
            DEV_MODE.store(true, Ordering::Relaxed);
            println!("[MindGrid] Running in DEVELOPER MODE - using isolated data storage");
        }
    }

    // Set up custom zsh configuration for terminal
    setup_zsh_config();

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
            git::get_project_worktrees,
            git::create_workspace_worktree,
            git::remove_workspace_worktree,
            git::get_git_status,
            git::get_git_diff,
            git::get_git_file_diff,
            git::git_add_all,
            git::git_commit,
            git::git_commit_with_signature,
            git::git_checkpoint_commit,
            git::git_has_changes,
            git::git_get_last_commit,
            git::git_push,
            git::git_check_gh_cli,
            git::git_get_pr_info,
            git::git_create_pr,
            git::git_check_merge_conflicts,
            git::git_merge_to_main,
            git::git_merge_pr,
            git::open_in_editor,
            git::save_session_to_worktree,
            git::load_session_from_worktree,
            git::list_gitignored_files,
            git::copy_files_to_worktree,
            codex::codex_list_models,
            codex::run_codex,
            is_dev_mode,
            get_worktree_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

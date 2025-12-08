use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// Helper function to validate if a directory is a git repository
pub fn is_valid_git_repository(path: &Path) -> bool {
    let git_dir = path.join(".git");
    git_dir.exists() && git_dir.is_dir()
}

#[derive(Debug, Serialize)]
pub struct GitRepoInfo {
    pub name: String,
    pub path: String,
}

/// List all git repositories in a directory (non-recursive, just immediate children)
#[tauri::command]
pub async fn list_git_repos(parent_directory: String) -> Result<Vec<GitRepoInfo>, String> {
    let parent = Path::new(&parent_directory);

    if !parent.exists() || !parent.is_dir() {
        return Err(format!("Directory does not exist: {}", parent_directory));
    }

    let mut repos = Vec::new();

    let entries = std::fs::read_dir(parent)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        // Skip hidden directories (except we still check them for .git)
        if let Some(name) = path.file_name() {
            if name.to_string_lossy().starts_with('.') {
                continue;
            }
        }

        // Only check directories
        if !path.is_dir() {
            continue;
        }

        // Check if it's a git repository
        if is_valid_git_repository(&path) {
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());

            repos.push(GitRepoInfo {
                name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    // Sort by name (case-insensitive)
    repos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(repos)
}

#[tauri::command]
pub async fn validate_git_repository(project_path: String) -> Result<bool, String> {
    let path = Path::new(&project_path);

    if !path.exists() || !path.is_dir() {
        return Ok(false);
    }

    Ok(is_valid_git_repository(path))
}

#[tauri::command]
pub async fn get_git_worktrees() -> Result<Vec<HashMap<String, String>>, String> {
    let output = tokio::process::Command::new("git")
        .args(&["worktree", "list", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute git worktree list: {}", e))?;

    if !output.status.success() {
        // Not in a git repository or worktree not supported
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut worktrees = Vec::new();
    let mut current_worktree = HashMap::new();

    for line in stdout.lines() {
        if line.starts_with("worktree ") {
            if !current_worktree.is_empty() {
                worktrees.push(current_worktree);
                current_worktree = HashMap::new();
            }
            current_worktree.insert("path".to_string(), line[9..].to_string());
        } else if line.starts_with("HEAD ") {
            current_worktree.insert("head".to_string(), line[5..].to_string());
        } else if line.starts_with("branch ") {
            current_worktree.insert("branch".to_string(), line[7..].to_string());
        } else if line == "bare" {
            current_worktree.insert("bare".to_string(), "true".to_string());
        } else if line == "detached" {
            current_worktree.insert("detached".to_string(), "true".to_string());
        }
    }

    if !current_worktree.is_empty() {
        worktrees.push(current_worktree);
    }

    Ok(worktrees)
}

#[tauri::command]
pub async fn create_workspace_worktree(
    _app: tauri::AppHandle,
    project_path: String,
    name: String,
) -> Result<String, String> {
    // Ensure valid repo
    let repo = PathBuf::from(&project_path);
    if !is_valid_git_repository(&repo) {
        return Err("Not a valid git repository".to_string());
    }

    // Check if repo has any commits (worktree requires at least one commit)
    let has_commits = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args(["rev-parse", "HEAD"])
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !has_commits {
        // Bootstrap empty repository like Crystal does:
        // 1. Create and checkout main branch
        // 2. Create initial empty commit

        // First, ensure we're on a branch called 'main'
        let checkout_result = tokio::process::Command::new("git")
            .arg("-C")
            .arg(&project_path)
            .args(["checkout", "-b", "main"])
            .output()
            .await;

        // Ignore error if branch already exists
        if let Ok(output) = checkout_result {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Only fail if it's not "branch already exists" error
                if !stderr.contains("already exists") {
                    // Try just checking out main if it exists
                    let _ = tokio::process::Command::new("git")
                        .arg("-C")
                        .arg(&project_path)
                        .args(["checkout", "main"])
                        .output()
                        .await;
                }
            }
        }

        // Create initial empty commit (like Crystal does with --allow-empty)
        let commit_result = tokio::process::Command::new("git")
            .arg("-C")
            .arg(&project_path)
            .args(["commit", "-m", "Initial commit", "--allow-empty"])
            .output()
            .await
            .map_err(|e| format!("Failed to create initial commit: {}", e))?;

        if !commit_result.status.success() {
            return Err(format!(
                "Failed to create initial commit: {}",
                String::from_utf8_lossy(&commit_result.stderr)
            ));
        }
    }

    // Ensure .mindgrid/worktrees directory
    let worktrees_dir = repo.join(".mindgrid").join("worktrees");
    std::fs::create_dir_all(&worktrees_dir)
        .map_err(|e| format!("Failed to create worktrees directory: {}", e))?;

    // Generate branch name
    let branch = format!("mindgrid/{}", name);
    let target_path = worktrees_dir.join(&name);

    // Create worktree on new branch
    // git worktree add -B <branch> <path>
    let status = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args([
            "worktree",
            "add",
            "-B",
            &branch,
            target_path.to_string_lossy().as_ref(),
        ])
        .output()
        .await
        .map_err(|e| format!("git worktree add failed: {}", e))?;

    if !status.status.success() {
        return Err(format!(
            "Failed to add worktree: {}",
            String::from_utf8_lossy(&status.stderr)
        ));
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn remove_workspace_worktree(
    project_path: String,
    worktree_path: String,
) -> Result<(), String> {
    // Remove worktree (prunes checked-out tree)
    let status = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args(["worktree", "remove", "--force", &worktree_path])
        .output()
        .await
        .map_err(|e| format!("git worktree remove failed: {}", e))?;
        
    if !status.status.success() {
        return Err(format!(
            "Failed to remove worktree: {}",
            String::from_utf8_lossy(&status.stderr)
        ));
    }
    Ok(())
}

#[derive(Debug, Serialize, Clone)]
pub struct GitStatus {
    pub state: String,
    pub ahead: Option<i32>,
    pub behind: Option<i32>,
    pub additions: Option<i32>,
    pub deletions: Option<i32>,
    pub files_changed: Option<i32>,
    pub is_ready_to_merge: Option<bool>,
    pub has_uncommitted_changes: Option<bool>,
    pub has_untracked_files: Option<bool>,
    pub current_branch: Option<String>,
    pub main_branch: Option<String>,
    pub is_detached: Option<bool>,
}

#[tauri::command]
pub async fn get_git_status(working_directory: String) -> Result<GitStatus, String> {
    let path = Path::new(&working_directory);

    if !path.exists() || !path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    // Check if it's a git repository (either direct or worktree)
    let git_dir = path.join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }

    // Get current branch using git branch --show-current (like Crystal)
    // This returns empty string for detached HEAD, unlike rev-parse which returns "HEAD"
    let branch_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["branch", "--show-current"])
        .output()
        .await
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    let current_branch = if branch_output.status.success() {
        let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();
        if branch.is_empty() {
            // Detached HEAD state - fall back to short commit hash (like Crystal)
            let hash_output = tokio::process::Command::new("git")
                .arg("-C")
                .arg(&working_directory)
                .args(["rev-parse", "--short", "HEAD"])
                .output()
                .await
                .ok();
            hash_output.and_then(|o| {
                if o.status.success() {
                    Some(format!("({})", String::from_utf8_lossy(&o.stdout).trim()))
                } else {
                    None
                }
            })
        } else {
            Some(branch)
        }
    } else {
        None
    };

    // Check for detached HEAD state
    let is_detached = current_branch.as_ref().map(|b| b.starts_with('(')).unwrap_or(false);

    // Detect main branch (main or master)
    let main_branch = detect_main_branch(&working_directory).await;

    // Get ahead/behind status relative to main branch
    let (ahead, behind) = if let Some(ref main) = main_branch {
        get_ahead_behind(&working_directory, main).await
    } else {
        (None, None)
    };

    // Get working directory status
    let status_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["status", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let status_text = String::from_utf8_lossy(&status_output.stdout);
    let lines: Vec<&str> = status_text.lines().collect();

    let has_uncommitted_changes = lines.iter().any(|l| !l.starts_with("??"));
    let has_untracked_files = lines.iter().any(|l| l.starts_with("??"));
    let files_changed = lines.iter().filter(|l| !l.starts_with("??")).count() as i32;

    // Get diff stats for uncommitted changes
    let (additions, deletions) = get_diff_stats(&working_directory).await;

    // Determine state
    let state = determine_state(
        &lines,
        ahead,
        behind,
        has_uncommitted_changes,
        has_untracked_files,
        &working_directory,
    ).await;

    // Determine if ready to merge
    let is_ready_to_merge = ahead.map(|a| a > 0).unwrap_or(false)
        && !has_uncommitted_changes
        && !has_untracked_files
        && behind.map(|b| b == 0).unwrap_or(true);

    // If detached HEAD, set state to "detached"
    let final_state = if is_detached { "detached".to_string() } else { state };

    Ok(GitStatus {
        state: final_state,
        ahead,
        behind,
        additions: if additions > 0 { Some(additions) } else { None },
        deletions: if deletions > 0 { Some(deletions) } else { None },
        files_changed: if files_changed > 0 { Some(files_changed) } else { None },
        is_ready_to_merge: Some(is_ready_to_merge && !is_detached),
        has_uncommitted_changes: Some(has_uncommitted_changes),
        has_untracked_files: Some(has_untracked_files),
        current_branch,
        main_branch,
        is_detached: Some(is_detached),
    })
}

async fn detect_main_branch(working_directory: &str) -> Option<String> {
    // Try to find main or master branch
    for branch in &["main", "master"] {
        let output = tokio::process::Command::new("git")
            .arg("-C")
            .arg(working_directory)
            .args(["rev-parse", "--verify", branch])
            .output()
            .await
            .ok()?;

        if output.status.success() {
            return Some(branch.to_string());
        }
    }
    None
}

async fn get_ahead_behind(working_directory: &str, main_branch: &str) -> (Option<i32>, Option<i32>) {
    // First try to get ahead/behind relative to upstream tracking branch
    let upstream_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["rev-list", "--left-right", "--count", "@{upstream}...HEAD"])
        .output()
        .await
        .ok();

    if let Some(output) = upstream_output {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = text.trim().split_whitespace().collect();
            if parts.len() == 2 {
                let behind = parts[0].parse::<i32>().ok();
                let ahead = parts[1].parse::<i32>().ok();
                return (ahead, behind);
            }
        }
    }

    // Fall back to comparing against main branch (for branches without upstream)
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["rev-list", "--left-right", "--count", &format!("{}...HEAD", main_branch)])
        .output()
        .await
        .ok();

    if let Some(output) = output {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = text.trim().split_whitespace().collect();
            if parts.len() == 2 {
                let behind = parts[0].parse::<i32>().ok();
                let ahead = parts[1].parse::<i32>().ok();
                return (ahead, behind);
            }
        }
    }
    (None, None)
}

async fn get_diff_stats(working_directory: &str) -> (i32, i32) {
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["diff", "--stat"])
        .output()
        .await
        .ok();

    if let Some(output) = output {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            // Parse the last line which has format: "X files changed, Y insertions(+), Z deletions(-)"
            if let Some(last_line) = text.lines().last() {
                let mut additions = 0;
                let mut deletions = 0;

                if let Some(ins_idx) = last_line.find("insertion") {
                    if let Some(start) = last_line[..ins_idx].rfind(char::is_whitespace) {
                        if let Ok(n) = last_line[start+1..ins_idx].trim().parse::<i32>() {
                            additions = n;
                        }
                    }
                }

                if let Some(del_idx) = last_line.find("deletion") {
                    if let Some(start) = last_line[..del_idx].rfind(char::is_whitespace) {
                        if let Ok(n) = last_line[start+1..del_idx].trim().parse::<i32>() {
                            deletions = n;
                        }
                    }
                }

                return (additions, deletions);
            }
        }
    }
    (0, 0)
}

async fn determine_state(
    _status_lines: &[&str],
    ahead: Option<i32>,
    behind: Option<i32>,
    has_uncommitted: bool,
    has_untracked: bool,
    working_directory: &str,
) -> String {
    // Check for merge conflicts
    let in_conflict = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["ls-files", "--unmerged"])
        .output()
        .await
        .map(|o| o.status.success() && !o.stdout.is_empty())
        .unwrap_or(false);

    if in_conflict {
        return "conflict".to_string();
    }

    // Check diverged state
    if ahead.map(|a| a > 0).unwrap_or(false) && behind.map(|b| b > 0).unwrap_or(false) {
        return "diverged".to_string();
    }

    // Check modified/untracked
    if has_uncommitted {
        return "modified".to_string();
    }

    if has_untracked {
        return "untracked".to_string();
    }

    // Check ahead/behind
    if ahead.map(|a| a > 0).unwrap_or(false) {
        return "ahead".to_string();
    }

    if behind.map(|b| b > 0).unwrap_or(false) {
        return "behind".to_string();
    }

    "clean".to_string()
}

#[derive(Debug, Serialize)]
pub struct GitDiffResult {
    pub files: Vec<GitDiffFile>,
    pub total_additions: i32,
    pub total_deletions: i32,
}

#[derive(Debug, Serialize)]
pub struct GitDiffFile {
    pub path: String,
    pub status: String,
    pub additions: i32,
    pub deletions: i32,
}

#[tauri::command]
pub async fn get_git_diff(working_directory: String) -> Result<GitDiffResult, String> {
    let path = Path::new(&working_directory);

    if !path.exists() || !path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    // Get diff with numstat for counts
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["diff", "--numstat"])
        .output()
        .await
        .map_err(|e| format!("Failed to get diff: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let mut files = Vec::new();
    let mut total_additions = 0;
    let mut total_deletions = 0;

    for line in text.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let adds = parts[0].parse::<i32>().unwrap_or(0);
            let dels = parts[1].parse::<i32>().unwrap_or(0);
            let path = parts[2].to_string();

            total_additions += adds;
            total_deletions += dels;

            files.push(GitDiffFile {
                path,
                status: "modified".to_string(),
                additions: adds,
                deletions: dels,
            });
        }
    }

    // Also get untracked files
    let untracked_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["ls-files", "--others", "--exclude-standard"])
        .output()
        .await
        .map_err(|e| format!("Failed to get untracked: {}", e))?;

    let untracked_text = String::from_utf8_lossy(&untracked_output.stdout);
    for line in untracked_text.lines() {
        if !line.is_empty() {
            files.push(GitDiffFile {
                path: line.to_string(),
                status: "untracked".to_string(),
                additions: 0,
                deletions: 0,
            });
        }
    }

    Ok(GitDiffResult {
        files,
        total_additions,
        total_deletions,
    })
}

#[derive(Debug, Serialize)]
pub struct CommitResult {
    pub success: bool,
    pub commit_hash: Option<String>,
    pub error: Option<String>,
}

/// Stage all changes (git add -A)
#[tauri::command]
pub async fn git_add_all(working_directory: String) -> Result<(), String> {
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["add", "-A"])
        .output()
        .await
        .map_err(|e| format!("git add failed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "git add failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Create a commit with the given message
#[tauri::command]
pub async fn git_commit(
    working_directory: String,
    message: String,
    no_verify: bool,
) -> Result<CommitResult, String> {
    // First check if there are staged changes
    let status_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["diff", "--cached", "--quiet"])
        .output()
        .await
        .map_err(|e| format!("git diff failed: {}", e))?;

    // Exit code 0 means no changes, 1 means changes exist
    if status_output.status.success() {
        return Ok(CommitResult {
            success: false,
            commit_hash: None,
            error: Some("No staged changes to commit".to_string()),
        });
    }

    // Build commit command
    let mut args = vec!["commit", "-m", &message];
    if no_verify {
        args.push("--no-verify");
    }

    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("git commit failed: {}", e))?;

    if !output.status.success() {
        return Ok(CommitResult {
            success: false,
            commit_hash: None,
            error: Some(String::from_utf8_lossy(&output.stderr).to_string()),
        });
    }

    // Get the commit hash
    let hash_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["rev-parse", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("git rev-parse failed: {}", e))?;

    let commit_hash = if hash_output.status.success() {
        Some(String::from_utf8_lossy(&hash_output.stdout).trim().to_string())
    } else {
        None
    };

    Ok(CommitResult {
        success: true,
        commit_hash,
        error: None,
    })
}

/// Create a checkpoint commit (stages all and commits with --no-verify)
#[tauri::command]
pub async fn git_checkpoint_commit(
    working_directory: String,
    message: String,
) -> Result<CommitResult, String> {
    // First check if there are any changes at all
    let status_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["status", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("git status failed: {}", e))?;

    let status_text = String::from_utf8_lossy(&status_output.stdout);
    if status_text.trim().is_empty() {
        return Ok(CommitResult {
            success: false,
            commit_hash: None,
            error: Some("No changes to commit".to_string()),
        });
    }

    // Stage all changes
    git_add_all(working_directory.clone()).await?;

    // Commit with --no-verify to bypass hooks
    git_commit(working_directory, message, true).await
}

/// Check if there are uncommitted changes
#[tauri::command]
pub async fn git_has_changes(working_directory: String) -> Result<bool, String> {
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["status", "--porcelain"])
        .output()
        .await
        .map_err(|e| format!("git status failed: {}", e))?;

    let status_text = String::from_utf8_lossy(&output.stdout);
    Ok(!status_text.trim().is_empty())
}

/// Get the last commit message and hash
#[tauri::command]
pub async fn git_get_last_commit(working_directory: String) -> Result<Option<(String, String)>, String> {
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["log", "-1", "--format=%H|%s"])
        .output()
        .await
        .map_err(|e| format!("git log failed: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let parts: Vec<&str> = trimmed.splitn(2, '|').collect();
    if parts.len() == 2 {
        Ok(Some((parts[0].to_string(), parts[1].to_string())))
    } else {
        Ok(None)
    }
}

#[derive(Debug, Serialize)]
pub struct PushResult {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PullRequestInfo {
    pub number: i32,
    pub title: String,
    pub state: String,
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct CreatePrResult {
    pub success: bool,
    pub url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MergeResult {
    pub success: bool,
    pub message: Option<String>,
    pub error: Option<String>,
}

/// Push the current branch to remote
#[tauri::command]
pub async fn git_push(
    working_directory: String,
    set_upstream: bool,
) -> Result<PushResult, String> {
    // Get current branch name
    let branch_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    if !branch_output.status.success() {
        return Ok(PushResult {
            success: false,
            error: Some("Failed to get current branch".to_string()),
        });
    }

    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Build push command
    let mut args = vec!["push"];
    if set_upstream {
        args.push("-u");
        args.push("origin");
        args.push(&branch);
    }

    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("git push failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        // Check if we need to set upstream
        if stderr.contains("has no upstream branch") {
            // Retry with --set-upstream
            let retry_output = tokio::process::Command::new("git")
                .arg("-C")
                .arg(&working_directory)
                .args(["push", "-u", "origin", &branch])
                .output()
                .await
                .map_err(|e| format!("git push retry failed: {}", e))?;

            if retry_output.status.success() {
                return Ok(PushResult {
                    success: true,
                    error: None,
                });
            }

            return Ok(PushResult {
                success: false,
                error: Some(String::from_utf8_lossy(&retry_output.stderr).to_string()),
            });
        }

        return Ok(PushResult {
            success: false,
            error: Some(stderr),
        });
    }

    Ok(PushResult {
        success: true,
        error: None,
    })
}

/// Find gh CLI path (checks common Homebrew locations)
fn find_gh_path() -> Option<String> {
    // Common paths where gh might be installed
    let paths = [
        "/opt/homebrew/bin/gh",      // Apple Silicon Homebrew
        "/usr/local/bin/gh",          // Intel Homebrew
        "/usr/bin/gh",                // System install
        "gh",                         // In PATH
    ];

    for path in paths {
        if path == "gh" {
            // Check if gh is in PATH
            if std::process::Command::new("which")
                .arg("gh")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                return Some("gh".to_string());
            }
        } else if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    None
}

#[derive(Debug, Serialize)]
pub struct GhCliStatus {
    pub available: bool,
    pub authenticated: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Check if gh CLI is available and authenticated
#[tauri::command]
pub async fn git_check_gh_cli() -> Result<GhCliStatus, String> {
    let gh_path = match find_gh_path() {
        Some(path) => path,
        None => return Ok(GhCliStatus {
            available: false,
            authenticated: false,
            path: None,
            error: Some("gh CLI not found. Install with: brew install gh".to_string()),
        }),
    };

    let output = tokio::process::Command::new(&gh_path)
        .arg("auth")
        .arg("status")
        .output()
        .await;

    match output {
        Ok(result) => {
            if result.status.success() {
                Ok(GhCliStatus {
                    available: true,
                    authenticated: true,
                    path: Some(gh_path),
                    error: None,
                })
            } else {
                Ok(GhCliStatus {
                    available: true,
                    authenticated: false,
                    path: Some(gh_path),
                    error: Some("gh CLI not authenticated. Run: gh auth login".to_string()),
                })
            }
        }
        Err(e) => Ok(GhCliStatus {
            available: true,
            authenticated: false,
            path: Some(gh_path),
            error: Some(format!("Failed to check gh auth: {}", e)),
        }),
    }
}

/// Get PR info for the current branch using gh CLI
#[tauri::command]
pub async fn git_get_pr_info(working_directory: String) -> Result<Option<PullRequestInfo>, String> {
    let gh_path = match find_gh_path() {
        Some(path) => path,
        None => return Ok(None),
    };

    // Get current branch name
    let branch_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    if !branch_output.status.success() {
        return Ok(None);
    }

    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Use gh CLI to get PR info
    let output = tokio::process::Command::new(&gh_path)
        .arg("pr")
        .arg("list")
        .arg("--head")
        .arg(&branch)
        .arg("--json")
        .arg("number,title,state,url")
        .arg("--limit")
        .arg("1")
        .current_dir(&working_directory)
        .output()
        .await
        .map_err(|e| format!("gh pr list failed: {}", e))?;

    if !output.status.success() {
        // gh CLI might not be installed or authenticated
        return Ok(None);
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let trimmed = json_str.trim();

    if trimmed.is_empty() || trimmed == "[]" {
        return Ok(None);
    }

    // Parse JSON array
    let prs: Vec<serde_json::Value> = serde_json::from_str(trimmed)
        .map_err(|e| format!("Failed to parse PR JSON: {}", e))?;

    if let Some(pr) = prs.first() {
        Ok(Some(PullRequestInfo {
            number: pr["number"].as_i64().unwrap_or(0) as i32,
            title: pr["title"].as_str().unwrap_or("").to_string(),
            state: pr["state"].as_str().unwrap_or("").to_lowercase(),
            url: pr["url"].as_str().unwrap_or("").to_string(),
        }))
    } else {
        Ok(None)
    }
}

/// Create a PR for the current branch using gh CLI
#[tauri::command]
pub async fn git_create_pr(
    working_directory: String,
    title: String,
    body: String,
) -> Result<CreatePrResult, String> {
    let gh_path = match find_gh_path() {
        Some(path) => path,
        None => return Ok(CreatePrResult {
            success: false,
            url: None,
            error: Some("gh CLI not found. Install with: brew install gh".to_string()),
        }),
    };

    // Get current branch name
    let branch_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    if !branch_output.status.success() {
        return Ok(CreatePrResult {
            success: false,
            url: None,
            error: Some("Failed to get current branch".to_string()),
        });
    }

    // Create PR using gh CLI
    let output = tokio::process::Command::new(&gh_path)
        .arg("pr")
        .arg("create")
        .arg("--title")
        .arg(&title)
        .arg("--body")
        .arg(&body)
        .current_dir(&working_directory)
        .output()
        .await
        .map_err(|e| format!("gh pr create failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Ok(CreatePrResult {
            success: false,
            url: None,
            error: Some(stderr),
        });
    }

    // gh pr create outputs the PR URL on success
    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Ok(CreatePrResult {
        success: true,
        url: Some(url),
        error: None,
    })
}

/// Merge the current branch to main (squash and merge locally)
#[tauri::command]
pub async fn git_merge_to_main(
    working_directory: String,
    project_path: String,
    commit_message: String,
) -> Result<MergeResult, String> {
    // Get current branch name in worktree
    let branch_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&working_directory)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .await
        .map_err(|e| format!("Failed to get branch: {}", e))?;

    if !branch_output.status.success() {
        return Ok(MergeResult {
            success: false,
            message: None,
            error: Some("Failed to get current branch".to_string()),
        });
    }

    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Detect main branch
    let main_branch = detect_main_branch(&project_path).await.unwrap_or("main".to_string());

    // Switch to main in the project root
    let checkout_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args(["checkout", &main_branch])
        .output()
        .await
        .map_err(|e| format!("git checkout failed: {}", e))?;

    if !checkout_output.status.success() {
        return Ok(MergeResult {
            success: false,
            message: None,
            error: Some(format!(
                "Failed to checkout {}: {}",
                main_branch,
                String::from_utf8_lossy(&checkout_output.stderr)
            )),
        });
    }

    // Merge with squash
    let merge_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args(["merge", "--squash", &branch])
        .output()
        .await
        .map_err(|e| format!("git merge failed: {}", e))?;

    if !merge_output.status.success() {
        // Abort merge and go back
        let _ = tokio::process::Command::new("git")
            .arg("-C")
            .arg(&project_path)
            .args(["merge", "--abort"])
            .output()
            .await;

        return Ok(MergeResult {
            success: false,
            message: None,
            error: Some(format!(
                "Merge failed (conflicts?): {}",
                String::from_utf8_lossy(&merge_output.stderr)
            )),
        });
    }

    // Commit the squashed changes
    let commit_output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(&project_path)
        .args(["commit", "-m", &commit_message])
        .output()
        .await
        .map_err(|e| format!("git commit failed: {}", e))?;

    if !commit_output.status.success() {
        return Ok(MergeResult {
            success: false,
            message: None,
            error: Some(format!(
                "Commit failed: {}",
                String::from_utf8_lossy(&commit_output.stderr)
            )),
        });
    }

    Ok(MergeResult {
        success: true,
        message: Some(format!("Successfully merged {} to {}", branch, main_branch)),
        error: None,
    })
}

/// Merge PR using gh CLI (uses GitHub's merge)
#[tauri::command]
pub async fn git_merge_pr(
    working_directory: String,
    squash: bool,
) -> Result<MergeResult, String> {
    let gh_path = match find_gh_path() {
        Some(path) => path,
        None => return Ok(MergeResult {
            success: false,
            message: None,
            error: Some("gh CLI not found. Install with: brew install gh".to_string()),
        }),
    };

    let mut args = vec!["pr", "merge", "--delete-branch"];

    if squash {
        args.push("--squash");
    } else {
        args.push("--merge");
    }

    let output = tokio::process::Command::new(&gh_path)
        .args(&args)
        .current_dir(&working_directory)
        .output()
        .await
        .map_err(|e| format!("gh pr merge failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Ok(MergeResult {
            success: false,
            message: None,
            error: Some(stderr),
        });
    }

    Ok(MergeResult {
        success: true,
        message: Some("PR merged successfully".to_string()),
        error: None,
    })
}

#[tauri::command]
pub async fn open_in_editor(path: String) -> Result<(), String> {
    // Open VS Code with the given path
    let status = tokio::process::Command::new("code")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open VS Code: {}", e))?;

    // Don't wait for VS Code to close, just check it started
    drop(status);

    Ok(())
}

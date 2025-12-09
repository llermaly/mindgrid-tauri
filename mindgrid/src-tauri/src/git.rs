use serde::Serialize;
use std::io;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[cfg(unix)]
fn create_dir_symlink(src: &Path, dst: &Path) -> io::Result<()> {
    std::os::unix::fs::symlink(src, dst)
}

#[cfg(windows)]
fn create_dir_symlink(src: &Path, dst: &Path) -> io::Result<()> {
    std::os::windows::fs::symlink_dir(src, dst)
}

#[cfg(not(any(unix, windows)))]
fn create_dir_symlink(src: &Path, dst: &Path) -> io::Result<()> {
    let _ = src;
    let _ = dst;
    Err(io::Error::new(
        io::ErrorKind::Other,
        "Symlinks not supported on this platform",
    ))
}

fn link_node_modules_to_external(worktree_name: &str, worktree_path: &Path) {
    let external_base = match std::env::var("MINDGRID_NODE_MODULES_BASE") {
        Ok(path) => PathBuf::from(path),
        Err(_) => return, // Feature not configured
    };

    if let Err(e) = std::fs::create_dir_all(&external_base) {
        eprintln!(
            "[MindGrid] Failed to ensure external node_modules base: {}",
            e
        );
        return;
    }

    let external_target = external_base.join(worktree_name);
    if let Err(e) = std::fs::create_dir_all(&external_target) {
        eprintln!(
            "[MindGrid] Failed to ensure external node_modules path {}: {}",
            external_target.display(),
            e
        );
        return;
    }

    let node_modules_path = worktree_path.join("node_modules");

    if node_modules_path.exists() {
        if let Ok(meta) = std::fs::symlink_metadata(&node_modules_path) {
            if meta.file_type().is_symlink() {
                return; // Already linked
            }
        }
        eprintln!(
            "[MindGrid] node_modules already exists in {}; skipping external link",
            worktree_path.display()
        );
        return;
    }

    if let Err(e) = create_dir_symlink(&external_target, &node_modules_path) {
        eprintln!(
            "[MindGrid] Failed to symlink node_modules to {}: {}",
            external_target.display(),
            e
        );
    }
}

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
    get_git_worktrees_for_path(None).await
}

#[tauri::command]
pub async fn get_project_worktrees(project_path: String) -> Result<Vec<HashMap<String, String>>, String> {
    get_git_worktrees_for_path(Some(&project_path)).await
}

async fn get_git_worktrees_for_path(path: Option<&str>) -> Result<Vec<HashMap<String, String>>, String> {
    let mut cmd = tokio::process::Command::new("git");
    cmd.args(&["worktree", "list", "--porcelain"]);

    if let Some(p) = path {
        cmd.current_dir(p);
    }

    let output = cmd
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

    // Filter to only include mindgrid worktrees
    let mindgrid_worktrees: Vec<_> = worktrees
        .into_iter()
        .filter(|wt| {
            wt.get("path")
                .map(|p| p.contains(".mindgrid/worktrees/"))
                .unwrap_or(false)
        })
        .collect();

    Ok(mindgrid_worktrees)
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

    // Optionally symlink node_modules to external storage to save local disk space
    link_node_modules_to_external(&name, &target_path);

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

#[derive(Debug, Serialize)]
pub struct GitFileDiff {
    pub path: String,
    pub status: String,
    pub patch: String,
    pub old_value: String,
    pub new_value: String,
    pub is_binary: bool,
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

#[tauri::command]
pub async fn get_git_file_diff(
    working_directory: String,
    file_path: String,
    status: Option<String>,
) -> Result<GitFileDiff, String> {
    let path = Path::new(&working_directory);

    if !path.exists() || !path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let status_value = status.unwrap_or_else(|| "modified".to_string());
    let is_untracked = status_value == "untracked";
    let is_deleted = status_value == "deleted";

    // Check if file is binary
    let is_binary = check_if_binary(&working_directory, &file_path).await;

    // Get the patch/diff
    let mut cmd = tokio::process::Command::new("git");
    cmd.arg("-C").arg(&working_directory);

    if is_untracked {
        cmd.args([
            "diff",
            "--no-index",
            "--no-color",
            "--",
            "/dev/null",
            &file_path,
        ]);
    } else {
        cmd.args(["diff", "--no-color", "--", &file_path]);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to get file diff: {}", e))?;

    let patch = String::from_utf8_lossy(&output.stdout).to_string();

    // Get old value (from HEAD)
    let old_value = if is_untracked || is_binary {
        String::new()
    } else {
        get_file_from_head(&working_directory, &file_path).await.unwrap_or_default()
    };

    // Get new value (current working directory content)
    let new_value = if is_deleted || is_binary {
        String::new()
    } else {
        let full_path = path.join(&file_path);
        std::fs::read_to_string(&full_path).unwrap_or_default()
    };

    Ok(GitFileDiff {
        path: file_path,
        status: status_value,
        patch,
        old_value,
        new_value,
        is_binary,
    })
}

/// Check if a file is binary
async fn check_if_binary(working_directory: &str, file_path: &str) -> bool {
    // Use git's diff to check - binary files will have "Binary files" in the output
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["diff", "--numstat", "--", file_path])
        .output()
        .await
        .ok();

    if let Some(output) = output {
        let text = String::from_utf8_lossy(&output.stdout);
        // Binary files show as "-\t-\t" in numstat output
        text.starts_with("-\t-\t")
    } else {
        false
    }
}

/// Get file content from HEAD
async fn get_file_from_head(working_directory: &str, file_path: &str) -> Option<String> {
    let output = tokio::process::Command::new("git")
        .arg("-C")
        .arg(working_directory)
        .args(["show", &format!("HEAD:{}", file_path)])
        .output()
        .await
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
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

/// Save session data to the worktree root (so it can be committed with the worktree branch)
#[tauri::command]
pub async fn save_session_to_worktree(worktree_path: String, session_data: String) -> Result<(), String> {
    let path = Path::new(&worktree_path);

    // Save session data directly in worktree root
    let session_file = path.join(".mindgrid-session.json");
    std::fs::write(&session_file, &session_data)
        .map_err(|e| format!("Failed to write session data: {}", e))?;

    Ok(())
}

/// Load session data from the worktree root
#[tauri::command]
pub async fn load_session_from_worktree(worktree_path: String) -> Result<Option<String>, String> {
    let path = Path::new(&worktree_path);
    let session_file = path.join(".mindgrid-session.json");

    // Also check old location for backwards compatibility
    let old_session_file = path.join(".mindgrid").join("session.json");

    if session_file.exists() {
        let data = std::fs::read_to_string(&session_file)
            .map_err(|e| format!("Failed to read session data: {}", e))?;
        return Ok(Some(data));
    }

    // Fallback to old location
    if old_session_file.exists() {
        let data = std::fs::read_to_string(&old_session_file)
            .map_err(|e| format!("Failed to read session data: {}", e))?;
        return Ok(Some(data));
    }

    Ok(None)
}

#[derive(Debug, Serialize)]
pub struct GitIgnoredFile {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: Option<u64>,
}

/// List files that are gitignored in the project root (useful for .env files, etc.)
#[tauri::command]
pub async fn list_gitignored_files(project_path: String) -> Result<Vec<GitIgnoredFile>, String> {
    let path = Path::new(&project_path);

    if !path.exists() || !path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    // Common patterns for files that should be copied to worktrees
    let common_patterns = [
        ".env",
        ".env.local",
        ".env.development",
        ".env.development.local",
        ".env.production",
        ".env.production.local",
        ".env.test",
        ".env.test.local",
        ".envrc",
        ".tool-versions",
        ".nvmrc",
        ".node-version",
        ".ruby-version",
        ".python-version",
        "credentials.json",
        "secrets.json",
        ".secrets",
        "config.local.json",
        "config.local.yaml",
        "config.local.yml",
    ];

    let mut files = Vec::new();

    // Check for files matching common patterns
    for pattern in common_patterns {
        let file_path = path.join(pattern);
        if file_path.exists() {
            let is_dir = file_path.is_dir();
            let size = if !is_dir {
                std::fs::metadata(&file_path).ok().map(|m| m.len())
            } else {
                None
            };

            // Verify it's actually gitignored (or untracked)
            let is_ignored = tokio::process::Command::new("git")
                .arg("-C")
                .arg(&project_path)
                .args(["check-ignore", "-q", pattern])
                .output()
                .await
                .map(|o| o.status.success())
                .unwrap_or(false);

            // Also check if it's untracked (not in git index)
            let is_untracked = tokio::process::Command::new("git")
                .arg("-C")
                .arg(&project_path)
                .args(["ls-files", "--error-unmatch", pattern])
                .output()
                .await
                .map(|o| !o.status.success())
                .unwrap_or(true);

            if is_ignored || is_untracked {
                files.push(GitIgnoredFile {
                    path: pattern.to_string(),
                    name: pattern.to_string(),
                    is_directory: is_dir,
                    size,
                });
            }
        }
    }

    // Also scan for any .env* files we might have missed
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(".env") && !files.iter().any(|f| f.name == name) {
                let file_path = entry.path();
                let is_dir = file_path.is_dir();
                let size = if !is_dir {
                    std::fs::metadata(&file_path).ok().map(|m| m.len())
                } else {
                    None
                };

                // Check if gitignored
                let is_ignored = tokio::process::Command::new("git")
                    .arg("-C")
                    .arg(&project_path)
                    .args(["check-ignore", "-q", &name])
                    .output()
                    .await
                    .map(|o| o.status.success())
                    .unwrap_or(false);

                let is_untracked = tokio::process::Command::new("git")
                    .arg("-C")
                    .arg(&project_path)
                    .args(["ls-files", "--error-unmatch", &name])
                    .output()
                    .await
                    .map(|o| !o.status.success())
                    .unwrap_or(true);

                if is_ignored || is_untracked {
                    files.push(GitIgnoredFile {
                        path: name.clone(),
                        name,
                        is_directory: is_dir,
                        size,
                    });
                }
            }
        }
    }

    // Sort by name
    files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(files)
}

/// Copy selected gitignored files from project root to worktree
#[tauri::command]
pub async fn copy_files_to_worktree(
    project_path: String,
    worktree_path: String,
    files: Vec<String>,
) -> Result<Vec<String>, String> {
    let source = Path::new(&project_path);
    let dest = Path::new(&worktree_path);

    if !source.exists() || !source.is_dir() {
        return Err("Source directory does not exist".to_string());
    }

    if !dest.exists() || !dest.is_dir() {
        return Err("Destination directory does not exist".to_string());
    }

    let mut copied = Vec::new();
    let mut errors = Vec::new();

    for file in files {
        let source_file = source.join(&file);
        let dest_file = dest.join(&file);

        if !source_file.exists() {
            errors.push(format!("File not found: {}", file));
            continue;
        }

        // Create parent directories if needed
        if let Some(parent) = dest_file.parent() {
            if !parent.exists() {
                if let Err(e) = std::fs::create_dir_all(parent) {
                    errors.push(format!("Failed to create directory for {}: {}", file, e));
                    continue;
                }
            }
        }

        // Copy file or directory
        if source_file.is_dir() {
            if let Err(e) = copy_dir_recursive(&source_file, &dest_file) {
                errors.push(format!("Failed to copy directory {}: {}", file, e));
                continue;
            }
        } else {
            if let Err(e) = std::fs::copy(&source_file, &dest_file) {
                errors.push(format!("Failed to copy {}: {}", file, e));
                continue;
            }
        }

        copied.push(file);
    }

    if !errors.is_empty() {
        eprintln!("Errors copying files: {:?}", errors);
    }

    Ok(copied)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

// New types for enhanced GitHub workflow
#[derive(Debug, Serialize)]
pub struct ConflictCheckResult {
    pub has_conflicts: bool,
    pub conflicting_files: Vec<String>,
    pub base_branch: String,
    pub current_branch: String,
}

#[derive(Debug, Serialize)]
pub struct PrSuggestion {
    pub title: String,
    pub body: String,
    pub commit_count: usize,
}

/// Check for merge conflicts before attempting to merge
#[tauri::command]
pub async fn git_check_merge_conflicts(
    working_directory: String,
) -> Result<ConflictCheckResult, String> {
    let path = Path::new(&working_directory);

    // Get current branch
    let current_branch_output = std::process::Command::new("git")
        .current_dir(path)
        .args(&["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to get current branch: {}", e))?;

    if !current_branch_output.status.success() {
        return Err("Failed to determine current branch".to_string());
    }

    let current_branch = String::from_utf8_lossy(&current_branch_output.stdout)
        .trim()
        .to_string();

    // Detect main branch
    let main_branch = detect_main_branch(path)?;

    // Fetch latest changes
    let _ = std::process::Command::new("git")
        .current_dir(path)
        .args(&["fetch", "origin", &main_branch])
        .output();

    // Use merge-tree to check for conflicts without modifying the working directory
    let merge_tree_output = std::process::Command::new("git")
        .current_dir(path)
        .args(&[
            "merge-tree",
            &format!("origin/{}", main_branch),
            &current_branch,
        ])
        .output()
        .map_err(|e| format!("Failed to check merge conflicts: {}", e))?;

    let output_str = String::from_utf8_lossy(&merge_tree_output.stdout);

    // Parse merge-tree output for conflicts
    let has_conflicts = output_str.contains("<<<<<<< ");
    let mut conflicting_files = Vec::new();

    if has_conflicts {
        // Extract conflicting file paths from merge-tree output
        for line in output_str.lines() {
            if line.starts_with("changed in both") || line.contains("CONFLICT") {
                // Extract filename from conflict marker
                if let Some(filename) = line.split_whitespace().last() {
                    if !conflicting_files.contains(&filename.to_string()) {
                        conflicting_files.push(filename.to_string());
                    }
                }
            }
        }

        // Alternative: use diff to find conflicting files
        if conflicting_files.is_empty() {
            let diff_output = std::process::Command::new("git")
                .current_dir(path)
                .args(&[
                    "diff",
                    "--name-only",
                    &format!("origin/{}", main_branch),
                    &current_branch,
                ])
                .output()
                .map_err(|e| format!("Failed to get diff: {}", e))?;

            let diff_str = String::from_utf8_lossy(&diff_output.stdout);
            for line in diff_str.lines() {
                if !line.trim().is_empty() {
                    conflicting_files.push(line.trim().to_string());
                }
            }
        }
    }

    Ok(ConflictCheckResult {
        has_conflicts,
        conflicting_files,
        base_branch: main_branch,
        current_branch,
    })
}

/// Generate smart PR title and body from commits
#[tauri::command]
pub async fn git_generate_pr_info(
    working_directory: String,
) -> Result<PrSuggestion, String> {
    let path = Path::new(&working_directory);

    // Get main branch
    let main_branch = detect_main_branch(path)?;

    // Get commits that are ahead of main
    let log_output = std::process::Command::new("git")
        .current_dir(path)
        .args(&[
            "log",
            &format!("origin/{}..HEAD", main_branch),
            "--pretty=format:%s",
        ])
        .output()
        .map_err(|e| format!("Failed to get commit log: {}", e))?;

    if !log_output.status.success() {
        return Err("Failed to get commit history".to_string());
    }

    let commits_str = String::from_utf8_lossy(&log_output.stdout);
    let commits: Vec<&str> = commits_str.lines().collect();
    let commit_count = commits.len();

    // Generate title from commits
    let title = if commit_count == 0 {
        "Update from workspace".to_string()
    } else if commit_count == 1 {
        commits[0].to_string()
    } else {
        // Use first commit, truncate if too long
        let first_commit = commits[0];
        if first_commit.len() > 50 {
            format!("{}...", &first_commit[..47])
        } else {
            first_commit.to_string()
        }
    };

    // Generate body with all commits
    let mut body = String::new();
    body.push_str("## Changes\n\n");

    if commit_count > 0 {
        for commit in &commits {
            body.push_str(&format!("- {}\n", commit));
        }
    } else {
        body.push_str("- No commits yet\n");
    }

    body.push_str("\n---\n");
    body.push_str("🔷 Generated with [MindGrid](https://github.com/llermaly/mindgrid-tauri)\n");

    Ok(PrSuggestion {
        title,
        body,
        commit_count,
    })
}

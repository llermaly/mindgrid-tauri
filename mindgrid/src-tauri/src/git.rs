use std::collections::HashMap;
use std::path::{Path, PathBuf};

// Helper function to validate if a directory is a git repository
pub fn is_valid_git_repository(path: &Path) -> bool {
    let git_dir = path.join(".git");
    git_dir.exists() && git_dir.is_dir()
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

    // Ensure .commander directory (or .mindgrid/worktrees?)
    // Commander uses .commander, let's stick to that or use .mindgrid/worktrees to avoid conflict if they share repo?
    // User said "heavily inspired on commander folder you see there".
    // Let's use .mindgrid/worktrees to be safe and cleaner.
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

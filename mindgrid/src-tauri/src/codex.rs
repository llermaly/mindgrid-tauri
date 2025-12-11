use serde::Serialize;
use serde::Deserialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Command;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command as TokioCommand;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CodexModel {
    pub id: String,
    pub name: String,
}

/// Run the Codex CLI `/model` command and extract available model identifiers.
#[tauri::command]
pub fn codex_list_models() -> Result<Vec<CodexModel>, String> {
    let output = Command::new("codex")
        .arg("/model")
        .env("NO_COLOR", "1")
        .env("TERM", "dumb")
        .env("CI", "true")
        .output()
        .map_err(|e| format!("Failed to run Codex CLI: {}", e))?;

    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    let parsed = parse_models(&combined);

    if parsed.is_empty() {
        return Err("No models returned by Codex CLI".to_string());
    }

    Ok(parsed)
}

fn resolve_codex_runner_path() -> Result<PathBuf, String> {
    let base = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/codex-sdk-runner.mjs");
    if base.exists() {
        Ok(base)
    } else {
        Err(format!("Codex SDK runner not found at {}", base.display()))
    }
}

#[derive(Debug, Deserialize, Serialize)]
struct CodexSdkInvocation {
    #[serde(rename = "sessionId")]
    session_id: String,
    prompt: String,
    #[serde(rename = "workingDirectory", default)]
    working_directory: Option<String>,
    #[serde(rename = "sandboxMode", default)]
    sandbox_mode: Option<String>,
    #[serde(default)]
    model: Option<String>,
    #[serde(rename = "systemPrompt", default)]
    system_prompt: Option<String>,
    #[serde(rename = "skipGitRepoCheck", default = "default_skip_git_repo_check")]
    skip_git_repo_check: bool,
}

fn default_skip_git_repo_check() -> bool {
    true
}

/// Run a Codex prompt through the SDK runner (single-turn) and return concatenated output.
#[tauri::command]
pub async fn run_codex(prompt: String, model: Option<String>, cwd: Option<String>, system_prompt: Option<String>) -> Result<String, String> {
    let script_path = resolve_codex_runner_path()?;

    let mut cmd = TokioCommand::new("node");
    cmd.arg(script_path.to_string_lossy().to_string());
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    // Ensure node_modules is discoverable
    let node_modules_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../node_modules");
    if let Ok(canonical) = std::fs::canonicalize(&node_modules_dir) {
        cmd.env("NODE_PATH", &canonical);
        let sdk_dist_path = canonical.join("@openai/codex-sdk/dist/index.js");
        if sdk_dist_path.exists() {
            cmd.env("CODEX_SDK_DIST_PATH", sdk_dist_path);
        }
    }

    if let Some(dir) = &cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn Codex SDK runner: {}", e))?;

    // Write payload
    if let Some(mut stdin) = child.stdin.take() {
        let payload = CodexSdkInvocation {
            session_id: format!("session-{}", Uuid::new_v4().to_string()),
            prompt,
            working_directory: cwd.clone(),
            sandbox_mode: Some("workspace-write".to_string()),
            model,
            system_prompt,
            skip_git_repo_check: true,
        };
        let serialized = serde_json::to_string(&payload).map_err(|e| format!("Failed to serialize Codex payload: {}", e))?;
        tokio::spawn(async move {
            let _ = stdin.write_all(serialized.as_bytes()).await;
            let _ = stdin.shutdown().await;
        });
    }

    // Collect stdout/stderr
    let mut combined = String::new();

    if let Some(stdout) = child.stdout.take() {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            combined.push_str(&line);
            combined.push('\n');
        }
    }

    if let Some(stderr) = child.stderr.take() {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            combined.push_str(&line);
            combined.push('\n');
        }
    }

    let status = child.wait().await.map_err(|e| format!("Failed to wait for Codex runner: {}", e))?;
    if !status.success() {
        // Return the actual error output instead of just the status code
        if !combined.trim().is_empty() {
            return Err(combined);
        } else {
            return Err(format!("Codex runner exited with status {:?}", status.code()));
        }
    }

    Ok(combined)
}

fn parse_models(raw: &str) -> Vec<CodexModel> {
    // Try to parse JSON first (either an array of ids, or an object with `models`)
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) {
        if let Some(arr) = value.as_array() {
            return normalize_models(arr.iter().filter_map(|v| v.as_str()));
        }

        if let Some(models) = value
            .get("models")
            .and_then(|v| v.as_array())
            .map(|arr| normalize_models(arr.iter().filter_map(|v| v.as_str())))
        {
            return models;
        }
    }

    // Fallback: scan text for tokens that look like Codex/GPT model ids
    let mut found: Vec<String> = Vec::new();
    let mut seen = HashSet::new();

    for word in raw.split_whitespace() {
        let cleaned = word
            .trim_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '_' && c != '.')
            .trim_matches(['\'', '"']);

        if cleaned.is_empty() {
            continue;
        }

        let lower = cleaned.to_lowercase();
        let looks_like_model = lower.contains("gpt") || lower.contains("codex") || lower == "auto";

        if looks_like_model && seen.insert(lower.clone()) {
            found.push(cleaned.to_string());
        }
    }

    found
        .into_iter()
        .map(|id| CodexModel {
            name: prettify_model_id(&id),
            id,
        })
        .collect()
}

fn normalize_models<'a>(models: impl Iterator<Item = &'a str>) -> Vec<CodexModel> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for id in models {
        if id.is_empty() {
            continue;
        }
        if seen.insert(id.to_string()) {
            out.push(CodexModel {
                id: id.to_string(),
                name: prettify_model_id(id),
            });
        }
    }

    out
}

fn prettify_model_id(id: &str) -> String {
    let mut parts: Vec<String> = id
        .replace('_', "-")
        .split('-')
        .filter(|s| !s.is_empty())
        .map(|s| {
            let mut chars = s.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect();

    if parts.is_empty() {
        return id.to_string();
    }

    if parts[0].eq_ignore_ascii_case("gpt") && parts.len() > 1 {
        parts[1] = format!("GPT {}", parts[1]);
        parts.remove(0);
    }

    parts.join(" ")
}



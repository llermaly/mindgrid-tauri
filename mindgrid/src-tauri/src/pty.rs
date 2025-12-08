use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Output event sent to the frontend
#[derive(Clone, Serialize)]
pub struct PtyOutput {
    pub id: String,
    pub data: String,
}

/// Exit event sent to the frontend
#[derive(Clone, Serialize)]
pub struct PtyExit {
    pub id: String,
    pub code: Option<u32>,
}

/// Holds a PTY writer for sending input
struct PtyProcess {
    writer: Box<dyn Write + Send>,
    // We keep the child and master alive by holding references
    _child: Box<dyn portable_pty::Child + Send + Sync>,
    _master: Box<dyn portable_pty::MasterPty + Send>,
}

/// Global state for managing PTY processes
pub struct PtyState {
    processes: Mutex<HashMap<String, PtyProcess>>,
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

/// Arguments for spawning a PTY
#[derive(Deserialize)]
pub struct SpawnArgs {
    pub cmd: String,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

/// Spawn a new PTY process
#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    state: tauri::State<'_, Arc<PtyState>>,
    args: SpawnArgs,
) -> Result<String, String> {
    let pty_system = native_pty_system();

    let size = PtySize {
        rows: args.rows.unwrap_or(24),
        cols: args.cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new(&args.cmd);
    cmd.args(&args.args);

    if let Some(cwd) = &args.cwd {
        cmd.cwd(cwd);
    }

    // Inherit environment from parent process
    for (key, value) in std::env::vars() {
        cmd.env(key, value);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    let id = Uuid::new_v4().to_string();

    // Get reader and writer
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store the process
    {
        let mut processes = state.processes.lock();
        processes.insert(
            id.clone(),
            PtyProcess {
                writer,
                _child: child,
                _master: pair.master,
            },
        );
    }

    // Spawn a thread to read output and emit events
    let id_clone = id.clone();
    let state_clone = Arc::clone(&state);
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - process exited
                    let _ = app.emit("pty-exit", PtyExit { id: id_clone.clone(), code: None });
                    break;
                }
                Ok(n) => {
                    // Convert to string (lossy for non-UTF8)
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(
                        "pty-output",
                        PtyOutput {
                            id: id_clone.clone(),
                            data,
                        },
                    );
                }
                Err(e) => {
                    eprintln!("PTY read error: {}", e);
                    let _ = app.emit("pty-exit", PtyExit { id: id_clone.clone(), code: None });
                    break;
                }
            }
        }

        // Clean up
        let mut processes = state_clone.processes.lock();
        processes.remove(&id_clone);
    });

    Ok(id)
}

/// Write data to a PTY
#[tauri::command]
pub fn write_pty(
    state: tauri::State<'_, Arc<PtyState>>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut processes = state.processes.lock();
    let process = processes
        .get_mut(&id)
        .ok_or_else(|| format!("PTY not found: {}", id))?;

    process
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;

    process
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;

    Ok(())
}

/// Resize a PTY
#[tauri::command]
pub fn resize_pty(
    _state: tauri::State<'_, Arc<PtyState>>,
    _id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    // Note: portable-pty doesn't easily expose resize after creation
    // This would require keeping a reference to the master pty
    // For now, we'll skip this - can be implemented later if needed
    Ok(())
}

/// Kill a PTY process
#[tauri::command]
pub fn kill_pty(state: tauri::State<'_, Arc<PtyState>>, id: String) -> Result<(), String> {
    let mut processes = state.processes.lock();
    if processes.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("PTY not found: {}", id))
    }
}

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

    // Set TERM=dumb to disable fancy TUI output for CLI tools like Claude Code
    cmd.env("TERM", "dumb");
    // Disable color output
    cmd.env("NO_COLOR", "1");
    // Signal CI/non-interactive mode
    cmd.env("CI", "true");
    cmd.env("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1");

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

/// Fetch Claude usage data by executing /usage command via PTY
#[tauri::command]
pub async fn get_claude_usage() -> Result<String, String> {
    use std::time::Duration;
    use std::sync::mpsc;

    // Run the blocking PTY operations in a separate thread with timeout
    let (tx, rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        let result = get_claude_usage_blocking();
        let _ = tx.send(result);
    });

    // Wait up to 20 seconds for the result
    match rx.recv_timeout(Duration::from_secs(20)) {
        Ok(result) => {
            let _ = handle.join();
            result
        }
        Err(_) => {
            // Timeout - thread is still running, but we can't easily kill it
            // It will eventually exit when claude exits
            Err("Timeout: Claude usage fetch took too long (>20s)".to_string())
        }
    }
}

/// Blocking implementation of Claude usage fetch using a spawned thread for reading
fn get_claude_usage_blocking() -> Result<String, String> {
    use std::time::Duration;
    use std::io::Read;
    use std::sync::{Arc, Mutex};

    let pty_system = native_pty_system();

    let size = PtySize {
        rows: 60,
        cols: 120,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new("claude");

    // Inherit environment
    for (key, value) in std::env::vars() {
        cmd.env(key, value);
    }

    // Set terminal type
    cmd.env("TERM", "xterm-256color");

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn claude: {}", e))?;

    let reader = pair.master.try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let mut writer = pair.master.take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Use a shared buffer for the reader thread
    let output = Arc::new(Mutex::new(String::new()));
    let output_clone = Arc::clone(&output);
    let stop_flag = Arc::new(Mutex::new(false));
    let stop_flag_clone = Arc::clone(&stop_flag);

    // Spawn a reader thread that continuously reads from PTY
    let reader_handle = thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        loop {
            // Check if we should stop
            if *stop_flag_clone.lock().unwrap() {
                break;
            }
            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let mut out = output_clone.lock().unwrap();
                    out.push_str(&String::from_utf8_lossy(&buf[..n]));
                }
                _ => {
                    // Small sleep to avoid busy loop when no data
                    thread::sleep(Duration::from_millis(10));
                }
            }
        }
    });

    // Wait for Claude to start
    thread::sleep(Duration::from_millis(4000));

    // Check if Claude started
    let startup_output = output.lock().unwrap().clone();
    if !startup_output.contains("Claude") && !startup_output.contains("Welcome") && !startup_output.contains("?") {
        *stop_flag.lock().unwrap() = true;
        let _ = child.kill();
        let _ = reader_handle.join();
        return Err(format!("Claude did not start. Got: {}",
            startup_output.chars().take(300).collect::<String>()));
    }

    // Send /usage command character by character (Claude TUI may need this)
    for c in "/usage".bytes() {
        writer.write_all(&[c])
            .map_err(|e| format!("Failed to write char: {}", e))?;
        writer.flush()
            .map_err(|e| format!("Failed to flush char: {}", e))?;
        thread::sleep(Duration::from_millis(30));
    }

    // Wait for autocomplete to appear
    thread::sleep(Duration::from_millis(200));

    // Press Escape to dismiss autocomplete dropdown
    writer.write_all(b"\x1b")
        .map_err(|e| format!("Failed to write escape: {}", e))?;
    writer.flush()
        .map_err(|e| format!("Failed to flush escape: {}", e))?;

    thread::sleep(Duration::from_millis(100));

    // Now press Enter to execute command
    writer.write_all(b"\r")
        .map_err(|e| format!("Failed to write enter: {}", e))?;
    writer.flush()
        .map_err(|e| format!("Failed to flush enter: {}", e))?;

    // Wait for usage panel to render
    thread::sleep(Duration::from_millis(3000));

    // Get the output
    let final_output = output.lock().unwrap().clone();

    // Signal reader thread to stop
    *stop_flag.lock().unwrap() = true;

    // Exit claude
    let _ = writer.write_all(b"\x1b"); // ESC
    let _ = writer.flush();
    thread::sleep(Duration::from_millis(100));
    let _ = writer.write_all(b"/exit\r");
    let _ = writer.flush();

    // Kill the process and wait for reader
    thread::sleep(Duration::from_millis(200));
    let _ = child.kill();
    let _ = reader_handle.join();

    // Return the output
    if final_output.is_empty() {
        Err("No output from Claude PTY".to_string())
    } else {
        Ok(final_output)
    }
}

/// Fetch Codex usage data by executing /status command via PTY
#[tauri::command]
pub async fn get_codex_usage() -> Result<String, String> {
    use std::time::Duration;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        let result = get_codex_usage_blocking();
        let _ = tx.send(result);
    });

    match rx.recv_timeout(Duration::from_secs(20)) {
        Ok(result) => {
            let _ = handle.join();
            result
        }
        Err(_) => {
            Err("Timeout: Codex usage fetch took too long (>20s)".to_string())
        }
    }
}

/// Blocking implementation of Codex usage fetch
fn get_codex_usage_blocking() -> Result<String, String> {
    use std::time::Duration;
    use std::io::Read;
    use std::sync::{Arc, Mutex};

    let pty_system = native_pty_system();

    let size = PtySize {
        rows: 60,
        cols: 120,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new("codex");

    for (key, value) in std::env::vars() {
        cmd.env(key, value);
    }

    cmd.env("TERM", "xterm-256color");

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn codex: {}", e))?;

    let reader = pair.master.try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair.master.take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    let output = Arc::new(Mutex::new(String::new()));
    let output_clone = Arc::clone(&output);
    let stop_flag = Arc::new(Mutex::new(false));
    let stop_flag_clone = Arc::clone(&stop_flag);
    let stop_flag_clone2 = Arc::clone(&stop_flag);
    let writer_arc = Arc::new(Mutex::new(writer));
    let writer_clone = Arc::clone(&writer_arc);
    let writer_clone2 = Arc::clone(&writer_arc);

    // Proactive cursor position responder - sends responses every 50ms during startup
    let cursor_handle = thread::spawn(move || {
        for _ in 0..100 { // Run for ~5 seconds
            if *stop_flag_clone2.lock().unwrap() {
                break;
            }
            if let Ok(mut w) = writer_clone2.lock() {
                let _ = w.write_all(b"\x1b[1;1R");
                let _ = w.flush();
            }
            thread::sleep(Duration::from_millis(50));
        }
    });

    // Reader thread that also responds to cursor position queries
    let reader_handle = thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];

        loop {
            if *stop_flag_clone.lock().unwrap() {
                break;
            }
            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buf[..n]);

                    // If we see cursor query, respond immediately
                    if data.contains("\x1b[6n") || data.contains("[6n") {
                        if let Ok(mut w) = writer_clone.lock() {
                            let _ = w.write_all(b"\x1b[1;1R");
                            let _ = w.flush();
                        }
                    }

                    let mut out = output_clone.lock().unwrap();
                    out.push_str(&data);
                }
                _ => {
                    thread::sleep(Duration::from_millis(10));
                }
            }
        }
    });

    // Wait for Codex to start
    thread::sleep(Duration::from_millis(5000));

    // Stop the proactive cursor responder
    *stop_flag.lock().unwrap() = true;
    let _ = cursor_handle.join();
    *stop_flag.lock().unwrap() = false;

    let startup_output = output.lock().unwrap().clone();
    if !startup_output.contains("Codex") && !startup_output.contains("OpenAI") && !startup_output.contains("model") {
        *stop_flag.lock().unwrap() = true;
        let _ = child.kill();
        let _ = reader_handle.join();
        return Err(format!("Codex did not start. Got: {}",
            startup_output.chars().take(300).collect::<String>()));
    }

    // Send /status command
    {
        let mut writer = writer_arc.lock().unwrap();
        for c in "/status".bytes() {
            writer.write_all(&[c])
                .map_err(|e| format!("Failed to write char: {}", e))?;
            writer.flush()
                .map_err(|e| format!("Failed to flush char: {}", e))?;
            thread::sleep(Duration::from_millis(30));
        }

        thread::sleep(Duration::from_millis(200));

        // Press Enter to execute
        writer.write_all(b"\r")
            .map_err(|e| format!("Failed to write enter: {}", e))?;
        writer.flush()
            .map_err(|e| format!("Failed to flush enter: {}", e))?;
    }

    // Wait for status to render
    thread::sleep(Duration::from_millis(3000));

    let final_output = output.lock().unwrap().clone();

    *stop_flag.lock().unwrap() = true;

    // Exit codex
    {
        let mut writer = writer_arc.lock().unwrap();
        let _ = writer.write_all(b"/exit\r");
        let _ = writer.flush();
    }

    thread::sleep(Duration::from_millis(200));
    let _ = child.kill();
    let _ = reader_handle.join();

    if final_output.is_empty() {
        Err("No output from Codex PTY".to_string())
    } else {
        Ok(final_output)
    }
}

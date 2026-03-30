use once_cell::sync::Lazy;
use portable_pty::{CommandBuilder, NativePtySystem, PtyPair, PtySize, PtySystem};
use std::io::Write;
use std::sync::Mutex;

static PTY_PAIRS: Lazy<Mutex<std::collections::HashMap<String, PtyPair>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

#[tauri::command]
pub fn create_pty(id: String, shell: Option<String>) -> Result<(), String> {
    let pty_system = NativePtySystem::default();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let cmd = CommandBuilder::new(shell.as_deref().unwrap_or("bash"));
    pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    PTY_PAIRS.lock().unwrap().insert(id, pair);

    Ok(())
}

#[tauri::command]
pub fn write_pty(id: String, data: String) -> Result<(), String> {
    let mut pairs = PTY_PAIRS.lock().unwrap();
    let pair = pairs.get_mut(&id).ok_or("PTY not found")?;

    let mut writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn resize_pty(id: String, cols: u16, rows: u16) -> Result<(), String> {
    let mut pairs = PTY_PAIRS.lock().unwrap();
    let pair = pairs.get_mut(&id).ok_or("PTY not found")?;

    pair.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn destroy_pty(id: String) -> Result<(), String> {
    PTY_PAIRS.lock().unwrap().remove(&id);
    Ok(())
}

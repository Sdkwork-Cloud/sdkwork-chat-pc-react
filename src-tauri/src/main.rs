// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod desktop;
mod pty;

fn main() {
    desktop::build()
        .invoke_handler(tauri::generate_handler![
            commands::set_app_language,
            pty::create_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::destroy_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

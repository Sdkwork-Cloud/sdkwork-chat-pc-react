// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sys_locale::get_locale;
use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

mod commands;
mod pty;

fn resolve_native_label(key: &str) -> &'static str {
    let locale = get_locale().unwrap_or_default();
    let is_chinese = locale.to_lowercase().starts_with("zh");

    match (is_chinese, key) {
        (true, "show") => "显示",
        (true, "quit") => "退出",
        (_, "show") => "Show",
        (_, "quit") => "Quit",
        _ => "",
    }
}

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(SystemTrayMenuItem::new(resolve_native_label("show"), "show"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(SystemTrayMenuItem::new(resolve_native_label("quit"), "quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            pty::create_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::destroy_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

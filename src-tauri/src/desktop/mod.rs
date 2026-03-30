mod plugins;
mod state;
mod tray;
mod window;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
pub(crate) use state::LanguagePreferenceState;
pub(crate) use tray::{normalize_language_preference, refresh_tray_menu};

pub fn build() -> tauri::Builder<tauri::Wry> {
    let system_tray = tray::build_system_tray();

    plugins::register(tauri::Builder::default())
        .manage(state::ShutdownState::default())
        .manage(state::LanguagePreferenceState::default())
        .setup(|app| {
            let app_handle = app.handle();
            state::hydrate_language_preference(&app_handle);
            tray::refresh_tray_menu(&app_handle)?;
            Ok(())
        })
        .system_tray(system_tray)
        .on_window_event(window::handle_window_event)
        .on_system_tray_event(tray::handle_system_tray_event)
}

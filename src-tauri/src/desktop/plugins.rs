use tauri::Builder;

pub(crate) fn register(builder: Builder<tauri::Wry>) -> Builder<tauri::Wry> {
    builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        let _ = super::tray::show_main_window(app);
    }))
}

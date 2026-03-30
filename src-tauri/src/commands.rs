use crate::desktop::{normalize_language_preference, refresh_tray_menu, LanguagePreferenceState};

#[tauri::command]
pub fn set_app_language<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, LanguagePreferenceState>,
    language: String,
) -> Result<(), String> {
    state.set_language_preference(normalize_language_preference(&language).to_string());
    state.persist(&app)?;
    refresh_tray_menu(&app).map_err(|error| error.to_string())
}

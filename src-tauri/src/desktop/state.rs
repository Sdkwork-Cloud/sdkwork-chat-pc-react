use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        RwLock,
    },
};
use tauri::{AppHandle, Manager, Runtime};

const DESKTOP_PREFERENCES_FILENAME: &str = "desktop-preferences.json";
const DEFAULT_LANGUAGE_PREFERENCE: &str = "system";

#[derive(Default)]
pub(crate) struct ShutdownState {
    shutdown_requested: AtomicBool,
}

impl ShutdownState {
    pub(crate) fn request_shutdown(&self) {
        self.shutdown_requested.store(true, Ordering::SeqCst);
    }

    pub(crate) fn is_shutdown_requested(&self) -> bool {
        self.shutdown_requested.load(Ordering::SeqCst)
    }
}

#[derive(Debug)]
pub(crate) struct LanguagePreferenceState {
    language_preference: RwLock<String>,
}

impl Default for LanguagePreferenceState {
    fn default() -> Self {
        Self {
            language_preference: RwLock::new(DEFAULT_LANGUAGE_PREFERENCE.to_string()),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedDesktopPreferences {
    #[serde(default = "default_language_preference")]
    language_preference: String,
}

fn default_language_preference() -> String {
    DEFAULT_LANGUAGE_PREFERENCE.to_string()
}

fn preferences_path<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    app.path_resolver()
        .app_config_dir()
        .map(|directory| directory.join(DESKTOP_PREFERENCES_FILENAME))
}

impl LanguagePreferenceState {
    pub(crate) fn language_preference(&self) -> String {
        self.language_preference
            .read()
            .map(|value| value.clone())
            .unwrap_or_else(|_| DEFAULT_LANGUAGE_PREFERENCE.to_string())
    }

    pub(crate) fn set_language_preference(&self, language_preference: String) {
        if let Ok(mut value) = self.language_preference.write() {
            *value = language_preference;
        }
    }

    pub(crate) fn hydrate<R: Runtime>(&self, app: &AppHandle<R>) {
        let Some(path) = preferences_path(app) else {
            return;
        };

        let Ok(contents) = fs::read_to_string(path) else {
            return;
        };

        let Ok(preferences) = serde_json::from_str::<PersistedDesktopPreferences>(&contents) else {
            return;
        };

        self.set_language_preference(preferences.language_preference);
    }

    pub(crate) fn persist<R: Runtime>(&self, app: &AppHandle<R>) -> Result<(), String> {
        let Some(path) = preferences_path(app) else {
            return Ok(());
        };

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "failed to prepare desktop preferences directory {}: {error}",
                    parent.display()
                )
            })?;
        }

        let payload = PersistedDesktopPreferences {
            language_preference: self.language_preference(),
        };
        let serialized = serde_json::to_string_pretty(&payload)
            .map_err(|error| format!("failed to serialize desktop preferences: {error}"))?;

        fs::write(&path, serialized).map_err(|error| {
            format!(
                "failed to persist desktop preferences {}: {error}",
                path.display()
            )
        })
    }
}

pub(crate) fn hydrate_language_preference<R: Runtime>(app: &AppHandle<R>) {
    let Some(state) = app.try_state::<LanguagePreferenceState>() else {
        return;
    };

    state.hydrate(app);
}

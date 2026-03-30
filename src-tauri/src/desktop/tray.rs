use sys_locale::get_locale;
use tauri::{
    AppHandle, CustomMenuItem, Manager, Runtime, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

use super::{
    state::{LanguagePreferenceState, ShutdownState},
    MAIN_WINDOW_LABEL,
};

const APP_TRAY_TOOLTIP: &str = "OpenChat";
const TRAY_MENU_ITEM_OPEN_WINDOW: &str = "show_window";
const TRAY_MENU_ITEM_QUIT_APP: &str = "quit_app";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TrayAction {
    ShowWindow,
    QuitApp,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TrayLanguage {
    En,
    Zh,
}

#[cfg(test)]
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum TrayMenuEntry {
    Item { id: &'static str, label: String },
    Separator,
}

#[derive(Clone, Copy, Debug)]
struct TrayLabels {
    open_window: &'static str,
    quit_app: &'static str,
}

pub(crate) fn build_system_tray() -> SystemTray {
    let tray = SystemTray::new()
        .with_tooltip(APP_TRAY_TOOLTIP)
        .with_menu(build_tray_menu(resolve_tray_language(
            "system",
            get_locale().as_deref(),
        )));

    #[cfg(target_os = "macos")]
    let tray = tray.with_menu_on_left_click(false);

    tray
}

pub(crate) fn handle_system_tray_event<R: Runtime>(app: &AppHandle<R>, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            let _ = show_main_window(app);
        }
        SystemTrayEvent::MenuItemClick { id, .. } => handle_tray_menu_click(app, id.as_str()),
        _ => {}
    }
}

pub(crate) fn refresh_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let language_preference = app
        .try_state::<LanguagePreferenceState>()
        .map(|state| state.language_preference())
        .unwrap_or_else(|| "system".to_string());

    app.tray_handle()
        .set_menu(build_tray_menu(resolve_tray_language(
            language_preference.as_str(),
            get_locale().as_deref(),
        )))
}

fn handle_tray_menu_click<R: Runtime>(app: &AppHandle<R>, menu_id: &str) {
    let Some(action) = tray_action_for_menu_id(menu_id) else {
        return;
    };

    match action {
        TrayAction::ShowWindow => {
            let _ = show_main_window(app);
        }
        TrayAction::QuitApp => request_explicit_quit(app),
    }
}

pub(crate) fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let window = app
        .get_window(MAIN_WINDOW_LABEL)
        .ok_or(tauri::Error::WebviewNotFound)?;

    let _ = window.unminimize();
    window.show()?;
    let _ = window.set_focus();

    Ok(())
}

pub(crate) fn normalize_language_preference(language: &str) -> &'static str {
    let normalized = language.trim().to_ascii_lowercase();

    if normalized == "system" {
        return "system";
    }

    if normalized.starts_with("zh") {
        return "zh-CN";
    }

    if normalized.starts_with("en") {
        return "en-US";
    }

    "system"
}

pub(crate) fn resolve_tray_language(
    language_preference: &str,
    system_locale: Option<&str>,
) -> TrayLanguage {
    match normalize_language_preference(language_preference) {
        "zh-CN" => TrayLanguage::Zh,
        "en-US" => TrayLanguage::En,
        _ => system_locale_to_tray_language(system_locale),
    }
}

pub(crate) fn tray_action_for_menu_id(menu_id: &str) -> Option<TrayAction> {
    match menu_id {
        TRAY_MENU_ITEM_OPEN_WINDOW => Some(TrayAction::ShowWindow),
        TRAY_MENU_ITEM_QUIT_APP => Some(TrayAction::QuitApp),
        _ => None,
    }
}

#[cfg(test)]
pub(crate) fn build_tray_menu_spec(language: TrayLanguage) -> Vec<TrayMenuEntry> {
    let labels = tray_labels_for(language);

    vec![
        TrayMenuEntry::Item {
            id: TRAY_MENU_ITEM_OPEN_WINDOW,
            label: labels.open_window.to_string(),
        },
        TrayMenuEntry::Separator,
        TrayMenuEntry::Item {
            id: TRAY_MENU_ITEM_QUIT_APP,
            label: labels.quit_app.to_string(),
        },
    ]
}

fn build_tray_menu(language: TrayLanguage) -> SystemTrayMenu {
    let labels = tray_labels_for(language);

    SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            TRAY_MENU_ITEM_OPEN_WINDOW.to_string(),
            labels.open_window,
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new(
            TRAY_MENU_ITEM_QUIT_APP.to_string(),
            labels.quit_app,
        ))
}

fn request_explicit_quit<R: Runtime>(app: &AppHandle<R>) {
    if let Some(state) = app.try_state::<ShutdownState>() {
        state.request_shutdown();
    }

    app.exit(0);
}

fn system_locale_to_tray_language(locale: Option<&str>) -> TrayLanguage {
    if locale
        .unwrap_or_default()
        .to_ascii_lowercase()
        .starts_with("zh")
    {
        TrayLanguage::Zh
    } else {
        TrayLanguage::En
    }
}

fn tray_labels_for(language: TrayLanguage) -> TrayLabels {
    match language {
        TrayLanguage::Zh => TrayLabels {
            open_window: "\u{6253}\u{5f00}\u{7a97}\u{53e3}",
            quit_app: "\u{9000}\u{51fa} OpenChat",
        },
        TrayLanguage::En => TrayLabels {
            open_window: "Open Window",
            quit_app: "Quit OpenChat",
        },
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_tray_menu_spec, resolve_tray_language, tray_action_for_menu_id, TrayAction,
        TrayLanguage, TrayMenuEntry, TRAY_MENU_ITEM_OPEN_WINDOW, TRAY_MENU_ITEM_QUIT_APP,
    };

    #[test]
    fn tray_language_prefers_explicit_app_language() {
        assert_eq!(
            resolve_tray_language("system", Some("zh-CN")),
            TrayLanguage::Zh
        );
        assert_eq!(
            resolve_tray_language("en-US", Some("zh-CN")),
            TrayLanguage::En
        );
        assert_eq!(
            resolve_tray_language("zh-CN", Some("en-US")),
            TrayLanguage::Zh
        );
    }

    #[test]
    fn tray_menu_promotes_open_window_to_the_first_level() {
        let spec = build_tray_menu_spec(TrayLanguage::En);

        assert_eq!(
            spec.first(),
            Some(&TrayMenuEntry::Item {
                id: TRAY_MENU_ITEM_OPEN_WINDOW,
                label: "Open Window".to_string(),
            })
        );
        assert_eq!(
            spec.last(),
            Some(&TrayMenuEntry::Item {
                id: TRAY_MENU_ITEM_QUIT_APP,
                label: "Quit OpenChat".to_string(),
            })
        );
    }

    #[test]
    fn tray_menu_labels_localize_to_simplified_chinese() {
        let spec = build_tray_menu_spec(TrayLanguage::Zh);

        assert_eq!(
            spec.first(),
            Some(&TrayMenuEntry::Item {
                id: TRAY_MENU_ITEM_OPEN_WINDOW,
                label: "\u{6253}\u{5f00}\u{7a97}\u{53e3}".to_string(),
            })
        );
        assert_eq!(
            spec.last(),
            Some(&TrayMenuEntry::Item {
                id: TRAY_MENU_ITEM_QUIT_APP,
                label: "\u{9000}\u{51fa} OpenChat".to_string(),
            })
        );
    }

    #[test]
    fn tray_menu_ids_map_to_expected_actions() {
        assert_eq!(
            tray_action_for_menu_id(TRAY_MENU_ITEM_OPEN_WINDOW),
            Some(TrayAction::ShowWindow)
        );
        assert_eq!(
            tray_action_for_menu_id(TRAY_MENU_ITEM_QUIT_APP),
            Some(TrayAction::QuitApp)
        );
        assert_eq!(tray_action_for_menu_id("missing"), None);
    }
}

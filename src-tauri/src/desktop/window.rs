use tauri::{GlobalWindowEvent, Manager, Runtime, WindowEvent};

use super::{state::ShutdownState, MAIN_WINDOW_LABEL};

pub(crate) fn handle_window_event<R: Runtime>(event: GlobalWindowEvent<R>) {
    let window = event.window();
    if window.label() != MAIN_WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event.event() {
        let app = window.app_handle();
        let Some(state) = app.try_state::<ShutdownState>() else {
            return;
        };

        if should_prevent_main_window_close(state.is_shutdown_requested()) {
            api.prevent_close();
            let _ = window.hide();
        }
    }
}

pub(crate) fn should_prevent_main_window_close(shutdown_requested: bool) -> bool {
    !shutdown_requested
}

#[cfg(test)]
mod tests {
    use super::should_prevent_main_window_close;

    #[test]
    fn close_to_tray_is_disabled_during_explicit_shutdown() {
        assert!(should_prevent_main_window_close(false));
        assert!(!should_prevent_main_window_close(true));
    }
}

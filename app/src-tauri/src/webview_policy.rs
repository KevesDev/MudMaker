//! Browser features of the embedded web view that the application replaces with its own behavior.

use crate::diagnostic_log::{Correlation, DiagnosticInput, Severity};

/// Stable code of the diagnostic written when the web view refused part of the policy.
pub const POLICY_FAILED_CODE: &str = "webview_policy_unapplied";

/// What each browser feature is set to. The interface owns context menus, shortcuts and drops, so the
/// browser's versions are off; only the tools used while developing depend on the build.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WebviewPolicy {
    pub default_context_menus: bool,
    pub accelerator_keys: bool,
    pub dev_tools: bool,
    pub status_bar: bool,
    pub zoom_control: bool,
    pub swipe_navigation: bool,
    pub general_autofill: bool,
    pub password_autosave: bool,
}

/// Development builds keep accelerator keys and developer tools so reload and inspection work while building.
pub fn policy_for_build(development: bool) -> WebviewPolicy {
    WebviewPolicy {
        default_context_menus: false,
        accelerator_keys: development,
        dev_tools: development,
        status_bar: false,
        zoom_control: false,
        swipe_navigation: false,
        general_autofill: false,
        password_autosave: false,
    }
}

/// The diagnostic for settings the web view would not take; the launch id is added when the record is written.
pub fn policy_failure(failures: &[String]) -> DiagnosticInput {
    DiagnosticInput {
        severity: Severity::Warning,
        code: POLICY_FAILED_CODE.to_string(),
        message: "Some browser features could not be turned off in this window.".to_string(),
        detail: Some(failures.join("; ")),
        action_id: None,
        control_id: None,
        check: None,
        attempt: None,
        correlation: Correlation::default(),
    }
}

/// Stable code of the diagnostic written when the window the policy belongs to does not exist.
pub const WINDOW_MISSING_CODE: &str = "webview_window_missing";

/// The diagnostic for a start where no window carries the label the policy is applied to.
pub fn window_missing(label: &str) -> DiagnosticInput {
    DiagnosticInput {
        severity: Severity::Error,
        code: WINDOW_MISSING_CODE.to_string(),
        message: "The main window could not be set up as intended.".to_string(),
        detail: Some(format!("No window is labelled \"{label}\"; browser features were left at their defaults.")),
        action_id: None,
        control_id: None,
        check: None,
        attempt: None,
        correlation: Correlation::default(),
    }
}

#[cfg(windows)]
pub use apply::apply_to_window;

#[cfg(windows)]
mod apply {
    use super::{policy_failure, policy_for_build, WebviewPolicy};
    use crate::diagnostic_log;
    use std::path::PathBuf;
    use tauri::WebviewWindow;
    use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2Settings, ICoreWebView2Settings3, ICoreWebView2Settings4, ICoreWebView2Settings6};
    use windows_core::Interface;

    fn note(failures: &mut Vec<String>, setting: &str, result: windows_core::Result<()>) {
        if let Err(error) = result {
            failures.push(format!("{setting}: {error}"));
        }
    }

    /// Applies every setting it can and returns what failed; a setting the installed runtime lacks must not stop the others.
    fn apply_settings(settings: &ICoreWebView2Settings, policy: WebviewPolicy) -> Vec<String> {
        let mut failures = Vec::new();
        // SAFETY: the settings object belongs to the live web view and these calls run on its owning thread.
        unsafe {
            note(&mut failures, "default context menus", settings.SetAreDefaultContextMenusEnabled(policy.default_context_menus));
            note(&mut failures, "developer tools", settings.SetAreDevToolsEnabled(policy.dev_tools));
            note(&mut failures, "status bar", settings.SetIsStatusBarEnabled(policy.status_bar));
            note(&mut failures, "zoom control", settings.SetIsZoomControlEnabled(policy.zoom_control));
            match settings.cast::<ICoreWebView2Settings3>() {
                Ok(newer) => note(&mut failures, "accelerator keys", newer.SetAreBrowserAcceleratorKeysEnabled(policy.accelerator_keys)),
                Err(error) => failures.push(format!("accelerator keys: {error}")),
            }
            match settings.cast::<ICoreWebView2Settings4>() {
                Ok(newer) => {
                    note(&mut failures, "general autofill", newer.SetIsGeneralAutofillEnabled(policy.general_autofill));
                    note(&mut failures, "password autosave", newer.SetIsPasswordAutosaveEnabled(policy.password_autosave));
                }
                Err(error) => failures.push(format!("autofill and password autosave: {error}")),
            }
            match settings.cast::<ICoreWebView2Settings6>() {
                Ok(newer) => note(&mut failures, "swipe navigation", newer.SetIsSwipeNavigationEnabled(policy.swipe_navigation)),
                Err(error) => failures.push(format!("swipe navigation: {error}")),
            }
        }
        failures
    }

    /// Sets the browser policy on the window's web view. Problems are logged with the launch id and never stop startup.
    pub fn apply_to_window(window: &WebviewWindow, log_directory: Option<PathBuf>, launch_id: String) {
        let policy = policy_for_build(cfg!(debug_assertions));
        let log = move |failures: Vec<String>| {
            let Some(directory) = log_directory else { return };
            let _ = diagnostic_log::record_diagnostic(&directory, &launch_id, policy_failure(&failures), crate::now_ms());
        };
        let reported = log.clone();
        let outcome = window.with_webview(move |webview| {
            let failures = match unsafe { webview.controller().CoreWebView2().and_then(|core| core.Settings()) } {
                Ok(settings) => apply_settings(&settings, policy),
                Err(error) => vec![format!("web view settings: {error}")],
            };
            if !failures.is_empty() {
                log(failures);
            }
        });
        if let Err(error) = outcome {
            reported(vec![format!("web view access: {error}")]);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn release_builds_turn_off_browser_shortcuts_and_developer_tools() {
        let policy = policy_for_build(false);
        assert!(!policy.accelerator_keys);
        assert!(!policy.dev_tools);
    }

    #[test]
    fn development_builds_keep_shortcuts_and_developer_tools() {
        let policy = policy_for_build(true);
        assert!(policy.accelerator_keys);
        assert!(policy.dev_tools);
    }

    #[test]
    fn every_build_turns_off_menus_and_page_chrome() {
        for development in [false, true] {
            let policy = policy_for_build(development);
            assert!(!policy.default_context_menus);
            assert!(!policy.status_bar);
            assert!(!policy.zoom_control);
            assert!(!policy.swipe_navigation);
            assert!(!policy.general_autofill);
            assert!(!policy.password_autosave);
        }
    }

    #[test]
    fn a_missing_window_record_names_the_label_and_is_an_error() {
        let record = window_missing("main");
        assert_eq!(record.code, WINDOW_MISSING_CODE);
        assert_eq!(record.severity, Severity::Error);
        assert!(record.detail.as_deref().is_some_and(|detail| detail.contains("\"main\"")));
    }

    #[test]
    fn a_failure_record_names_the_code_and_lists_every_failed_setting() {
        let record = policy_failure(&["zoom control: denied".to_string(), "status bar: denied".to_string()]);
        assert_eq!(record.code, POLICY_FAILED_CODE);
        assert_eq!(record.severity, Severity::Warning);
        assert_eq!(record.detail.as_deref(), Some("zoom control: denied; status bar: denied"));
    }
}

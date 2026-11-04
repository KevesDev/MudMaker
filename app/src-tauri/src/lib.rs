#[cfg(windows)]
pub mod engine_bridge;
#[cfg(windows)]
pub mod engine_runtime;
pub mod diagnostic_log;
pub mod preferences;
pub mod webview_policy;
#[cfg(test)]
mod test_scratch;

use diagnostic_log::DiagnosticInput;
use serde::Serialize;
use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub build_id: String,
    pub platform: String,
    pub arch: String,
    pub profile: String,
    pub launch_id: String,
}

/// Names one run of the application in every log line it writes.
pub struct LaunchId(pub String);

/// Two process-seeded random values, so each start gets its own 128 bit id. It correlates log lines and is never a secret.
pub fn new_launch_id() -> String {
    let part = || RandomState::new().build_hasher().finish();
    format!("{:016x}{:016x}", part(), part())
}

pub fn collect_app_info(launch_id: &str) -> AppInfo {
    AppInfo {
        name: "MudMaker".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        build_id: env!("MUDMAKER_BUILD_ID").to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        profile: if cfg!(debug_assertions) { "debug" } else { "release" }.to_string(),
        launch_id: launch_id.to_string(),
    }
}

/// Safe app-level diagnostic failure; no raw engine payload is exposed.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
pub struct ShellError { pub code: &'static str, pub message: String }

#[tauri::command]
fn app_info(launch: tauri::State<LaunchId>) -> AppInfo {
    collect_app_info(&launch.0)
}

#[tauri::command]
fn engine_status(bridge:tauri::State<Arc<engine_bridge::Managed>>)->engine_bridge::Status{bridge.status()}
#[tauri::command]
async fn engine_start(app:tauri::AppHandle,bridge:tauri::State<'_,Arc<engine_bridge::Managed>>)->engine_bridge::Result<engine_bridge::Status>{
 let locator=if cfg!(debug_assertions){engine_runtime::Locator::Development}else{engine_runtime::Locator::Resources(app.path().resource_dir().map_err(|_|engine_bridge::Failure::new("engine_resources"))?)};
 match bridge.inner().begin(locator)?{engine_bridge::Start::Ready(status)=>Ok(status),engine_bridge::Start::Launch(ticket)=>tauri::async_runtime::spawn_blocking(move||ticket.run()).await.map_err(|_|engine_bridge::Failure::new("engine_start_worker"))?}
}
#[tauri::command]
async fn engine_request(bridge:tauri::State<'_,Arc<engine_bridge::Managed>>,request:engine_bridge::RequestDto)->engine_bridge::Result<engine_bridge::Response>{
 let admitted=bridge.admit(request)?;tauri::async_runtime::spawn_blocking(move||admitted.wait()).await.map_err(|_|engine_bridge::Failure::new("engine_request_worker"))?
}

/// Milliseconds since the Unix epoch, or None when the system clock is set before it.
fn now_ms() -> Option<u64> {
    let elapsed = SystemTime::now().duration_since(UNIX_EPOCH).ok()?;
    u64::try_from(elapsed.as_millis()).ok()
}

/// Appends one interface diagnostic to the log in the app data folder. A failure is returned for the
/// interface to note; it never stops the application.
#[tauri::command]
fn write_diagnostic(app: tauri::AppHandle, launch: tauri::State<LaunchId>, record: DiagnosticInput) -> Result<(), ShellError> {
    let unwritable = |detail: String| ShellError {
        code: "diagnostic_log_unwritable",
        message: format!("The diagnostic log could not be written. {detail}"),
    };
    let directory = app.path().app_data_dir().map_err(|error| unwritable(error.to_string()))?;
    diagnostic_log::record_diagnostic(&directory, &launch.0, record, now_ms()).map_err(|error| unwritable(error.to_string()))
}

fn app_data_directory(app: &tauri::AppHandle, code: &'static str) -> Result<PathBuf, ShellError> {
    app.path().app_data_dir().map_err(|error| ShellError { code, message: format!("The settings folder could not be found. {error}") })
}

/// The saved settings document, or null when there is none or it could not be used; a damaged file is set aside and logged.
#[tauri::command]
fn read_preferences(app: tauri::AppHandle, launch: tauri::State<LaunchId>) -> Result<Option<serde_json::Value>, ShellError> {
    let directory = app_data_directory(&app, "preferences_unreadable")?;
    Ok(preferences::load_and_report(&directory, &launch.0, now_ms(), preferences::MAX_PREFERENCES_BYTES))
}

/// Replaces the saved settings document atomically. A refusal or failure is returned for the interface to log.
#[tauri::command]
fn write_preferences(app: tauri::AppHandle, document: serde_json::Value) -> Result<(), ShellError> {
    let directory = app_data_directory(&app, "preferences_unwritable")?;
    preferences::save(&directory, &document, preferences::MAX_PREFERENCES_BYTES)
        .map_err(|error| ShellError { code: error.code, message: format!("Settings could not be saved. {}", error.detail) })
}

#[tauri::command]
async fn quit_app(app: tauri::AppHandle,bridge:tauri::State<'_,Arc<engine_bridge::Managed>>) -> Result<(),ShellError> {
    let bridge=bridge.inner().clone();
    let _=tauri::async_runtime::spawn_blocking(move||bridge.shutdown(engine_runtime::ShutdownMode::Graceful)).await;
    app.exit(0);
    Ok(())
}

/// Label Tauri gives the one window declared in tauri.conf.json.
const MAIN_WINDOW_LABEL: &str = "main";

pub fn run() {
    tauri::Builder::default()
        .manage(LaunchId(new_launch_id()))
        .manage(Arc::new(engine_bridge::Managed::default()))
        .setup(|app| {
            let launch_id = app.state::<LaunchId>().0.clone();
            match app.get_webview_window(MAIN_WINDOW_LABEL) {
                #[cfg(windows)]
                Some(window) => webview_policy::apply_to_window(&window, app.path().app_data_dir().ok(), launch_id),
                #[cfg(not(windows))]
                Some(_) => {}
                None => {
                    if let Ok(directory) = app.path().app_data_dir() {
                        let _ = diagnostic_log::record_diagnostic(&directory, &launch_id, webview_policy::window_missing(MAIN_WINDOW_LABEL), now_ms());
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_info, engine_status, engine_start, engine_request, write_diagnostic, read_preferences, write_preferences, quit_app])
        .build(tauri::generate_context!())
        .expect("MudMaker could not start the application window")
        .run(|app,event|{if matches!(event,tauri::RunEvent::Exit){app.state::<Arc<engine_bridge::Managed>>().shutdown(engine_runtime::ShutdownMode::Immediate);}});
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_reports_package_version_build_id_and_the_launch_id() {
        let info = collect_app_info("launch-7");
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert!(!info.build_id.is_empty());
        assert_eq!(info.name, "MudMaker");
        assert_eq!(info.launch_id, "launch-7");
    }

    #[test]
    fn new_launch_id_gives_32_hex_digits_and_two_calls_in_one_process_differ() {
        let first = new_launch_id();
        let second = new_launch_id();
        assert_eq!(first.len(), 32);
        assert!(first.chars().all(|digit| digit.is_ascii_hexdigit()));
        assert_ne!(first, second);
    }

    #[test]
    fn now_ms_reads_a_clock_past_the_year_2020() {
        /// 2020-01-01T00:00:00Z in milliseconds: a clock reading before it means the source is wrong.
        const YEAR_2020_MS: u64 = 1_577_836_800_000;
        assert!(now_ms().expect("the clock can be read") > YEAR_2020_MS);
    }

}

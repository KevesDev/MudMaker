pub mod diagnostic_log;
pub mod preferences;
pub mod webview_policy;
#[cfg(test)]
mod test_scratch;

use diagnostic_log::DiagnosticInput;
use serde::Serialize;
use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};
use std::path::{Path, PathBuf};
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

/// File name, without the platform suffix, of the game engine sidecar. The location is a placeholder
/// beside the application binary until the engine is packaged; this is the only place that names it.
const ENGINE_SIDECAR_STEM: &str = "mudmaker-engine";

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
pub struct EngineStatus {
    pub installed: bool,
    pub reason: String,
}

/// Structured failure the interface can show and log: a stable code plus a safe sentence.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
pub struct ShellError {
    pub code: &'static str,
    pub message: String,
}

fn engine_sidecar_path(directory: &Path) -> PathBuf {
    directory.join(format!("{ENGINE_SIDECAR_STEM}{}", std::env::consts::EXE_SUFFIX))
}

/// Reads the disk: the engine counts as installed only when the sidecar is a regular file.
pub fn check_engine(directory: &Path) -> EngineStatus {
    if engine_sidecar_path(directory).is_file() {
        EngineStatus {
            installed: true,
            reason: "The game engine is installed.".to_string(),
        }
    } else {
        EngineStatus {
            installed: false,
            reason: "The game engine is not installed in this build.".to_string(),
        }
    }
}

fn application_directory() -> Result<PathBuf, ShellError> {
    let unavailable = |detail: String| ShellError {
        code: "engine_status_unavailable",
        message: format!("The location of MudMaker could not be found. {detail}"),
    };
    let executable = std::env::current_exe().map_err(|error| unavailable(error.to_string()))?;
    executable
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| unavailable("The application has no folder.".to_string()))
}

#[tauri::command]
fn app_info(launch: tauri::State<LaunchId>) -> AppInfo {
    collect_app_info(&launch.0)
}

#[tauri::command]
fn engine_status() -> Result<EngineStatus, ShellError> {
    Ok(check_engine(&application_directory()?))
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
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Label Tauri gives the one window declared in tauri.conf.json.
const MAIN_WINDOW_LABEL: &str = "main";

pub fn run() {
    tauri::Builder::default()
        .manage(LaunchId(new_launch_id()))
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
        .invoke_handler(tauri::generate_handler![app_info, engine_status, write_diagnostic, read_preferences, write_preferences, quit_app])
        .run(tauri::generate_context!())
        .expect("MudMaker could not start the application window");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_scratch::Scratch;
    use std::fs;

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

    #[test]
    fn engine_status_reports_installed_when_the_sidecar_file_exists() {
        let scratch = Scratch::new("engine-found");
        fs::write(engine_sidecar_path(&scratch.0), b"engine").expect("the sidecar can be written");
        let status = check_engine(&scratch.0);
        assert!(status.installed);
        assert_eq!(status.reason, "The game engine is installed.");
    }

    #[test]
    fn engine_status_reports_not_installed_when_the_folder_has_no_sidecar() {
        let scratch = Scratch::new("engine-missing");
        fs::write(scratch.0.join("something-else"), b"x").expect("a neighbouring file can be written");
        let status = check_engine(&scratch.0);
        assert!(!status.installed);
        assert_eq!(status.reason, "The game engine is not installed in this build.");
    }

    #[test]
    fn engine_status_does_not_count_a_folder_with_the_sidecar_name() {
        let scratch = Scratch::new("engine-folder");
        fs::create_dir(engine_sidecar_path(&scratch.0)).expect("the folder can be created");
        assert!(!check_engine(&scratch.0).installed);
    }
}

use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub build_id: String,
    pub platform: String,
    pub arch: String,
    pub profile: String,
}

pub fn collect_app_info() -> AppInfo {
    AppInfo {
        name: "MudMaker".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        build_id: env!("MUDMAKER_BUILD_ID").to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        profile: if cfg!(debug_assertions) { "debug" } else { "release" }.to_string(),
    }
}

#[tauri::command]
fn app_info() -> AppInfo {
    collect_app_info()
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info, quit_app])
        .run(tauri::generate_context!())
        .expect("MudMaker could not start the application window");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_reports_package_version_and_build_id() {
        let info = collect_app_info();
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert!(!info.build_id.is_empty());
        assert_eq!(info.name, "MudMaker");
    }
}

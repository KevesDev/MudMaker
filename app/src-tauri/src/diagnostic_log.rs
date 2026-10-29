use serde::{Deserialize, Serialize};
use std::fs::{self, DirBuilder, OpenOptions};
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Mutex, PoisonError};

/// Owner-only access on Unix. On Windows the folder inherits the per-user application data ACL, which already
/// limits it to the signed-in user, so no mode is set there.
#[cfg(unix)]
const DIRECTORY_MODE: u32 = 0o700;
#[cfg(unix)]
const FILE_MODE: u32 = 0o600;

/// Serializes writers in this process: a rotation removes and renames files, and another writer in the middle of
/// that would lose its record. One write is a single small file operation, so waiting here is bounded.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

pub const LOG_FILE_NAME: &str = "diagnostics.jsonl";
pub const PREVIOUS_LOG_FILE_NAME: &str = "diagnostics.previous.jsonl";
/// Size at which the live log is moved aside. With one previous file the log never holds more than twice this.
pub const MAX_LOG_BYTES: u64 = 512 * 1024;
/// Longest text kept for any one field, so a runaway message cannot fill the log.
pub const MAX_FIELD_CHARS: usize = 2000;
const TRUNCATION_MARK: &str = " [shortened]";

#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// Identifiers that let one request be followed across the interface log and the shell log.
#[derive(Deserialize, Serialize, Default, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Correlation {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub launch_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub world_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

/// One interface diagnostic as the interface sends it. Messages are safe sentences; `detail` holds raw technical text.
#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticInput {
    pub severity: Severity,
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub control_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub check: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attempt: Option<u32>,
    #[serde(default)]
    pub correlation: Correlation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoggedRecord<'a> {
    /// Null when the system clock could not be read, so a record never claims a time it does not have.
    time_ms: Option<u64>,
    #[serde(flatten)]
    record: &'a DiagnosticInput,
}

fn bounded(text: &str) -> String {
    if text.chars().count() <= MAX_FIELD_CHARS {
        return text.to_string();
    }
    let kept: String = text.chars().take(MAX_FIELD_CHARS).collect();
    format!("{kept}{TRUNCATION_MARK}")
}

fn bounded_option(text: &Option<String>) -> Option<String> {
    text.as_deref().map(bounded)
}

impl DiagnosticInput {
    /// The same record with every free text field shortened to the limit.
    pub fn bounded(&self) -> DiagnosticInput {
        DiagnosticInput {
            severity: self.severity,
            code: bounded(&self.code),
            message: bounded(&self.message),
            detail: bounded_option(&self.detail),
            action_id: bounded_option(&self.action_id),
            control_id: bounded_option(&self.control_id),
            check: bounded_option(&self.check),
            attempt: self.attempt,
            correlation: Correlation {
                launch_id: bounded_option(&self.correlation.launch_id),
                world_id: bounded_option(&self.correlation.world_id),
                session_id: bounded_option(&self.correlation.session_id),
                request_id: bounded_option(&self.correlation.request_id),
            },
        }
    }
}

fn size_of(path: &Path) -> io::Result<u64> {
    match fs::metadata(path) {
        Ok(metadata) => Ok(metadata.len()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(0),
        Err(error) => Err(error),
    }
}

/// Moves the live log aside, replacing the previous one, so the oldest records are the ones dropped.
fn rotate(directory: &Path) -> io::Result<()> {
    let previous = directory.join(PREVIOUS_LOG_FILE_NAME);
    if previous.exists() {
        fs::remove_file(&previous)?;
    }
    fs::rename(directory.join(LOG_FILE_NAME), previous)
}

fn create_directory(directory: &Path) -> io::Result<()> {
    let mut builder = DirBuilder::new();
    builder.recursive(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(DIRECTORY_MODE);
    }
    builder.create(directory)
}

fn open_for_append(path: &Path) -> io::Result<fs::File> {
    let mut options = OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(FILE_MODE);
    }
    options.open(path)
}

/// Appends the record as one JSON line, rotating first when the line would take the live log past `max_bytes`.
pub fn append(directory: &Path, record: &DiagnosticInput, time_ms: Option<u64>, max_bytes: u64) -> io::Result<()> {
    let mut line = serde_json::to_string(&LoggedRecord { time_ms, record: &record.bounded() }).map_err(io::Error::other)?;
    line.push('\n');
    let _writer = WRITE_LOCK.lock().unwrap_or_else(PoisonError::into_inner);
    create_directory(directory)?;
    let live = directory.join(LOG_FILE_NAME);
    let size = size_of(&live)?;
    if size > 0 && size + line.len() as u64 > max_bytes {
        rotate(directory)?;
    }
    open_for_append(&live)?.write_all(line.as_bytes())
}

/// What the shell command does with an interface record: it names the launch when the interface could not, then appends.
pub fn record_diagnostic(directory: &Path, launch_id: &str, mut record: DiagnosticInput, time_ms: Option<u64>) -> io::Result<()> {
    if record.correlation.launch_id.is_none() {
        record.correlation.launch_id = Some(launch_id.to_string());
    }
    append(directory, &record, time_ms, MAX_LOG_BYTES)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_scratch::Scratch;

    fn record(code: &str, message: &str) -> DiagnosticInput {
        DiagnosticInput {
            severity: Severity::Info,
            code: code.to_string(),
            message: message.to_string(),
            detail: None,
            action_id: Some("ui.nav.create".to_string()),
            control_id: None,
            check: None,
            attempt: None,
            correlation: Correlation { launch_id: Some("launch-1".to_string()), ..Correlation::default() },
        }
    }

    fn lines(path: &Path) -> Vec<String> {
        fs::read_to_string(path).expect("the log can be read").lines().map(str::to_string).collect()
    }

    #[test]
    fn diagnostic_log_append_writes_one_json_line_per_record_with_time_severity_and_correlation() {
        let scratch = Scratch::new("log-append");
        append(&scratch.0, &record("first", "One."), Some(1_000), MAX_LOG_BYTES).expect("the first record is written");
        append(&scratch.0, &record("second", "Two."), Some(2_000), MAX_LOG_BYTES).expect("the second record is written");
        let written = lines(&scratch.0.join(LOG_FILE_NAME));
        assert_eq!(written.len(), 2);
        let first: serde_json::Value = serde_json::from_str(&written[0]).expect("a line is JSON");
        assert_eq!(first["timeMs"], 1_000);
        assert_eq!(first["severity"], "info");
        assert_eq!(first["code"], "first");
        assert_eq!(first["actionId"], "ui.nav.create");
        assert_eq!(first["correlation"]["launchId"], "launch-1");
        assert!(first.get("detail").is_none());
        let second: serde_json::Value = serde_json::from_str(&written[1]).expect("a line is JSON");
        assert_eq!(second["code"], "second");
    }

    #[test]
    fn diagnostic_log_keeps_a_message_with_line_breaks_on_one_line() {
        let scratch = Scratch::new("log-newline");
        append(&scratch.0, &record("multi", "first\nsecond\r\nthird"), Some(1), MAX_LOG_BYTES).expect("the record is written");
        let written = lines(&scratch.0.join(LOG_FILE_NAME));
        assert_eq!(written.len(), 1);
        let parsed: serde_json::Value = serde_json::from_str(&written[0]).expect("the line is JSON");
        assert_eq!(parsed["message"], "first\nsecond\r\nthird");
    }

    #[test]
    fn diagnostic_log_accepts_a_record_shaped_as_the_interface_sends_it() {
        let sent = r#"{"severity":"warning","code":"c","message":"m","actionId":null,"controlId":null,"correlation":{}}"#;
        let parsed: DiagnosticInput = serde_json::from_str(sent).expect("the interface shape parses");
        assert_eq!(parsed.severity, Severity::Warning);
        assert_eq!(parsed.action_id, None);
        assert_eq!(parsed.correlation, Correlation::default());
    }

    #[test]
    fn diagnostic_log_shortens_a_field_that_passes_the_limit() {
        let scratch = Scratch::new("log-long");
        let long = "x".repeat(MAX_FIELD_CHARS + 500);
        append(&scratch.0, &record("long", &long), Some(1), MAX_LOG_BYTES).expect("the record is written");
        let parsed: serde_json::Value = serde_json::from_str(&lines(&scratch.0.join(LOG_FILE_NAME))[0]).expect("the line is JSON");
        let message = parsed["message"].as_str().expect("a message");
        assert_eq!(message.chars().count(), MAX_FIELD_CHARS + TRUNCATION_MARK.chars().count());
        assert!(message.ends_with(TRUNCATION_MARK));
    }

    #[test]
    fn diagnostic_log_rotates_at_the_limit_keeping_one_previous_file_and_the_newest_record() {
        let scratch = Scratch::new("log-rotate");
        let limit = 600;
        for number in 0..40 {
            append(&scratch.0, &record(&format!("record-{number}"), "Rotation test."), Some(number), limit).expect("the record is written");
        }
        let live = scratch.0.join(LOG_FILE_NAME);
        let previous = scratch.0.join(PREVIOUS_LOG_FILE_NAME);
        assert!(fs::metadata(&live).expect("live log").len() <= limit);
        assert!(fs::metadata(&previous).expect("previous log").len() <= limit);
        let names: Vec<_> = fs::read_dir(&scratch.0).expect("the folder lists").map(|entry| entry.expect("an entry").file_name()).collect();
        assert_eq!(names.len(), 2);
        let newest = lines(&live).last().cloned().expect("the live log has a line");
        assert!(newest.contains("record-39"));
        assert!(lines(&live).len() + lines(&previous).len() < 40, "the oldest records must have been dropped");
    }

    #[test]
    fn diagnostic_log_reports_an_error_instead_of_panicking_when_the_folder_cannot_be_made() {
        let scratch = Scratch::new("log-blocked-folder");
        let blocker = scratch.0.join("not-a-folder");
        fs::write(&blocker, b"file").expect("the blocking file can be written");
        assert!(append(&blocker.join("logs"), &record("blocked", "Blocked."), Some(1), MAX_LOG_BYTES).is_err());
    }

    #[test]
    fn diagnostic_log_reports_an_error_when_the_live_log_cannot_be_opened() {
        let scratch = Scratch::new("log-blocked-file");
        fs::create_dir(scratch.0.join(LOG_FILE_NAME)).expect("a folder can take the log's name");
        assert!(append(&scratch.0, &record("blocked", "Blocked."), Some(1), MAX_LOG_BYTES).is_err());
    }

    #[test]
    fn diagnostic_log_records_an_unreadable_clock_as_null_and_not_as_time_zero() {
        let scratch = Scratch::new("log-no-clock");
        append(&scratch.0, &record("untimed", "No clock."), None, MAX_LOG_BYTES).expect("the record is written");
        let parsed: serde_json::Value = serde_json::from_str(&lines(&scratch.0.join(LOG_FILE_NAME))[0]).expect("the line is JSON");
        assert!(parsed["timeMs"].is_null());
    }

    #[test]
    fn record_diagnostic_names_the_launch_when_the_interface_did_not() {
        let scratch = Scratch::new("log-stamp");
        let mut bare = record("bare", "No launch id.");
        bare.correlation = Correlation::default();
        record_diagnostic(&scratch.0, "launch-from-shell", bare, Some(5)).expect("the record is written");
        let parsed: serde_json::Value = serde_json::from_str(&lines(&scratch.0.join(LOG_FILE_NAME))[0]).expect("the line is JSON");
        assert_eq!(parsed["correlation"]["launchId"], "launch-from-shell");
        assert_eq!(parsed["timeMs"], 5);
    }

    #[test]
    fn record_diagnostic_keeps_the_launch_id_the_interface_sent() {
        let scratch = Scratch::new("log-keep");
        record_diagnostic(&scratch.0, "launch-from-shell", record("kept", "Has a launch id."), Some(5)).expect("the record is written");
        let parsed: serde_json::Value = serde_json::from_str(&lines(&scratch.0.join(LOG_FILE_NAME))[0]).expect("the line is JSON");
        assert_eq!(parsed["correlation"]["launchId"], "launch-1");
    }

    #[test]
    fn record_diagnostic_writes_under_the_directory_it_is_given() {
        let scratch = Scratch::new("log-under");
        let nested = scratch.0.join("app-data").join("logs");
        record_diagnostic(&nested, "launch-from-shell", record("nested", "Nested."), Some(5)).expect("the record is written");
        assert!(nested.join(LOG_FILE_NAME).is_file());
    }

    #[test]
    fn diagnostic_log_keeps_every_record_as_a_valid_line_when_writers_run_at_once() {
        let scratch = Scratch::new("log-threads");
        let writers = 8;
        let each = 50;
        std::thread::scope(|scope| {
            for writer in 0..writers {
                let directory = &scratch.0;
                scope.spawn(move || {
                    for number in 0..each {
                        let code = format!("writer-{writer}-record-{number}");
                        append(directory, &record(&code, "Concurrent."), Some(1), MAX_LOG_BYTES).expect("the record is written");
                    }
                });
            }
        });
        let written = lines(&scratch.0.join(LOG_FILE_NAME));
        assert_eq!(written.len(), writers * each);
        let mut codes: Vec<String> = written
            .iter()
            .map(|line| serde_json::from_str::<serde_json::Value>(line).expect("every line is JSON")["code"].as_str().expect("a code").to_string())
            .collect();
        codes.sort();
        codes.dedup();
        assert_eq!(codes.len(), writers * each);
    }

    #[test]
    fn diagnostic_log_stays_valid_and_bounded_when_writers_rotate_at_once() {
        let scratch = Scratch::new("log-threads-rotate");
        let limit = 600;
        std::thread::scope(|scope| {
            for writer in 0..4 {
                let directory = &scratch.0;
                scope.spawn(move || {
                    for number in 0..60 {
                        append(directory, &record(&format!("w{writer}-r{number}"), "Rotating."), Some(1), limit).expect("the record is written");
                    }
                });
            }
        });
        for name in [LOG_FILE_NAME, PREVIOUS_LOG_FILE_NAME] {
            let path = scratch.0.join(name);
            assert!(fs::metadata(&path).expect("the log file exists").len() <= limit);
            for line in lines(&path) {
                serde_json::from_str::<serde_json::Value>(&line).expect("every line is JSON");
            }
        }
    }

    #[cfg(unix)]
    #[test]
    fn diagnostic_log_is_private_to_the_owner() {
        use std::os::unix::fs::PermissionsExt;
        let scratch = Scratch::new("log-mode");
        let nested = scratch.0.join("logs");
        append(&nested, &record("private", "Private."), Some(1), MAX_LOG_BYTES).expect("the record is written");
        let mode = |path: &Path| fs::metadata(path).expect("metadata").permissions().mode() & 0o777;
        assert_eq!(mode(&nested), DIRECTORY_MODE);
        assert_eq!(mode(&nested.join(LOG_FILE_NAME)), FILE_MODE);
    }
}

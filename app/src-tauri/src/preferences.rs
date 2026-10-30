use crate::diagnostic_log::{self, Correlation, DiagnosticInput, Severity};
use serde_json::Value;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, PoisonError};

pub const FILE_NAME: &str = "preferences.json";
const TEMP_FILE_NAME: &str = "preferences.json.tmp";
const QUARANTINE_PREFIX: &str = "preferences.corrupt-";
/// The only file format version this build reads or writes. A file of another version is set aside, never reinterpreted.
pub const SCHEMA_VERSION: u64 = 1;
/// Largest preferences file read or written. Preferences are small settings, so a larger file is damaged or foreign.
pub const MAX_PREFERENCES_BYTES: u64 = 256 * 1024;
/// Most set-aside copies kept. Past this the oldest copy is replaced, so damaged files never fill the disk.
pub const MAX_QUARANTINED: usize = 3;

/// One writer at a time: the temp file name is shared, so two saves in one process must not interleave.
static SAVE_LOCK: Mutex<()> = Mutex::new(());

/// Why a saved file was not used, with a code for the log and technical text kept out of every screen.
#[derive(Debug, PartialEq, Eq)]
pub struct Recovery {
    pub code: &'static str,
    pub detail: String,
    /// Where the damaged bytes were kept; None when they could not be moved.
    pub kept_as: Option<PathBuf>,
}

#[derive(Debug, PartialEq)]
pub enum Loaded {
    /// There is no preferences file yet.
    Missing,
    Document(Value),
    Recovered(Recovery),
}

fn quarantine_path(directory: &Path, number: usize) -> PathBuf {
    directory.join(format!("{QUARANTINE_PREFIX}{number}"))
}

/// Moves the damaged file to the first free slot, or over the oldest copy when every slot is taken.
fn set_aside(directory: &Path, live: &Path) -> io::Result<PathBuf> {
    let slots: Vec<PathBuf> = (1..=MAX_QUARANTINED).map(|number| quarantine_path(directory, number)).collect();
    let target = match slots.iter().find(|slot| !slot.exists()) {
        Some(free) => free.clone(),
        None => slots
            .iter()
            .min_by_key(|slot| fs::metadata(slot).and_then(|metadata| metadata.modified()).ok())
            .cloned()
            .ok_or_else(|| io::Error::other("no set-aside slot exists"))?,
    };
    fs::rename(live, &target)?;
    Ok(target)
}

fn recover(directory: &Path, live: &Path, code: &'static str, detail: String) -> Loaded {
    match set_aside(directory, live) {
        Ok(kept) => Loaded::Recovered(Recovery { code, detail, kept_as: Some(kept) }),
        Err(error) => Loaded::Recovered(Recovery { code, detail: format!("{detail} The file could not be set aside: {error}."), kept_as: None }),
    }
}

fn version_of(document: &Value) -> Option<u64> {
    document.as_object()?.get("version")?.as_u64()
}

/// Reads and checks the file. Anything unusable is moved aside and reported, so the caller starts from defaults.
pub fn load(directory: &Path, max_bytes: u64) -> Loaded {
    let live = directory.join(FILE_NAME);
    let size = match fs::metadata(&live) {
        Ok(metadata) => metadata.len(),
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Loaded::Missing,
        Err(error) => return Loaded::Recovered(Recovery { code: "preferences-unreadable", detail: error.to_string(), kept_as: None }),
    };
    if size > max_bytes {
        return recover(directory, &live, "preferences-too-large", format!("The file holds {size} bytes; the limit is {max_bytes}."));
    }
    let bytes = match fs::read(&live) {
        Ok(bytes) => bytes,
        Err(error) => return recover(directory, &live, "preferences-unreadable", error.to_string()),
    };
    let text = match String::from_utf8(bytes) {
        Ok(text) => text,
        Err(error) => return recover(directory, &live, "preferences-corrupt", format!("The file is not UTF-8 text: {error}.")),
    };
    let document: Value = match serde_json::from_str(&text) {
        Ok(value) => value,
        Err(error) => return recover(directory, &live, "preferences-corrupt", format!("The file is not valid JSON: {error}.")),
    };
    match version_of(&document) {
        Some(SCHEMA_VERSION) => Loaded::Document(document),
        Some(other) => recover(directory, &live, "preferences-wrong-version", format!("The file is version {other}; this build reads version {SCHEMA_VERSION}.")),
        None => recover(directory, &live, "preferences-corrupt", "The file has no version number.".to_string()),
    }
}

/// Why a save was refused or failed; the code is stable and the detail is for the log.
#[derive(Debug, PartialEq, Eq)]
pub struct SaveError {
    pub code: &'static str,
    pub detail: String,
}

/// Writes the whole document through a temp file and a rename, so a crash leaves either the old file or the new one.
pub fn save(directory: &Path, document: &Value, max_bytes: u64) -> Result<(), SaveError> {
    if version_of(document) != Some(SCHEMA_VERSION) {
        return Err(SaveError { code: "preferences_invalid", detail: format!("The document must be an object with version {SCHEMA_VERSION}.") });
    }
    let text = serde_json::to_string_pretty(document).map_err(|error| SaveError { code: "preferences_invalid", detail: error.to_string() })?;
    if text.len() as u64 > max_bytes {
        return Err(SaveError { code: "preferences_too_large", detail: format!("The document holds {} bytes; the limit is {max_bytes}.", text.len()) });
    }
    let unwritable = |error: io::Error| SaveError { code: "preferences_unwritable", detail: error.to_string() };
    let _writer = SAVE_LOCK.lock().unwrap_or_else(PoisonError::into_inner);
    fs::create_dir_all(directory).map_err(unwritable)?;
    let temp = directory.join(TEMP_FILE_NAME);
    let written = (|| {
        let mut file = fs::File::create(&temp)?;
        file.write_all(text.as_bytes())?;
        file.sync_all()?;
        fs::rename(&temp, directory.join(FILE_NAME))
    })();
    if let Err(error) = written {
        let _ = fs::remove_file(&temp);
        return Err(unwritable(error));
    }
    Ok(())
}

/// Loads for the interface: a recovery is logged with the launch id and the caller gets None, meaning defaults.
pub fn load_and_report(directory: &Path, launch_id: &str, time_ms: Option<u64>, max_bytes: u64) -> Option<Value> {
    match load(directory, max_bytes) {
        Loaded::Document(document) => Some(document),
        Loaded::Missing => None,
        Loaded::Recovered(recovery) => {
            let kept = recovery.kept_as.as_ref().map_or("the file was not kept".to_string(), |path| format!("kept as {}", path.display()));
            let record = DiagnosticInput {
                severity: Severity::Warning,
                code: recovery.code.to_string(),
                message: "Saved settings could not be read, so MudMaker started with its defaults.".to_string(),
                detail: Some(format!("{} ({kept})", recovery.detail)),
                action_id: None,
                control_id: None,
                check: None,
                attempt: None,
                correlation: Correlation::default(),
            };
            let _ = diagnostic_log::record_diagnostic(directory, launch_id, record, time_ms);
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_scratch::Scratch;
    use serde_json::json;

    fn live(scratch: &Scratch) -> PathBuf {
        scratch.0.join(FILE_NAME)
    }
    fn kept(scratch: &Scratch) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(&scratch.0)
            .expect("the folder lists")
            .map(|entry| entry.expect("an entry").file_name().to_string_lossy().into_owned())
            .filter(|name| name.starts_with(QUARANTINE_PREFIX))
            .collect();
        names.sort();
        names
    }

    #[test]
    fn a_saved_document_loads_back_and_leaves_no_temp_file() {
        let scratch = Scratch::new("prefs-roundtrip");
        let document = json!({ "version": SCHEMA_VERSION, "app.global": { "theme": { "presetId": "light" } } });
        save(&scratch.0, &document, MAX_PREFERENCES_BYTES).expect("the document saves");
        assert_eq!(load(&scratch.0, MAX_PREFERENCES_BYTES), Loaded::Document(document));
        assert!(!scratch.0.join(TEMP_FILE_NAME).exists());
    }

    #[test]
    fn a_missing_file_is_not_a_recovery() {
        let scratch = Scratch::new("prefs-missing");
        assert_eq!(load(&scratch.0, MAX_PREFERENCES_BYTES), Loaded::Missing);
        assert!(kept(&scratch).is_empty());
    }

    #[test]
    fn a_failed_write_keeps_the_previous_file_whole() {
        let scratch = Scratch::new("prefs-atomic");
        let first = json!({ "version": SCHEMA_VERSION, "marker": "first" });
        save(&scratch.0, &first, MAX_PREFERENCES_BYTES).expect("the first save works");
        fs::create_dir(scratch.0.join(TEMP_FILE_NAME)).expect("a folder can block the temp name");
        let error = save(&scratch.0, &json!({ "version": SCHEMA_VERSION, "marker": "second" }), MAX_PREFERENCES_BYTES).expect_err("the write cannot start");
        assert_eq!(error.code, "preferences_unwritable");
        assert_eq!(load(&scratch.0, MAX_PREFERENCES_BYTES), Loaded::Document(first));
    }

    #[test]
    fn a_save_past_the_size_limit_is_refused_and_the_previous_file_stays() {
        let scratch = Scratch::new("prefs-save-limit");
        let first = json!({ "version": SCHEMA_VERSION, "marker": "first" });
        save(&scratch.0, &first, MAX_PREFERENCES_BYTES).expect("the first save works");
        let big = json!({ "version": SCHEMA_VERSION, "filler": "x".repeat(300) });
        let error = save(&scratch.0, &big, 200).expect_err("the document is over the limit");
        assert_eq!(error.code, "preferences_too_large");
        assert_eq!(load(&scratch.0, MAX_PREFERENCES_BYTES), Loaded::Document(first));
    }

    #[test]
    fn a_save_without_the_current_version_is_refused() {
        let scratch = Scratch::new("prefs-save-version");
        for document in [json!({ "version": SCHEMA_VERSION + 1 }), json!({ "no": "version" }), json!([1, 2])] {
            assert_eq!(save(&scratch.0, &document, MAX_PREFERENCES_BYTES).expect_err("refused").code, "preferences_invalid");
        }
        assert!(!live(&scratch).exists());
    }

    #[test]
    fn unusable_files_are_set_aside_with_the_matching_code() {
        let cases: Vec<(&str, Vec<u8>, &str)> = vec![
            ("not-json", b"{ nope".to_vec(), "preferences-corrupt"),
            ("not-utf8", vec![0xff, 0xfe, 0x00], "preferences-corrupt"),
            ("no-version", br#"{"app.global":{}}"#.to_vec(), "preferences-corrupt"),
            ("wrong-version", format!(r#"{{"version":{}}}"#, SCHEMA_VERSION + 1).into_bytes(), "preferences-wrong-version"),
            ("oversize", "x".repeat(300).into_bytes(), "preferences-too-large"),
        ];
        for (name, bytes, code) in cases {
            let scratch = Scratch::new(&format!("prefs-bad-{name}"));
            fs::write(live(&scratch), &bytes).expect("the file is written");
            let Loaded::Recovered(recovery) = load(&scratch.0, 200) else { panic!("{name} must be set aside") };
            assert_eq!(recovery.code, code, "{name}");
            assert!(!live(&scratch).exists(), "{name}: the live file is gone");
            let moved = recovery.kept_as.expect("the bytes were kept");
            assert_eq!(fs::read(moved).expect("kept bytes"), bytes, "{name}: the bytes are unchanged");
        }
    }

    #[test]
    fn set_aside_copies_are_bounded_and_the_newest_damage_replaces_the_oldest() {
        let scratch = Scratch::new("prefs-bounded");
        for number in 0..(MAX_QUARANTINED + 3) {
            fs::write(live(&scratch), format!("damaged {number}")).expect("the file is written");
            assert!(matches!(load(&scratch.0, MAX_PREFERENCES_BYTES), Loaded::Recovered(_)));
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        assert_eq!(kept(&scratch).len(), MAX_QUARANTINED);
        let texts: Vec<String> = kept(&scratch).iter().map(|name| fs::read_to_string(scratch.0.join(name)).expect("kept text")).collect();
        let last = format!("damaged {}", MAX_QUARANTINED + 2);
        assert!(texts.contains(&last), "the newest damaged file is kept: {texts:?}");
        assert!(!texts.contains(&"damaged 0".to_string()), "the oldest was replaced: {texts:?}");
    }

    #[test]
    fn a_recovery_is_logged_once_with_the_launch_id_and_the_caller_starts_from_defaults() {
        let scratch = Scratch::new("prefs-log");
        fs::write(live(&scratch), b"{ nope").expect("the file is written");
        assert_eq!(load_and_report(&scratch.0, "launch-9", Some(5), MAX_PREFERENCES_BYTES), None);
        assert_eq!(load_and_report(&scratch.0, "launch-9", Some(6), MAX_PREFERENCES_BYTES), None);
        let log = fs::read_to_string(scratch.0.join(diagnostic_log::LOG_FILE_NAME)).expect("the log exists");
        let lines: Vec<&str> = log.lines().collect();
        assert_eq!(lines.len(), 1, "the second start finds no damaged file");
        let record: Value = serde_json::from_str(lines[0]).expect("a JSON line");
        assert_eq!(record["code"], "preferences-corrupt");
        assert_eq!(record["correlation"]["launchId"], "launch-9");
    }
}

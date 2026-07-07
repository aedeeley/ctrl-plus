use clipboard_master::{CallbackResult, ClipboardHandler, Master};
use clipboard_win::{formats, get_clipboard, set_clipboard_string};
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

use crate::database::Database;
use crate::settings::AppSettings;

pub fn start_clipboard_monitor(
    app: AppHandle,
    db: Arc<Mutex<Database>>,
    ignore_next: Arc<AtomicBool>,
) -> Result<(), String> {
    let handler = ClipboardHandlerImpl {
        app,
        db,
        ignore_next,
    };

    thread::spawn(move || {
        if let Ok(mut master) = Master::new(handler) {
            let _ = master.run();
        }
    });

    Ok(())
}

struct ClipboardHandlerImpl {
    app: AppHandle,
    db: Arc<Mutex<Database>>,
    ignore_next: Arc<AtomicBool>,
}

impl ClipboardHandler for ClipboardHandlerImpl {
    fn on_clipboard_change(&mut self) -> CallbackResult {
        if self.ignore_next.swap(false, Ordering::SeqCst) {
            return CallbackResult::Next;
        }

        let content: String = match get_clipboard(formats::Unicode) {
            Ok(text) => text,
            Err(_) => return CallbackResult::Next,
        };

        let trimmed = content.trim();
        if trimmed.is_empty() {
            return CallbackResult::Next;
        }

        let db = self.db.lock();
        if db.insert(trimmed).is_err() {
            return CallbackResult::Next;
        }

        let is_pro = crate::license::is_pro(&db);
        let limit = if is_pro {
            AppSettings::from_db(&db, crate::settings::DEFAULT_THEME)
                .map(|settings| settings.effective_history_limit(true))
                .unwrap_or(crate::settings::PRO_DEFAULT_MAX_HISTORY)
        } else {
            crate::settings::FREE_MAX_HISTORY
        };
        let _ = db.enforce_limit(limit);
        drop(db);

        let _ = self.app.emit("clipboard-updated", ());
        CallbackResult::Next
    }
}

pub fn set_clipboard_suppressed(ignore_next: &AtomicBool, content: &str) -> Result<(), String> {
    ignore_next.store(true, Ordering::SeqCst);
    set_clipboard_string(content).map_err(|e| e.to_string())
}

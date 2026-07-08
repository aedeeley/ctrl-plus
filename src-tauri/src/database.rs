use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardItem {
    pub id: i64,
    pub content: String,
    pub created_at: i64,
    pub pinned: bool,
    pub sort_order: i32,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let path = db_path(app)?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS clipboard_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                pinned INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_clipboard_created_at
                ON clipboard_items(created_at DESC);
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )
        .map_err(|e| e.to_string())?;

        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        if !self.has_column("clipboard_items", "pinned")? {
            self.conn
                .execute(
                    "ALTER TABLE clipboard_items ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0",
                    [],
                )
                .map_err(|e| e.to_string())?;
        }

        if !self.has_column("clipboard_items", "sort_order")? {
            self.conn
                .execute(
                    "ALTER TABLE clipboard_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
                    [],
                )
                .map_err(|e| e.to_string())?;

            self.conn
                .execute(
                    "UPDATE clipboard_items
                     SET sort_order = (
                         SELECT COUNT(*)
                         FROM clipboard_items c2
                         WHERE c2.created_at > clipboard_items.created_at
                     )",
                    [],
                )
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    fn has_column(&self, table: &str, column: &str) -> Result<bool, String> {
        let mut stmt = self
            .conn
            .prepare(&format!("PRAGMA table_info({table})"))
            .map_err(|e| e.to_string())?;

        let names = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(names.iter().any(|name| name == column))
    }

    fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ClipboardItem> {
        Ok(ClipboardItem {
            id: row.get(0)?,
            content: row.get(1)?,
            created_at: row.get(2)?,
            pinned: row.get::<_, i32>(3)? != 0,
            sort_order: row.get(4)?,
        })
    }

    fn section_top_sort_order(&self, pinned: bool) -> Result<i32, String> {
        let pinned_flag = i32::from(pinned);
        self.conn
            .query_row(
                "SELECT COALESCE(MIN(sort_order), 0) - 1
                 FROM clipboard_items
                 WHERE pinned = ?1",
                params![pinned_flag],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())
    }

    fn bump_to_section_top(&self, id: i64, pinned: bool) -> Result<(), String> {
        let sort_order = self.section_top_sort_order(pinned)?;
        let pinned_flag = i32::from(pinned);
        self.conn
            .execute(
                "UPDATE clipboard_items SET sort_order = ?1 WHERE id = ?2 AND pinned = ?3",
                params![sort_order, id, pinned_flag],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn reindex_section(&self, pinned: bool, ordered_ids: &[i64]) -> Result<(), String> {
        let pinned_flag = i32::from(pinned);
        for (index, id) in ordered_ids.iter().enumerate() {
            let updated = self
                .conn
                .execute(
                    "UPDATE clipboard_items
                     SET sort_order = ?1
                     WHERE id = ?2 AND pinned = ?3",
                    params![index as i32, id, pinned_flag],
                )
                .map_err(|e| e.to_string())?;

            if updated == 0 {
                return Err(format!("Item {id} not found in section"));
            }
        }
        Ok(())
    }

    fn get_section(&self, pinned: bool, limit: usize) -> Result<Vec<ClipboardItem>, String> {
        let pinned_flag = i32::from(pinned);
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, content, created_at, pinned, sort_order
                 FROM clipboard_items
                 WHERE pinned = ?1
                 ORDER BY sort_order ASC
                 LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;

        let items = stmt
            .query_map(params![pinned_flag, limit as i64], Self::map_row)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(items)
    }

    pub fn insert(&self, content: &str) -> Result<Option<i64>, String> {
        let trimmed = content.trim();
        if trimmed.is_empty() {
            return Ok(None);
        }

        if let Ok((existing, pinned)) = self.conn.query_row(
            "SELECT id, pinned FROM clipboard_items WHERE content = ?1 ORDER BY created_at DESC LIMIT 1",
            params![trimmed],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i32>(1)? != 0)),
        ) {
            let now = chrono::Utc::now().timestamp();
            self.conn
                .execute(
                    "UPDATE clipboard_items SET created_at = ?1 WHERE id = ?2",
                    params![now, existing],
                )
                .map_err(|e| e.to_string())?;
            self.bump_to_section_top(existing, pinned)?;
            return Ok(Some(existing));
        }

        let now = chrono::Utc::now().timestamp();
        let sort_order = self.section_top_sort_order(false)?;
        self.conn
            .execute(
                "INSERT INTO clipboard_items (content, created_at, pinned, sort_order)
                 VALUES (?1, ?2, 0, ?3)",
                params![trimmed, now, sort_order],
            )
            .map_err(|e| e.to_string())?;

        Ok(Some(self.conn.last_insert_rowid()))
    }

    pub fn get_all(&self, limit: usize) -> Result<Vec<ClipboardItem>, String> {
        let mut pinned = self.get_section(true, usize::MAX)?;
        let unpinned_limit = limit.saturating_sub(pinned.len());
        let mut unpinned = self.get_section(false, unpinned_limit)?;
        pinned.append(&mut unpinned);
        Ok(pinned)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Option<ClipboardItem>, String> {
        self.conn
            .query_row(
                "SELECT id, content, created_at, pinned, sort_order
                 FROM clipboard_items
                 WHERE id = ?1",
                params![id],
                Self::map_row,
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => "Item not found".to_string(),
                other => other.to_string(),
            })
            .map(Some)
    }

    pub fn clear(&self) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM clipboard_items", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn enforce_limit(&self, max_items: usize) -> Result<(), String> {
        let pinned_count: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM clipboard_items WHERE pinned = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let unpinned_limit = max_items.saturating_sub(pinned_count as usize);
        if unpinned_limit == 0 {
            self.conn
                .execute("DELETE FROM clipboard_items WHERE pinned = 0", [])
                .map_err(|e| e.to_string())?;
            return Ok(());
        }

        self.conn
            .execute(
                "DELETE FROM clipboard_items
                 WHERE pinned = 0
                 AND id NOT IN (
                     SELECT id FROM clipboard_items
                     WHERE pinned = 0
                     ORDER BY sort_order ASC
                     LIMIT ?1
                 )",
                params![unpinned_limit as i64],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_pin(&self, id: i64) -> Result<(), String> {
        let pinned: i32 = self
            .conn
            .query_row(
                "SELECT pinned FROM clipboard_items WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|_| "Item not found".to_string())?;

        let new_pinned = pinned == 0;
        let new_pinned_flag = i32::from(new_pinned);
        let sort_order = self.section_top_sort_order(new_pinned)?;

        self.conn
            .execute(
                "UPDATE clipboard_items SET pinned = ?1, sort_order = ?2 WHERE id = ?3",
                params![new_pinned_flag, sort_order, id],
            )
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn reorder_items(&self, ordered_ids: &[i64]) -> Result<(), String> {
        if ordered_ids.is_empty() {
            return Ok(());
        }

        let total_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM clipboard_items", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        if ordered_ids.len() as i64 != total_count {
            return Err("Ordered IDs must include every clipboard item".to_string());
        }

        let mut pinned_ids = Vec::new();
        let mut unpinned_ids = Vec::new();
        let mut seen_unpinned = false;

        for id in ordered_ids {
            let pinned: i32 = self
                .conn
                .query_row(
                    "SELECT pinned FROM clipboard_items WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .map_err(|_| format!("Item {id} not found"))?;

            if pinned == 0 {
                seen_unpinned = true;
                unpinned_ids.push(*id);
            } else if seen_unpinned {
                return Err("Pinned items must come before unpinned items".to_string());
            } else {
                pinned_ids.push(*id);
            }
        }

        self.reindex_section(true, &pinned_ids)?;
        self.reindex_section(false, &unpinned_ids)?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        match self.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        ) {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("clipboard.db"))
}

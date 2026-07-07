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
                created_at INTEGER NOT NULL
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

        Ok(Self { conn })
    }

    pub fn insert(&self, content: &str) -> Result<Option<i64>, String> {
        let trimmed = content.trim();
        if trimmed.is_empty() {
            return Ok(None);
        }

        if let Ok(existing) = self.conn.query_row(
            "SELECT id FROM clipboard_items WHERE content = ?1 ORDER BY created_at DESC LIMIT 1",
            params![trimmed],
            |row| row.get::<_, i64>(0),
        ) {
            self.conn
                .execute(
                    "UPDATE clipboard_items SET created_at = ?1 WHERE id = ?2",
                    params![chrono::Utc::now().timestamp(), existing],
                )
                .map_err(|e| e.to_string())?;
            return Ok(Some(existing));
        }

        let now = chrono::Utc::now().timestamp();
        self.conn
            .execute(
                "INSERT INTO clipboard_items (content, created_at) VALUES (?1, ?2)",
                params![trimmed, now],
            )
            .map_err(|e| e.to_string())?;

        Ok(Some(self.conn.last_insert_rowid()))
    }

    pub fn get_all(&self, limit: usize) -> Result<Vec<ClipboardItem>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, content, created_at
                 FROM clipboard_items
                 ORDER BY created_at DESC
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let items = stmt
            .query_map(params![limit as i64], |row| {
                Ok(ClipboardItem {
                    id: row.get(0)?,
                    content: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(items)
    }

    pub fn get_by_id(&self, id: i64) -> Result<Option<ClipboardItem>, String> {
        self.conn
            .query_row(
                "SELECT id, content, created_at FROM clipboard_items WHERE id = ?1",
                params![id],
                |row| {
                    Ok(ClipboardItem {
                        id: row.get(0)?,
                        content: row.get(1)?,
                        created_at: row.get(2)?,
                    })
                },
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
        self.conn
            .execute(
                "DELETE FROM clipboard_items
                 WHERE id NOT IN (
                     SELECT id FROM clipboard_items
                     ORDER BY created_at DESC
                     LIMIT ?1
                 )",
                params![max_items as i64],
            )
            .map_err(|e| e.to_string())?;
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
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(dir.join("clipboard.db"))
}

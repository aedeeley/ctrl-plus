use serde::{Deserialize, Serialize};

pub const DEFAULT_MAX_HISTORY: usize = 500;
pub const FREE_MAX_HISTORY: usize = 5;
pub const PRO_MAX_HISTORY: usize = 5000;
pub const PRO_DEFAULT_MAX_HISTORY: usize = 500;
pub const DEFAULT_HOTKEY: &str = "Ctrl+Shift+V";
pub const DEFAULT_THEME: &str = "midnight";
pub const LIGHT_THEME: &str = "paper";
pub const DARK_THEME: &str = "midnight";
pub const DEFAULT_BORDER_STYLE: &str = "rounded";
pub const DEFAULT_FONT_STYLE: &str = "system";
pub const DEFAULT_SHADOW_STYLE: &str = "medium";

pub const FREE_THEMES: &[&str] = &["midnight", "paper"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub max_history: usize,
    pub hotkey: String,
    pub launch_on_startup: bool,
    pub theme: String,
    pub border_style: String,
    pub font_style: String,
    pub shadow_style: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            max_history: DEFAULT_MAX_HISTORY,
            hotkey: DEFAULT_HOTKEY.to_string(),
            launch_on_startup: true,
            theme: DEFAULT_THEME.to_string(),
            border_style: DEFAULT_BORDER_STYLE.to_string(),
            font_style: DEFAULT_FONT_STYLE.to_string(),
            shadow_style: DEFAULT_SHADOW_STYLE.to_string(),
        }
    }
}

impl AppSettings {
    pub fn from_db(
        db: &crate::database::Database,
        system_default_theme: &str,
    ) -> Result<Self, String> {
        let mut settings = Self::default();

        if let Some(value) = db.get_setting("max_history")? {
            if let Ok(max) = value.parse::<usize>() {
                settings.max_history = max.clamp(FREE_MAX_HISTORY, PRO_MAX_HISTORY);
            }
        }

        if let Some(value) = db.get_setting("hotkey")? {
            if !value.is_empty() {
                settings.hotkey = value;
            }
        }

        if let Some(value) = db.get_setting("launch_on_startup")? {
            settings.launch_on_startup = value == "true";
        }

        if let Some(value) = db.get_setting("theme")? {
            if !value.is_empty() {
                settings.theme = value;
            }
        } else {
            settings.theme = system_default_theme.to_string();
        }

        if let Some(value) = db.get_setting("border_style")? {
            if !value.is_empty() {
                settings.border_style = value;
            }
        }

        if let Some(value) = db.get_setting("font_style")? {
            if !value.is_empty() {
                settings.font_style = value;
            }
        }

        if let Some(value) = db.get_setting("shadow_style")? {
            if !value.is_empty() {
                settings.shadow_style = value;
            }
        }

        Ok(settings)
    }

    pub fn save(&self, db: &crate::database::Database) -> Result<(), String> {
        db.set_setting("max_history", &self.max_history.to_string())?;
        db.set_setting("hotkey", &self.hotkey)?;
        db.set_setting(
            "launch_on_startup",
            if self.launch_on_startup {
                "true"
            } else {
                "false"
            },
        )?;
        db.set_setting("theme", &self.theme)?;
        db.set_setting("border_style", &self.border_style)?;
        db.set_setting("font_style", &self.font_style)?;
        db.set_setting("shadow_style", &self.shadow_style)?;
        Ok(())
    }

    pub fn apply_tier_limits(&mut self, is_pro: bool) {
        if is_pro {
            if self.max_history < FREE_MAX_HISTORY {
                self.max_history = PRO_DEFAULT_MAX_HISTORY;
            }
            self.max_history = self.max_history.clamp(FREE_MAX_HISTORY, PRO_MAX_HISTORY);
            return;
        }

        self.max_history = FREE_MAX_HISTORY;

        if !FREE_THEMES.contains(&self.theme.as_str()) {
            self.theme = DEFAULT_THEME.to_string();
        }

        self.border_style = DEFAULT_BORDER_STYLE.to_string();
        self.font_style = DEFAULT_FONT_STYLE.to_string();
        self.shadow_style = DEFAULT_SHADOW_STYLE.to_string();
    }

    pub fn normalize_for_tier(&mut self, is_pro: bool) {
        if is_pro {
            self.max_history = self.max_history.clamp(FREE_MAX_HISTORY, PRO_MAX_HISTORY);
            return;
        }

        self.apply_tier_limits(false);
    }

    pub fn effective_history_limit(&self, is_pro: bool) -> usize {
        if is_pro {
            self.max_history.clamp(FREE_MAX_HISTORY, PRO_MAX_HISTORY)
        } else {
            FREE_MAX_HISTORY
        }
    }
}

pub fn load_window_position(db: &crate::database::Database) -> Result<Option<(i32, i32)>, String> {
    let x = db
        .get_setting("window_x")?
        .and_then(|value| value.parse::<i32>().ok());
    let y = db
        .get_setting("window_y")?
        .and_then(|value| value.parse::<i32>().ok());

    match (x, y) {
        (Some(x), Some(y)) => Ok(Some((x, y))),
        _ => Ok(None),
    }
}

pub fn save_window_position(
    db: &crate::database::Database,
    x: i32,
    y: i32,
) -> Result<(), String> {
    db.set_setting("window_x", &x.to_string())?;
    db.set_setting("window_y", &y.to_string())?;
    Ok(())
}

pub fn clear_window_position(db: &crate::database::Database) -> Result<(), String> {
    db.set_setting("window_x", "")?;
    db.set_setting("window_y", "")?;
    Ok(())
}

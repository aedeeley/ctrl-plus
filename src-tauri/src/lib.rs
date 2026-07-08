mod clipboard;
mod database;
mod license;
mod paste;
mod settings;
mod window_util;

use clipboard::set_clipboard_suppressed;
use database::{ClipboardItem, Database};
use license::{upgrade_url, LicenseStatus};
use parking_lot::Mutex;
use paste::{capture_paste_target, restore_and_paste, PasteTarget};
use serde::Serialize;
use settings::AppSettings;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Instant;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::Color;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_opener::OpenerExt;
struct AppState {
    db: Arc<Mutex<Database>>,
    ignore_clipboard: Arc<AtomicBool>,
    last_paste_target: Mutex<Option<PasteTarget>>,
    settings: Mutex<AppSettings>,
    overlay_shown_at: Mutex<Option<Instant>>,
}

#[derive(Serialize, Clone, Copy)]
struct OverlayShownEvent {
    backend_ms: f64,
}

#[tauri::command]
fn get_history(state: State<AppState>) -> Result<Vec<ClipboardItem>, String> {
    let settings = state.settings.lock();
    let db = state.db.lock();
    let is_pro = license::is_pro(&db);
    let limit = settings.effective_history_limit(is_pro);
    db.get_all(limit)
}
#[tauri::command]
fn clear_history(state: State<AppState>, app: AppHandle) -> Result<(), String> {
    state.db.lock().clear()?;
    let _ = app.emit("clipboard-updated", ());
    Ok(())
}

#[tauri::command]
fn toggle_pin(state: State<AppState>, app: AppHandle, id: i64) -> Result<(), String> {
    let db = state.db.lock();
    if !license::is_pro(&db) {
        return Err("Pin is a Pro feature".to_string());
    }
    db.toggle_pin(id)?;
    drop(db);
    let _ = app.emit("clipboard-updated", ());
    Ok(())
}

#[tauri::command]
fn reorder_items(
    state: State<AppState>,
    app: AppHandle,
    ordered_ids: Vec<i64>,
) -> Result<(), String> {
    let db = state.db.lock();
    if !license::is_pro(&db) {
        return Err("Reorder is a Pro feature".to_string());
    }
    db.reorder_items(&ordered_ids)?;
    drop(db);
    let _ = app.emit("clipboard-updated", ());
    Ok(())
}

#[tauri::command]
fn get_license_status(state: State<AppState>) -> Result<LicenseStatus, String> {
    let db = state.db.lock();
    license::load_license(&db)
}

#[tauri::command]
async fn activate_license(
    state: State<'_, AppState>,
    app: AppHandle,
    key: String,
) -> Result<LicenseStatus, String> {
    let (status, token) = {
        #[cfg(debug_assertions)]
        {
            if license::is_dev_license_key(&key) {
                license::activate_dev_license()?
            } else {
                license::activate_license_online(&key).await?
            }
        }
        #[cfg(not(debug_assertions))]
        {
            license::activate_license_online(&key).await?
        }
    };

    apply_pro_activation(&state, &app, status, &token)
}

#[tauri::command]
async fn deactivate_license(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<LicenseStatus, String> {
    let key = {
        let db = state.db.lock();
        let status = license::load_license(&db)?;
        if status.tier != license::LicenseTier::Pro {
            return Ok(LicenseStatus::default());
        }
        status.key
    };

    if let Some(key) = key.filter(|value| !value.is_empty()) {
        if !license::is_dev_license_key(&key) {
            license::deactivate_license_online(&key).await?;
        }
    }

    apply_free_deactivation(&state, &app)
}

fn apply_free_deactivation(state: &AppState, app: &AppHandle) -> Result<LicenseStatus, String> {
    let status = LicenseStatus::default();
    let settings = {
        let db = state.db.lock();
        license::save_license(&db, &status, None)?;
        let mut current = state.settings.lock().clone();
        current.apply_tier_limits(false);
        current.save(&db)?;
        db.enforce_limit(current.effective_history_limit(false))?;
        current
    };

    *state.settings.lock() = settings;
    let _ = app.emit("license-updated", status.clone());
    Ok(status)
}

fn apply_pro_activation(
    state: &AppState,
    app: &AppHandle,
    status: LicenseStatus,
    token: &str,
) -> Result<LicenseStatus, String> {
    let settings = {
        let db = state.db.lock();
        license::save_license(&db, &status, Some(token))?;
        let mut current = state.settings.lock().clone();
        current.apply_tier_limits(true);
        if current.max_history == settings::FREE_MAX_HISTORY {
            current.max_history = settings::PRO_DEFAULT_MAX_HISTORY;
        }
        current.save(&db)?;
        db.enforce_limit(current.max_history)?;
        current
    };

    *state.settings.lock() = settings;
    let _ = app.emit("license-updated", status.clone());
    Ok(status)
}

#[cfg(debug_assertions)]
fn unlock_dev_pro_if_needed(state: &AppState, app: &AppHandle) {
    let should_unlock = {
        let db = state.db.lock();
        !license::is_pro(&db)
    };

    if !should_unlock {
        return;
    }

    if let Ok((status, token)) = license::activate_dev_license() {
        if let Err(error) = apply_pro_activation(state, app, status, &token) {
            eprintln!("Failed to apply dev Pro unlock: {error}");
        }
    }
}

#[cfg(debug_assertions)]
#[tauri::command]
fn unlock_dev_pro(state: State<AppState>, app: AppHandle) -> Result<LicenseStatus, String> {
    let (status, token) = license::activate_dev_license()?;
    apply_pro_activation(&state, &app, status, &token)
}

#[tauri::command]
fn open_upgrade_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(upgrade_url(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().clone())
}
#[tauri::command]
fn update_settings(
    state: State<AppState>,
    app: AppHandle,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let is_pro = {
        let db = state.db.lock();
        license::is_pro(&db)
    };

    let mut normalized = AppSettings {
        max_history: settings.max_history,
        hotkey: settings.hotkey,
        launch_on_startup: settings.launch_on_startup,
        theme: settings.theme,
        border_style: settings.border_style,
        font_style: settings.font_style,
        overlay_position: settings.overlay_position,
    };
    normalized.normalize_for_tier(is_pro);

    {
        let db = state.db.lock();
        normalized.save(&db)?;
        db.enforce_limit(normalized.effective_history_limit(is_pro))?;
    }

    *state.settings.lock() = normalized.clone();
    apply_autostart(&app, normalized.launch_on_startup)?;
    register_hotkey(&app, &normalized.hotkey)?;

    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window_util::position_overlay(&window, &normalized.overlay_position);
        }
    }

    Ok(normalized)
}

#[tauri::command]
fn paste_item(state: State<AppState>, app: AppHandle, id: i64) -> Result<(), String> {
    let item = state
        .db
        .lock()
        .get_by_id(id)?
        .ok_or_else(|| "Item not found".to_string())?;

    let target = state.last_paste_target.lock().take();

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        window_util::hide_from_taskbar(&window);
    }

    std::thread::sleep(std::time::Duration::from_millis(50));
    set_clipboard_suppressed(&state.ignore_clipboard, &item.content)?;
    restore_and_paste(target.unwrap_or_default(), &item.content)?;

    Ok(())
}

#[tauri::command]
fn hide_overlay(app: AppHandle) -> Result<(), String> {
    hide_overlay_window(&app)
}

fn show_overlay(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let show_started = Instant::now();

    let exclude_hwnd = app
        .get_webview_window("main")
        .and_then(|window| window.hwnd().ok())
        .map(|hwnd| hwnd.0 as isize);

    *state.last_paste_target.lock() = Some(capture_paste_target(exclude_hwnd));

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let position = state.settings.lock().overlay_position.clone();
    window_util::position_overlay(&window, &position)?;
    window.show().map_err(|e| e.to_string())?;

    let backend_ms = show_started.elapsed().as_secs_f64() * 1000.0;
    *state.overlay_shown_at.lock() = Some(Instant::now());
    let _ = app.emit("overlay-shown", OverlayShownEvent { backend_ms });

    window_util::hide_from_taskbar(&window);
    let _ = window.set_focus();

    Ok(())
}

fn hide_overlay_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
        window_util::hide_from_taskbar(&window);
    }

    if let Some(state) = app.try_state::<AppState>() {
        *state.overlay_shown_at.lock() = None;
    }

    Ok(())
}

fn should_hide_on_focus_loss(app: &AppHandle) -> bool {
    let Some(state) = app.try_state::<AppState>() else {
        return true;
    };

    let Some(shown_at) = *state.overlay_shown_at.lock() else {
        return true;
    };

    shown_at.elapsed() > std::time::Duration::from_millis(250)
}

fn toggle_overlay(app: &AppHandle, state: &AppState) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        if visible {
            let _ = hide_overlay_window(app);
        } else if let Err(error) = show_overlay(app, state) {
            eprintln!("Failed to show overlay: {error}");
        }
    }
}

fn letter_or_digit_code(ch: char) -> Option<Code> {
    match ch {
        'A' => Some(Code::KeyA),
        'B' => Some(Code::KeyB),
        'C' => Some(Code::KeyC),
        'D' => Some(Code::KeyD),
        'E' => Some(Code::KeyE),
        'F' => Some(Code::KeyF),
        'G' => Some(Code::KeyG),
        'H' => Some(Code::KeyH),
        'I' => Some(Code::KeyI),
        'J' => Some(Code::KeyJ),
        'K' => Some(Code::KeyK),
        'L' => Some(Code::KeyL),
        'M' => Some(Code::KeyM),
        'N' => Some(Code::KeyN),
        'O' => Some(Code::KeyO),
        'P' => Some(Code::KeyP),
        'Q' => Some(Code::KeyQ),
        'R' => Some(Code::KeyR),
        'S' => Some(Code::KeyS),
        'T' => Some(Code::KeyT),
        'U' => Some(Code::KeyU),
        'V' => Some(Code::KeyV),
        'W' => Some(Code::KeyW),
        'X' => Some(Code::KeyX),
        'Y' => Some(Code::KeyY),
        'Z' => Some(Code::KeyZ),
        '0' => Some(Code::Digit0),
        '1' => Some(Code::Digit1),
        '2' => Some(Code::Digit2),
        '3' => Some(Code::Digit3),
        '4' => Some(Code::Digit4),
        '5' => Some(Code::Digit5),
        '6' => Some(Code::Digit6),
        '7' => Some(Code::Digit7),
        '8' => Some(Code::Digit8),
        '9' => Some(Code::Digit9),
        _ => None,
    }
}

fn parse_hotkey(hotkey: &str) -> Result<Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut key_part = String::new();

    for part in hotkey.split('+') {
        match part.trim().to_ascii_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" => modifiers |= Modifiers::ALT,
            "meta" | "win" | "super" => modifiers |= Modifiers::META,
            key => key_part = key.to_ascii_uppercase(),
        }
    }

    let code = match key_part.as_str() {
        "V" => Code::KeyV,
        "C" => Code::KeyC,
        "X" => Code::KeyX,
        "B" => Code::KeyB,
        "SPACE" => Code::Space,
        "GRAVE" | "`" => Code::Backquote,
        "F1" => Code::F1,
        "F2" => Code::F2,
        "F3" => Code::F3,
        "F4" => Code::F4,
        "F5" => Code::F5,
        "F6" => Code::F6,
        "F7" => Code::F7,
        "F8" => Code::F8,
        "F9" => Code::F9,
        "F10" => Code::F10,
        "F11" => Code::F11,
        "F12" => Code::F12,
        other if other.len() == 1 => {
            let ch = other.chars().next().unwrap();
            letter_or_digit_code(ch).ok_or_else(|| format!("Unsupported hotkey key: {other}"))?
        }
        other => return Err(format!("Unsupported hotkey key: {other}")),
    };

    Ok(Shortcut::new(Some(modifiers), code))
}

fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let shortcut = parse_hotkey(hotkey)?;
    let gs = app.global_shortcut();

    let _ = gs.unregister_all();
    gs.register(shortcut)
        .map_err(|e| format!("Failed to register hotkey: {e}"))
}

fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "Show Clipboard", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let upgrade_item =
        MenuItem::with_id(app, "upgrade", "Upgrade to Pro — $5", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit ctrl+", true, None::<&str>)?;

    let is_pro = app
        .try_state::<AppState>()
        .map(|state| license::is_pro(&state.db.lock()))
        .unwrap_or(false);

    let menu = if is_pro {
        Menu::with_items(app, &[&show_item, &settings_item, &quit_item])?
    } else {
        Menu::with_items(
            app,
            &[&show_item, &settings_item, &upgrade_item, &quit_item],
        )?
    };

    let icon = app
        .default_window_icon()
        .ok_or("Missing default window icon")?
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("ctrl+ clipboard manager")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(state) = app.try_state::<AppState>() {
                    let _ = show_overlay(app, &state);
                }
            }
            "settings" => {
                let _ = app.emit("open-settings", ());
                if let Some(state) = app.try_state::<AppState>() {
                    let _ = show_overlay(app, &state);
                }
            }
            "upgrade" => {
                let _ = app.opener().open_url(upgrade_url(), None::<&str>);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(state) = app.try_state::<AppState>() {
                    toggle_overlay(app, &state);
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_window(window: &WebviewWindow) {
    let _ = window.set_shadow(false);
    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
    window_util::hide_from_taskbar(window);
    let _ = window.hide();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(state) = app.try_state::<AppState>() {
                if let Err(error) = show_overlay(app, &state) {
                    eprintln!("Failed to show overlay from second instance: {error}");
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(state) = app.try_state::<AppState>() {
                            toggle_overlay(app, &state);
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .setup(|app| {
            let db = Arc::new(Mutex::new(Database::new(&app.handle())?));
            let system_theme = app
                .get_webview_window("main")
                .map(|window| window_util::system_default_theme(&window))
                .unwrap_or(settings::DEFAULT_THEME);

            let mut settings = AppSettings::from_db(&db.lock(), system_theme)?;
            {
                let db_guard = db.lock();
                let is_pro = license::is_pro(&db_guard);
                settings.apply_tier_limits(is_pro);
                settings.save(&db_guard)?;
                db_guard.enforce_limit(settings.effective_history_limit(is_pro))?;
            }

            let ignore_clipboard = Arc::new(AtomicBool::new(false));
            clipboard::start_clipboard_monitor(
                app.handle().clone(),
                db.clone(),
                ignore_clipboard.clone(),
            )?;

            let state = AppState {
                db,
                ignore_clipboard,
                last_paste_target: Mutex::new(None),
                settings: Mutex::new(settings.clone()),
                overlay_shown_at: Mutex::new(None),
            };

            app.manage(state);

            #[cfg(debug_assertions)]
            if let Some(state) = app.try_state::<AppState>() {
                unlock_dev_pro_if_needed(&state, &app.handle());
            }

            if let Some(window) = app.get_webview_window("main") {
                setup_window(&window);
                if let Some(state) = app.try_state::<AppState>() {
                    let position = state.settings.lock().overlay_position.clone();
                    let _ = window_util::position_overlay(&window, &position);
                }
                let handle = app.handle().clone();
                window.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = handle.get_webview_window("main").map(|window| {
                            let _ = window.hide();
                            window_util::hide_from_taskbar(&window);
                        });
                    }
                    WindowEvent::Focused(false) => {
                        let visible = handle
                            .get_webview_window("main")
                            .and_then(|window| window.is_visible().ok())
                            .unwrap_or(false);

                        if visible && should_hide_on_focus_loss(&handle) {
                            let _ = hide_overlay_window(&handle);
                        }
                    }
                    _ => {}
                });
            }

            setup_tray(&app.handle())?;
            register_hotkey(&app.handle(), &settings.hotkey)?;
            apply_autostart(&app.handle(), settings.launch_on_startup)?;

            Ok(())
        })
        .invoke_handler({
            #[cfg(debug_assertions)]
            {
                tauri::generate_handler![
                    get_history,
                    clear_history,
                    toggle_pin,
                    reorder_items,
                    get_settings,
                    update_settings,
                    paste_item,
                    hide_overlay,
                    get_license_status,
                    activate_license,
                    deactivate_license,
                    unlock_dev_pro,
                    open_upgrade_page
                ]
            }
            #[cfg(not(debug_assertions))]
            {
                tauri::generate_handler![
                    get_history,
                    clear_history,
                    toggle_pin,
                    reorder_items,
                    get_settings,
                    update_settings,
                    paste_item,
                    hide_overlay,
                    get_license_status,
                    activate_license,
                    deactivate_license,
                    open_upgrade_page
                ]
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

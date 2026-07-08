use tauri::{PhysicalPosition, Theme, WebviewWindow};

pub fn system_default_theme(window: &WebviewWindow) -> &'static str {
    match window.theme() {
        Ok(Theme::Light) => crate::settings::LIGHT_THEME,
        _ => crate::settings::DARK_THEME,
    }
}

pub fn hide_from_taskbar(window: &WebviewWindow) {
    let _ = window.set_skip_taskbar(true);

    #[cfg(windows)]
    apply_windows_skip_taskbar(window);
}

pub fn position_overlay(window: &WebviewWindow, saved: Option<(i32, i32)>) -> Result<(), String> {
    if let Some((x, y)) = saved {
        if position_is_on_monitor(window, x, y)? {
            return window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(|error| error.to_string());
        }
    }

    center_overlay(window)
}

fn position_is_on_monitor(window: &WebviewWindow, x: i32, y: i32) -> Result<bool, String> {
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;

    Ok(monitors.iter().any(|monitor| {
        let pos = monitor.position();
        let size = monitor.size();
        let right = pos.x + size.width as i32;
        let bottom = pos.y + size.height as i32;
        x >= pos.x && x < right && y >= pos.y && y < bottom
    }))
}

fn center_overlay(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "No monitor found".to_string())?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size().map_err(|error| error.to_string())?;

    let x = monitor_pos.x + (monitor_size.width as i32 - window_size.width as i32) / 2;
    let y = monitor_pos.y + (monitor_size.height as i32 - window_size.height as i32) / 2;

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
fn apply_windows_skip_taskbar(window: &WebviewWindow) {
    use std::ffi::c_void;

    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TOOLWINDOW: isize = 0x80;
    const WS_EX_APPWINDOW: isize = 0x40000;

    #[link(name = "user32")]
    extern "system" {
        fn GetWindowLongPtrW(hwnd: *mut c_void, nindex: i32) -> isize;
        fn SetWindowLongPtrW(hwnd: *mut c_void, nindex: i32, dwnewlong: isize) -> isize;
    }

    if let Ok(hwnd) = window.hwnd() {
        let hwnd_ptr = hwnd.0;
        unsafe {
            let style = GetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE);
            let new_style = (style | WS_EX_TOOLWINDOW) & !WS_EX_APPWINDOW;
            SetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE, new_style);
        }
    }
}

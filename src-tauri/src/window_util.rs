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

pub fn position_overlay(window: &WebviewWindow, position: &str) -> Result<(), String> {
    const MARGIN: i32 = 24;

    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "No monitor found".to_string())?;

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size().map_err(|error| error.to_string())?;

    let monitor_width = monitor_size.width as i32;
    let monitor_height = monitor_size.height as i32;
    let window_width = window_size.width as i32;
    let window_height = window_size.height as i32;

    let x_offset = match horizontal_alignment(position) {
        HorizontalAlignment::Start => MARGIN,
        HorizontalAlignment::Center => (monitor_width - window_width) / 2,
        HorizontalAlignment::End => monitor_width - window_width - MARGIN,
    };

    let y_offset = match vertical_alignment(position) {
        VerticalAlignment::Start => MARGIN,
        VerticalAlignment::Center => (monitor_height - window_height) / 2,
        VerticalAlignment::End => monitor_height - window_height - MARGIN,
    };

    let x = monitor_pos.x + x_offset;
    let y = monitor_pos.y + y_offset;

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

enum HorizontalAlignment {
    Start,
    Center,
    End,
}

enum VerticalAlignment {
    Start,
    Center,
    End,
}

fn horizontal_alignment(position: &str) -> HorizontalAlignment {
    match position {
        "top-left" | "left" | "bottom-left" => HorizontalAlignment::Start,
        "top-right" | "right" | "bottom-right" => HorizontalAlignment::End,
        _ => HorizontalAlignment::Center,
    }
}

fn vertical_alignment(position: &str) -> VerticalAlignment {
    match position {
        "top-left" | "top" | "top-right" => VerticalAlignment::Start,
        "bottom-left" | "bottom" | "bottom-right" => VerticalAlignment::End,
        _ => VerticalAlignment::Center,
    }
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

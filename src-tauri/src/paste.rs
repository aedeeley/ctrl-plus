#[derive(Debug, Clone, Copy, Default)]
pub struct PasteTarget {
    pub foreground: Option<isize>,
    pub focus: Option<isize>,
}

#[cfg(target_os = "windows")]
mod platform {
    use super::PasteTarget;
    use std::thread;
    use std::time::Duration;
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, SetFocus, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
        KEYEVENTF_UNICODE, VIRTUAL_KEY, VK_CONTROL, VK_LSHIFT, VK_MENU, VK_RSHIFT, VK_SHIFT,
        VK_V,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetGUIThreadInfo, GetWindowThreadProcessId, IsWindow,
        SendMessageW, SetForegroundWindow, ShowWindow, GUITHREADINFO, SW_RESTORE, WM_PASTE,
    };

    const EM_REPLACESEL: u32 = 0x00C2;

    pub fn capture_paste_target(exclude_hwnd: Option<isize>) -> PasteTarget {
        unsafe {
            let foreground = GetForegroundWindow();
            if foreground.0.is_null() {
                return PasteTarget::default();
            }

            let foreground_value = foreground.0 as isize;
            if exclude_hwnd == Some(foreground_value) {
                return PasteTarget::default();
            }

            let thread_id = GetWindowThreadProcessId(foreground, None);
            let mut info = GUITHREADINFO {
                cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
                ..Default::default()
            };

            let focus = if GetGUIThreadInfo(thread_id, &mut info).is_ok()
                && !info.hwndFocus.0.is_null()
            {
                Some(info.hwndFocus.0 as isize)
            } else {
                None
            };

            PasteTarget {
                foreground: Some(foreground_value),
                focus,
            }
        }
    }

    pub fn restore_and_paste(target: PasteTarget, text: &str) -> Result<(), String> {
        thread::sleep(Duration::from_millis(120));

        let Some(foreground_value) = target.foreground else {
            return paste_via_keyboard(text);
        };

        let foreground = HWND(foreground_value as *mut _);
        let focus = target.focus.map(|value| HWND(value as *mut _));

        unsafe {
            if !IsWindow(foreground).as_bool() {
                return paste_via_keyboard(text);
            }

            let _ = ShowWindow(foreground, SW_RESTORE);

            let target_thread = GetWindowThreadProcessId(foreground, None);
            let current_thread = GetCurrentThreadId();
            let attached = if target_thread != current_thread {
                AttachThreadInput(current_thread, target_thread, true).as_bool()
            } else {
                false
            };

            let _ = SetForegroundWindow(foreground);
            thread::sleep(Duration::from_millis(60));

            let focused_input = focus.filter(|hwnd| IsWindow(*hwnd).as_bool());
            if let Some(focus_hwnd) = focused_input {
                let _ = SetFocus(focus_hwnd);
                thread::sleep(Duration::from_millis(40));

                if is_native_text_input(focus_hwnd) && replace_selection(focus_hwnd, text) {
                    if attached {
                        let _ = AttachThreadInput(current_thread, target_thread, false);
                    }
                    return Ok(());
                }

                SendMessageW(focus_hwnd, WM_PASTE, WPARAM(0), LPARAM(0));
                thread::sleep(Duration::from_millis(30));
            }

            if attached {
                let _ = AttachThreadInput(current_thread, target_thread, false);
            }
        }

        paste_via_keyboard(text)
    }

    fn is_native_text_input(hwnd: HWND) -> bool {
        let mut class_name = [0u16; 256];
        let length = unsafe { GetClassNameW(hwnd, &mut class_name) };
        if length == 0 {
            return false;
        }

        let name = String::from_utf16_lossy(&class_name[..length as usize]).to_lowercase();
        name.contains("edit") || name.contains("richedit")
    }

    fn replace_selection(hwnd: HWND, text: &str) -> bool {
        let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            SendMessageW(
                hwnd,
                EM_REPLACESEL,
                WPARAM(1),
                LPARAM(wide.as_ptr() as isize),
            );
        }
        true
    }

    fn paste_via_keyboard(text: &str) -> Result<(), String> {
        release_stuck_modifiers();
        thread::sleep(Duration::from_millis(30));

        if simulate_ctrl_v().is_ok() {
            return Ok(());
        }

        send_unicode_text(text)
    }

    fn release_stuck_modifiers() {
        let modifiers = [VK_CONTROL, VK_SHIFT, VK_LSHIFT, VK_RSHIFT, VK_MENU];
        for vk in modifiers {
            let input = key_input(vk, true);
            unsafe {
                let _ = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            }
        }
    }

    fn simulate_ctrl_v() -> Result<(), String> {
        send_single_key(VK_CONTROL, false)?;
        thread::sleep(Duration::from_millis(40));
        send_single_key(VK_V, false)?;
        thread::sleep(Duration::from_millis(20));
        send_single_key(VK_V, true)?;
        send_single_key(VK_CONTROL, true)?;
        Ok(())
    }

    fn send_single_key(vk: VIRTUAL_KEY, key_up: bool) -> Result<(), String> {
        let input = key_input(vk, key_up);
        let sent = unsafe { SendInput(&[input], std::mem::size_of::<INPUT>() as i32) };
        if sent == 0 {
            return Err(format!("Failed to send key {:?}", vk.0));
        }
        Ok(())
    }

    fn send_unicode_text(text: &str) -> Result<(), String> {
        for unit in text.encode_utf16() {
            let down = unicode_input(unit, false);
            let up = unicode_input(unit, true);
            let sent = unsafe { SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32) };
            if sent == 0 {
                return Err("Failed to send unicode input".to_string());
            }
        }
        Ok(())
    }

    fn key_input(vk: VIRTUAL_KEY, key_up: bool) -> INPUT {
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: if key_up { KEYEVENTF_KEYUP } else { Default::default() },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    fn unicode_input(code_unit: u16, key_up: bool) -> INPUT {
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: code_unit,
                    dwFlags: if key_up {
                        KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
                    } else {
                        KEYEVENTF_UNICODE
                    },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::PasteTarget;

    pub fn capture_paste_target(_exclude_hwnd: Option<isize>) -> PasteTarget {
        PasteTarget::default()
    }

    pub fn restore_and_paste(_target: PasteTarget, _text: &str) -> Result<(), String> {
        Err("Paste-back is only supported on Windows".to_string())
    }
}

pub use platform::{capture_paste_target, restore_and_paste};

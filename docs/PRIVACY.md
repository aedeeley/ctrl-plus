# Privacy Policy — ctrl+

**Last updated:** July 8, 2026

## Summary

ctrl+ stores clipboard text history **only on your local computer**. We do not collect, transmit, or sell your clipboard data.

## Data stored locally

The app saves copied text to a SQLite database in your Windows app data folder:

```
%APPDATA%\com.alexd.ctrlplus\
```

This includes:

- Clipboard text content
- Timestamp of each copy
- Pin and sort order (Pro)
- Your settings (hotkey, history limit, theme, border, font, shadow, overlay position, startup preference)
- Pro license key and activation token (if upgraded)

## Data sent over the network

The free app does **not** upload clipboard content.

Network requests are limited to:

| When | What is sent | Where |
|------|--------------|-------|
| Pro activation | License key + hashed machine identifier | ctrlplus.pro license server |
| Check for updates (optional) | App version check | GitHub Releases (`latest.json`) |

No clipboard data is included in any network request.

## Data we do not collect

- No analytics
- No crash reporting (in MVP)
- No accounts or sign-in required for free use
- No cloud sync of clipboard history
- No sale of personal data

## Data control

You can:

- Clear history from Settings
- Uninstall the app to remove all local data
- Disable launch on startup from Settings
- Deactivate Pro to remove the license token from this device

## Contact

Add your support email before publishing.

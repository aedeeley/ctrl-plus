# Microsoft Store Publishing — ctrl+

## Why publish to the Store

- Free code signing for individual developers (as of 2025–26)
- Built-in updates and installer trust
- Discovery for utility apps
- Avoids SmartScreen warnings common with unsigned direct downloads

## Prerequisites

1. [Microsoft Partner Center](https://partner.microsoft.com/) account (individual registration is free)
2. Production build: `npm run tauri:build`
3. Privacy policy URL (host `docs/PRIVACY.md` on your site or GitHub Pages)
4. App screenshots (overlay, settings, tray icon)
5. 310x310 and 150x150 PNG icons (use `src-tauri/icons/` assets)

## Package format

Tauri produces:

| Artifact | Use |
|----------|-----|
| `bundle/msi/*.msi` | Direct download / enterprise |
| `bundle/nsis/*-setup.exe` | Direct download |
| MSIX (manual) | Microsoft Store preferred format |

For Store submission, you may need to convert to MSIX:

1. Install [MSIX Packaging Tool](https://learn.microsoft.com/en-us/windows/msix/packaging-tool/tool-overview)
2. Package the release `.exe` and dependencies
3. Or use Partner Center's packaging wizard with your NSIS installer

## Store listing checklist

- [ ] App name: **ctrl+**
- [ ] Category: Productivity / Utilities
- [ ] Short description: "Multi-clipboard manager with hotkey search and paste"
- [ ] Price: see [PRICING.md](PRICING.md)
- [ ] Privacy policy link
- [ ] System requirements: Windows 10 1809+, WebView2 runtime
- [ ] Screenshots (至少 1, recommend 4)
- [ ] Support contact email

## Suggested listing copy

**Short description**

> Never lose a copy again. ctrl+ keeps your clipboard history and lets you paste any previous item with Ctrl+Shift+V.

**Keywords**

clipboard, paste, history, productivity, copy, hotkey

## Updates

1. Bump version in `src-tauri/tauri.conf.json` and `package.json`
2. Run `npm run tauri:build`
3. Upload new package in Partner Center

## Alternative: direct download

If you skip the Store initially:

1. Upload `ctrl+_x64-setup.exe` to GitHub Releases
2. Consider [Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/) (~$10/mo) to reduce SmartScreen warnings
3. Link from a simple landing page with Gumroad/Stripe checkout

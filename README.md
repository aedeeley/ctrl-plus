# ctrl+

A lightweight Windows clipboard manager built with Tauri 2 and React.

Press **Ctrl+Shift+V**, search your history, and paste any previous copy. Everything stays local on your machine.

## Downloads

Get the latest installers from **[GitHub Releases](https://github.com/aedeeley/ctrl-plus/releases/latest)**:

- **Windows (most PCs):** download `ctrl+_*_x64-setup.exe`
- **Windows on ARM:** download `ctrl+_*_arm64-setup.exe`

The app can also check for and install updates in-app from **Settings → About**.

## Free vs Pro

| | Free | Pro ($5) |
|---|------|----------|
| History | 5 items | Up to 5,000 |
| Themes | Midnight + Paper | All 30 |
| Borders, fonts, shadows | Default only | Full customization |
| Pin & reorder | — | ✓ |
| Number hotkeys | `1`–`5` | `1`–`9` |

Everyone can drag the overlay to reposition it and reset to center in Settings.

Upgrade at **Settings → ctrl+ pro** or at [ctrlplus.pro](https://ctrlplus.pro/#buy).

## Source code and pricing

This repository is **public for transparency**: you can read the code to confirm clipboard history stays on your device and is never uploaded. That does not make Pro free — honest users still buy a $5 license key to unlock Pro features and support development.

- **Free tier** — fully usable without payment (5-item history, two themes)
- **Pro ($5 one-time)** — license key from [ctrlplus.pro](https://ctrlplus.pro/#buy); works offline after activation
- **Source** — public under [PolyForm Noncommercial](LICENSE) (audit the code; no commercial redistribution)

## Features

- Background text clipboard monitoring
- Global hotkey overlay (`Ctrl+Shift+V` by default, configurable)
- Search, wheel navigation, arrow keys, and number hotkeys for quick paste
- Paste back into the previously focused app
- System tray with hide-on-close behavior; launch on startup
- Drag-to-move overlay with remembered position
- 30 color themes, 7 border radii, 7 fonts, and 5 shadow presets (Pro for customization beyond defaults)
- Pin and reorder clips (Pro)
- In-app updates from GitHub Releases
- Local SQLite storage — clipboard data never uploaded

## Requirements

- Windows 10/11
- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/)
- Visual Studio 2022 Build Tools with the **Desktop development with C++** workload

## Development

```bash
npm install
npm run tauri:dev
```

Debug builds use a local license API at `http://localhost:3000/api/activate`. The license website is a separate project deployed at [ctrlplus.pro](https://ctrlplus.pro).

## Production build

```bash
npm run tauri:build
```

Installers are written to:

- `src-tauri/target/release/bundle/nsis/ctrl+_VERSION_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/ctrl+_VERSION_x64_en-US.msi`

Replace `VERSION` with the current version in `package.json` (e.g. `0.2.1`).

## Usage

1. Launch **ctrl+** — it runs in the system tray.
2. Copy text as usual; history is captured automatically.
3. Press **Ctrl+Shift+V** (or your configured hotkey) to open the overlay.
4. Search, scroll, or arrow through items; press **Enter**, click, or press `1`–`5` (Pro: `1`–`9`) to paste.
5. Drag the header to move the overlay; use **Appearance → Reset to center** to restore default placement.
6. Press **Esc** or click outside to close.

Open **Settings** from the gear icon to change hotkey, appearance, startup, or activate Pro.

### Keyboard shortcuts (overlay)

| Key | Action |
|-----|--------|
| `Ctrl+Shift+V` | Toggle overlay (default; configurable in Settings) |
| `↑` / `↓` | Move selection |
| `Enter` | Paste selected item |
| `1`–`5` / `1`–`9` | Quick-paste by index (Pro: up to 9) |
| `Esc` | Close overlay |
| Mouse wheel | Move selection |

## Project structure

```
src/                    React overlay UI
src-tauri/src/
  clipboard.rs          Windows clipboard listener
  database.rs           SQLite history storage
  license.rs            Pro license state + activation
  paste.rs              Focus restore + paste injection
  settings.rs           App settings + tier limits
  window_util.rs        Overlay positioning and monitor handling
  lib.rs                Tauri commands, tray, hotkeys
docs/                   Store, pricing, privacy, release guides
```

## Distribution

- [docs/RELEASE.md](docs/RELEASE.md) — publish new versions to GitHub Releases
- [docs/STORE.md](docs/STORE.md) — Microsoft Store publishing
- [docs/PRICING.md](docs/PRICING.md) — freemium model
- [docs/SECURITY.md](docs/SECURITY.md) — licensing security and public source notes
- [docs/LICENSE-GUIDE.md](docs/LICENSE-GUIDE.md) — source license vs Pro product license

## Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md). Clipboard data is stored only on your device. License activation sends your key and a machine hash only.

## License

Source code: [PolyForm Noncommercial 1.0.0](LICENSE). Installed app: free tier or Pro ($5 license key). See [docs/LICENSE-GUIDE.md](docs/LICENSE-GUIDE.md).

# ctrl+

A lightweight Windows clipboard manager built with Tauri 2 and React.

Press **Ctrl+Shift+V**, search your history, and paste any previous copy. Everything stays local on your machine.

## Downloads

Installers for the latest release are on [GitHub Releases](https://github.com/aedeeley/ctrl-plus/releases/latest):

| Platform | File |
|----------|------|
| Windows (most PCs) | `ctrl+_*_x64-setup.exe` |
| Windows on ARM | `ctrl+_*_aarch64-setup.exe` |

## Free vs Pro

| | Free | Pro ($5) |
|---|------|----------|
| History | 5 items | Up to 5,000 |
| Themes | Midnight + Paper | All 11 |
| Borders, fonts, position | Default only | Full customization |

Upgrade at **Settings → Upgrade** or at [ctrlplus.pro](https://ctrlplus.pro/#buy).

## Features

- Background text clipboard monitoring
- Global hotkey overlay (`Ctrl+Shift+V` by default)
- Search, wheel navigation, and keyboard selection
- Paste back into the previously focused app
- System tray with hide-on-close behavior
- Themes, borders, fonts, and popup position (Pro)
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

- `src-tauri/target/release/bundle/nsis/ctrl+_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/ctrl+_0.1.0_x64_en-US.msi`

## Usage

1. Launch **ctrl+** — it runs in the system tray.
2. Copy text as usual; history is captured automatically.
3. Press **Ctrl+Shift+V** to open the overlay.
4. Search, scroll, or arrow through items; press **Enter** or click to paste.
5. Press **Esc** or click outside to close.

Open **Settings** from the gear icon to change hotkey, theme, or activate Pro.

## Project structure

```
src/                    React overlay UI
src-tauri/src/
  clipboard.rs          Windows clipboard listener
  database.rs           SQLite history storage
  license.rs            Pro license state + activation
  paste.rs              Focus restore + paste injection
  settings.rs           App settings + tier limits
  lib.rs                Tauri commands, tray, hotkeys
docs/                   Store, pricing, privacy, release guides
```

## Distribution

- [docs/RELEASE.md](docs/RELEASE.md) — publish new versions to GitHub Releases
- [docs/STORE.md](docs/STORE.md) — Microsoft Store publishing
- [docs/PRICING.md](docs/PRICING.md) — freemium model

## Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md). Clipboard data is stored only on your device. License activation sends your key and a machine hash only.

## License

Proprietary — adjust before public release.

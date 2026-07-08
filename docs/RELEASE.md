# Publishing a release — ctrl+

This guide is for publishing new versions of the desktop app to GitHub Releases. If you normally work on websites, think of this as the desktop equivalent of deploying a new build — except users download an installer instead of visiting a URL.

## Where users download

Published installers live on the GitHub **Releases** page:

`https://github.com/aedeeley/ctrl-plus/releases/latest`

Each release includes:

| File | Who should use it |
|------|---------------------|
| `ctrl+_VERSION_x64-setup.exe` | Most Windows PCs (recommended) |
| `ctrl+_VERSION_x64_en-US.msi` | Alternative x64 installer (IT / enterprise) |
| `ctrl+_VERSION_arm64-setup.exe` | Windows on ARM (Surface Pro X, Snapdragon PCs) |

ARM64 builds use NSIS only — MSI is not supported for Windows ARM.

## How releases are built

Pushing a version tag (e.g. `v0.1.0`) triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml). GitHub Actions:

1. Builds the app on Windows for x64 and ARM64
2. Creates a **draft** release with installers attached
3. You review the draft, then click **Publish release**

Draft releases are intentional — you can verify the files before making them public.

## Before your first release

1. **Create the GitHub repo** (empty, no template files)
2. **Push this project** to `main`
3. **Add a repository secret** (Settings → Secrets and variables → Actions):
   - Name: `LICENSE_JWT_SECRET`
   - Value: same JWT secret as your production license server at `ctrlplus.pro`

   Without this secret, Pro license activation will not work in release builds.
   The value must match `LICENSE_JWT_SECRET` on ctrlplus.pro (Dokploy).

   Early deployments used the placeholder `change-me-to-a-long-random-secret`; release
   builds now also accept that legacy secret, but you should still align both sides
   on one production value.

## Publishing a new version

### 1. Bump the version

Update the version in all three files (keep them in sync):

- [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) — `"version"`
- [`src-tauri/Cargo.toml`](../src-tauri/Cargo.toml) — `version`
- [`package.json`](../package.json) — `"version"`

Example: change `0.1.0` → `0.1.1` everywhere.

### 2. Commit and tag

```bash
git add -A
git commit -m "chore: release v0.1.1"
git tag v0.1.1
git push origin main --tags
```

The tag name must start with `v` (e.g. `v0.1.1`) — that is what triggers the workflow.

### 3. Wait for the build

Open the **Actions** tab on GitHub. Two jobs should run (x64 and ARM64). When both succeed, a draft release appears under **Releases**.

### 4. Publish the draft

1. Open the draft release
2. Confirm all expected installer files are attached
3. Edit release notes if needed
4. Click **Publish release**

## Local build (optional)

To build installers on your machine instead of CI:

```bash
npm install
npm run tauri:build:licensed
```

If `../ctrlplus.pro/.env` exists, `tauri:build:licensed` copies its
`LICENSE_JWT_SECRET` into the build automatically. Otherwise set the env var
yourself before `npm run tauri:build`.

Output:

- `src-tauri/target/release/bundle/nsis/ctrl+_VERSION_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/ctrl+_VERSION_x64_en-US.msi`

## Windows SmartScreen warnings

Release builds are **unsigned** by default. Windows may show a SmartScreen warning on first install. This is normal for indie desktop apps.

To reduce warnings later:

- [Azure Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/) (~$10/mo)
- [Microsoft Store](STORE.md) (free code signing for individual developers)

## Future: Mac and Linux

The release workflow is Windows-only today. Adding Mac/Linux later requires porting the Rust clipboard and paste code, then adding matrix rows to the workflow — the same tag-based release process will apply.

## Auto-update

ctrl+ checks GitHub Releases for new versions. Users can tap **Check for updates** in Settings.

### How it works

1. Each release build signs updater artifacts (`.sig` files + `latest.json`).
2. The app fetches `latest.json` from the latest GitHub release.
3. If a newer version exists, the user can download and install it in-app. The app restarts automatically.

### One-time setup (signing keys)

Updater packages must be signed. Generate a keypair once (keep the private key secret):

```powershell
$env:CI = "true"
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\ctrl-plus.key" -f
```

The public key is already in `src-tauri/tauri.conf.json`. Add the **private** key as a GitHub Actions secret:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `%USERPROFILE%\.tauri\ctrl-plus.key` |

```powershell
Get-Content "$env:USERPROFILE\.tauri\ctrl-plus.key" -Raw
```

**Important:** If you lose the private key, you cannot ship updates to users who already have the app installed. Store it safely (password manager, etc.).

If you regenerate keys, update the `pubkey` in `tauri.conf.json` to match the new `.pub` file.

### Release checklist (with auto-update)

Same as above, plus confirm the published release includes:

- `latest.json`
- `ctrl+_VERSION_x64-setup.exe.sig` (and ARM64 equivalent)

These are created automatically when `TAURI_SIGNING_PRIVATE_KEY` is set in CI and `createUpdaterArtifacts` is enabled in `tauri.conf.json`.

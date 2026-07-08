# Security notes — ctrl+

This document covers licensing security, public source exposure, and optional hardening.

## Public repository

The desktop app source is public so users can verify privacy claims (clipboard data stays local). Source is licensed under [PolyForm Noncommercial 1.0.0](../LICENSE); see [LICENSE-GUIDE.md](LICENSE-GUIDE.md) for how that differs from the $5 Pro product key. Publishing source does not expose:

- Stripe keys (hosted on ctrlplus.pro only)
- Production `LICENSE_JWT_SECRET` value (GitHub Actions secret + Dokploy env)
- Tauri updater **private** signing key
- User clipboard data (local SQLite only)

## Current license model (HS256)

1. User buys Pro on [ctrlplus.pro](https://ctrlplus.pro).
2. Server signs a JWT with `LICENSE_JWT_SECRET` (HS256).
3. Desktop app verifies the JWT locally for offline Pro use.

The signing secret is compiled into release builds via [`src-tauri/build.rs`](../src-tauri/build.rs) so the app can verify tokens without calling the server on every launch.

**Limitation:** anyone with the release binary can potentially extract the embedded secret and forge offline tokens for their machine. A public GitHub repo makes bypassing Pro checks easier (rebuild without limits), but desktop freemium is never fully piracy-proof.

Debug builds accept dev/legacy secrets for local testing only; release builds use the CI-injected secret alone.

## JWT secret alignment

Production `LICENSE_JWT_SECRET` must be identical on:

| Location | Purpose |
|----------|---------|
| Dokploy (ctrlplus.pro) | Signs activation tokens |
| GitHub Actions secret | Baked into release installers |

The ctrlplus.pro server refuses to start in production if the secret is the dev default or the legacy placeholder. See [RELEASE.md](RELEASE.md) for a pre-release verification checklist.

## Future hardening: RS256 (recommended)

Today both server and client share one HS256 secret. A stronger design:

| Component | Holds |
|-----------|--------|
| ctrlplus.pro server | RSA **private** key (never in app repo or binary) |
| ctrl+ desktop app | RSA **public** key only (safe to ship in source and binary) |

The app could still verify JWTs offline, but forging tokens would require the server private key. Migration would touch:

- `ctrlplus.pro` — sign with RS256 private key
- `src-tauri/src/license.rs` — verify with embedded public key instead of `env!("LICENSE_JWT_SECRET")`
- `src-tauri/build.rs` — embed public key PEM instead of shared secret
- GitHub Actions — store public key or fetch from repo; remove `LICENSE_JWT_SECRET` from release builds

This is a medium-effort improvement, not required for launch. HS256 with aligned secrets is acceptable for a $5 utility if you accept some piracy.

## Other optional measures

| Measure | Tradeoff |
|---------|----------|
| Periodic online re-validation | Stronger control; needs internet occasionally |
| Microsoft Store distribution | Trusted install channel; see [STORE.md](STORE.md) |
| Code signing (Azure Trusted Signing) | Fewer SmartScreen warnings; monthly cost |

## Reporting issues

If you find a security issue in ctrl+, open a private report via [ctrlplus.pro](https://ctrlplus.pro) rather than a public issue when disclosure could harm users.

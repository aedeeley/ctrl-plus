# Licensing guide — ctrl+

ctrl+ uses **two separate licenses**. They cover different things and are easy to confuse.

## 1. Source code license (this GitHub repo)

**License:** [PolyForm Noncommercial 1.0.0](../LICENSE)

| You can | You cannot |
|---------|------------|
| View, clone, and study the code | Sell or commercially redistribute the app or a fork |
| Build and run for personal / hobby use | Ship a competing product (e.g. "ctrl+ but all Pro free") for money |
| Contribute bug fixes via pull request | Use the ctrl+ name/logo to imply endorsement |
| Use at schools, charities, or for personal privacy audits | sublicense the code to others |

This license is why the repo is public: anyone can verify that clipboard data stays local. It is **not** the same as "open source" (MIT/Apache) — commercial use and commercial redistribution are not allowed without your permission.

**GitHub:** After pushing `LICENSE`, set the repository license to **Other** with name `PolyForm-Noncommercial-1.0.0`, or leave GitHub to auto-detect from the file.

## 2. Product license (the installed app)

**What users download:** installers from [GitHub Releases](https://github.com/aedeeley/ctrl-plus/releases/latest)

| Tier | Price | How it works |
|------|-------|--------------|
| **Free** | $0 | Full app with limits (5 history items, 2 themes, default appearance, etc.) |
| **Pro** | $5 one-time | License key from [ctrlplus.pro](https://ctrlplus.pro/#buy); activates in Settings |

The Pro key is a **product purchase**, not permission to reuse the source commercially. Free-tier users do not sign anything; installing and using the free app is offered at no charge.

Pro keys are governed by the purchase flow on ctrlplus.pro (Stripe receipt, activation limits). See [PRICING.md](PRICING.md).

## 3. End-user terms (optional but recommended)

For the **installer**, many publishers add a short EULA (End User License Agreement) shown during setup. That covers:

- Grant to use the compiled software
- No warranty
- Pro features require a valid key
- Trademark (ctrl+ name)

ctrl+ does not yet embed an installer EULA. When you add one, keep it separate from `LICENSE` (source) — see [EULA.md](EULA.md) as a starting draft.

## 4. How this fits your goals

| Goal | How licensing supports it |
|------|---------------------------|
| Transparency / trust | Public repo + PolyForm NC allows anyone to audit privacy claims |
| Sell Pro for $5 | Product keys; source license does not grant free Pro |
| Block commercial forks | PolyForm NC prohibits commercial redistribution |
| Allow hobbyists to build | Personal noncommercial builds are explicitly permitted |

**What licensing cannot do:** stop someone from patching the binary or rebuilding without Pro checks for personal use. That is a technical limitation of desktop apps, not a license problem. See [SECURITY.md](SECURITY.md).

## 5. Checklist

- [x] `LICENSE` file in repo root (PolyForm Noncommercial 1.0.0)
- [x] `license` field in `package.json` and `Cargo.toml`
- [x] README explains source vs Pro pricing
- [ ] GitHub repo **About** → License detected or set manually
- [ ] (Optional) NSIS installer EULA from [EULA.md](EULA.md)
- [ ] (Optional) Trademark: register "ctrl+" if you invest heavily in the brand

## 6. If someone asks to fork commercially

You may grant a **separate commercial license** in writing (dual licensing). PolyForm NC keeps the default public terms clear; you negotiate exceptions case by case.

For licensing questions: https://ctrlplus.pro

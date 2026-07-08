# Pricing Strategy — ctrl+

## Freemium model

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 5 clipboard items, Midnight + Paper themes, default border/font/shadow, hotkey + startup, drag-to-move overlay |
| **Pro** | **$5 one-time** | Up to 5,000 items, all 30 themes, borders, fonts, shadows, pin & reorder, number hotkeys `1`–`9` |

## Why $5 one-time

- Low friction upgrade for a utility app
- Matches impulse-buy range for Windows productivity tools
- No subscription fatigue for clipboard software
- Easy to explain: free to try, $5 to unlock everything

## Upgrade flow

1. User downloads ctrl+ for free
2. Hits a limit or sees locked customization in Settings
3. Clicks **Upgrade** → website Stripe Checkout ($5)
4. Receives license key on success page + email (via Stripe receipt)
5. Enters key in ctrl+ Settings → Pro unlocked offline

## Payment stack

| Component | Choice |
|-----------|--------|
| Checkout | Stripe |
| License API | `website/` Next.js app |
| Activation | `POST /api/activate` with machine binding (3 devices) |
| Offline use | HS256 JWT cached locally after activation |

## Launch sequence

1. Ship free tier with enforced limits in app
2. Deploy website with Stripe test mode
3. End-to-end test: purchase → key → activate
4. Switch Stripe to live keys
5. Optional: Microsoft Store listing as free download with website unlock

## Landing page essentials

- One-line value prop: "Your clipboard history, one hotkey away"
- Free download + **Upgrade to Pro — $5** CTA
- Clear Free vs Pro comparison
- Privacy callout: clipboard data stays local; license activation sends key + machine hash only

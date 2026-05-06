# Stitch to Opus Frontend Implementation Brief

## Priority Rules
1. Security and privacy.
2. Existing app behavior.
3. File ownership.
4. Visual polish.

The order is fixed. Later items have less priority. Allowed exception count: zero. Backend behavior, Telegram auth validation, deployment scripts, API endpoint names, and production configuration are read-only surfaces for this task.

## Role And Ownership
Act as a senior frontend engineer. Apply the approved Stitch visual direction to the OpenClaw Pet Telegram Mini App. Owned file: `public/index.html`.

## Source Design
Stitch project: `projects/14844442654120528429`.

Reference screens:
- Pet Home: `projects/14844442654120528429/screens/bf690bca84734b63a0145aff7b728b3a`
- Hermes Console visual reference: `projects/14844442654120528429/screens/ae14b425a68c4953ad49218dad3f400a`
- Badges Progress: `projects/14844442654120528429/screens/6b596377a16745f7adf920621baccab3`

Local screenshots:
- `submission/stitch/01-clawdy-lab-bay-dashboard.png`
- `submission/stitch/02-hermes-console.png`
- `submission/stitch/03-badges-progress.png`

## Product Goal
Make the app feel Apps Center-ready: Telegram-first, premium, compact, memorable, and more distinctive than a generic tamagotchi clone. The first screen remains the usable pet dashboard.

## Visual Direction
- Dark premium utility-game style for developers and Telegram power users.
- Compact lab bay/dashboard feel inspired by the Stitch Home screen.
- Palette: deep navy/black surfaces, cyber mint `#2AF5D0`, amber `#FFCE4A`, rose `#FF5C8A`, steel neutrals.
- Typography direction: Space Grotesk style headings, Inter-style body, mono metric labels.
- Cards and controls at 8px radius or less.
- Avoid generic purple gradients, childish toy UI, decorative blobs, nested cards, and marketing hero layout.

## Preserved Behavior
- Telegram `initData` backend mode.
- Guest `localStorage` fallback outside Telegram.
- GitHub Pages demo mode.
- Hermes Console and Telegram-first agent control copy.
- WhatsApp share-link only.
- Support and privacy entry points.
- Existing API endpoint names and response assumptions.

## Required UI Coverage
- Home: brand, Clawdy, streak, OpenClaw sync signal, pet lab bay, level badge, Food/Joy/Focus/XP, daily quest, Feed/Play/Code, bottom actions: Agent, Sync, Invite, WA, Badges, Help.
- Agent: Hermes Console, status check, focus Hermes action, memory handoff, support/privacy links.
- Badges: evolution progress, unlocked/locked badges, recent OpenClaw signals, Invite and WA share-link actions.

## Verification Commands
Run:
```bash
npm test
npm run screenshots -- https://mturac.github.io/agent-pet-telegram/
npm run demo:video
npm run audit:submission
```

A blocked command must be reported as blocked with the exact reason.

## Output Contract
Return a concise Turkish engineering report with exactly these sections:
- Changed files
- Visual changes
- Preserved behavior
- Verification
- Residual risks

Secrets are excluded from the report. Production readiness is claimed only when `npm run audit:submission -- --require-production` passes with real production inputs and filled live test evidence.

# Live Test Results

Fill this after production deploy.

## Environment

- Static demo URL: https://mturac.github.io/agent-pet-telegram/
- Static demo status: GitHub Pages returned HTTP 200 on 2026-05-06
- Production URL: https://35.224.135.8.sslip.io
- Bot username: `@Bombaligrim_bot`
- Test device:
- Test Telegram account:
- Test date:

## Results

- [x] `npm run check:deploy` passes with `EXPECT_TELEGRAM=1`
- [x] `npm run preflight` passes on production host
- [x] `npm run telegram:configure` sets commands, menu button, and update mode
- [x] `/api/health` returns `telegramEnabled: true`
- [ ] BotFather Main Mini App opens production URL
- [ ] `/start` opens the Mini App
- [ ] First user can tap or shake to hatch Clawdy
- [ ] `/agent` opens Agent Training
- [ ] `/sync` opens or explains OpenClaw activity sync
- [x] `/privacy` returns privacy/storage note
- [x] Feed, Play, and Code actions update server state
- [x] OpenClaw Sync reads recent activity and awards daily XP
- [x] Daily quest can be claimed after 3 actions
- [x] Closing and reopening preserves progress
- [x] Agent Training status, focus, and handoff commands update server state
- [x] WhatsApp share opens a share link back to the Telegram app
- [x] Screenshots and demo video captured for Apps Center

## Evidence Links Or Files

- GitHub Pages run: `Deploy static demo to GitHub Pages` completed successfully for the Hermes reframe on `main`
- Static demo smoke: `curl -L https://mturac.github.io/agent-pet-telegram/` returned HTTP 200 and served `Agent Training` / `Status Check`
- Local test smoke: `npm test` passed and `npm audit --omit=dev` found 0 vulnerabilities
- Local submission audit: `npm run audit:submission` passed with production warnings
- Local deploy smoke: `npm run check:deploy -- http://localhost:3002` passed; `/api/health` confirmed memory/activity configured and Telegram disabled without `BOT_TOKEN`
- GitHub Actions: `Submission checks` and `Deploy static demo to GitHub Pages` completed successfully for the Hermes reframe on `main`
- Production deploy smoke: `EXPECT_TELEGRAM=1 npm run check:deploy -- https://35.224.135.8.sslip.io` passed.
- Production preflight: `npm run preflight` passed on `openclaw-gateway`.
- Bot API setup: `@Bombaligrim_bot` name, description, short description, commands, menu button, and webhook configured for `https://35.224.135.8.sslip.io`.
- Webhook proof: `getWebhookInfo` reported `https://35.224.135.8.sslip.io/telegram/webhook`, `pending_update_count: 0`, and no last error.
- Production health: `/api/health` returned `telegramEnabled: true`, `memoryConfigured: true`, and `activityConfigured: true`.
- Production privacy/support: `/privacy` and `/support` returned the expected storage and support text.
- Production signed smoke: `LIVE_SMOKE_SEED_ACTIVITY=1 EXPECT_OPENCLAW_SIGNAL=1 npm run live:smoke -- https://35.224.135.8.sslip.io` passed on `openclaw-gateway`.
- Production signed smoke output: test user hatched, badges included `hatched`, `first-care`, `daily-quest`, `agent-pilot`, `social`, and `openclaw-sync`; OpenClaw sync saw 2 recent files and awarded 16 XP.
- WhatsApp share proof: `public/index.html` now builds `wa.me` text with `https://t.me/Bombaligrim_bot/pet`; automated checks fail if the retired `OpenClawTamagotchi_bot` link returns.
- Bot status proof: Telegram API confirmed `@Bombaligrim_bot` commands, menu URL, webhook, name, and descriptions; `photoCount: 0`, so BotFather profile image upload is still missing.
- Current production blockers: real Telegram mobile flow evidence and BotFather Main Mini App/media setup remain manual.
- Screen recording: `submission/demo-video.mp4`
- Screenshots: `submission/screenshots/01-home.png`, `02-agent-console.png`, `03-badges.png`, `04-support-privacy.png`
- Production screenshots: `submission/screenshots/01-home.png`, `02-agent-console.png`, `03-badges.png`, and `04-support-privacy.png` regenerated from the production URL.
- Static preview video: `submission/demo-video.mp4` generated at 500x900, 10 seconds
- Agent support proof: `Agent Training` surface verified in screenshot `02-agent-console.png`; production commands include `/agent` and `/sync`.
- `EXPECT_TELEGRAM=1 npm run check:deploy -- <production-url>` output: passed for `https://35.224.135.8.sslip.io`
- `npm run preflight` output: `Production preflight passed.`
- `npm run telegram:configure` output: commands/menu configured; webhook verified after explicit production `setWebhook` refresh.
- `/api/health` response: `{"ok":true,"memoryConfigured":true,"activityConfigured":true,"telegramEnabled":true}`
- `npm run live:smoke` output: passed with signed Telegram initData against production.
- Notes: Do not mark complete until the unchecked mobile and BotFather items are verified.

## Completion Approval

Only mark the goal complete after every checkbox above is checked and the evidence fields are filled with production results.

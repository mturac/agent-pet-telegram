# Goal Audit

Objective: prepare OpenClaw Pet for Telegram Apps Center resubmission with Telegram-first deploy, OpenClaw memory sync, real Stars, guest fallback, WhatsApp share, support/privacy, BotFather setup, and checklist.

## Evidence Complete Locally

- Telegram-first app: `public/index.html`, `bot.js`
- OpenClaw memory sync: `OPENCLAW_PET_MEMORY_DIR`, file-backed state APIs in `bot.js`
- Real OpenClaw activity sync: `OPENCLAW_ACTIVITY_DIR`, `/api/openclaw/sync`, covered by `npm test`
- Telegram `initData` validation: `validateInitData` in `bot.js`, covered by `npm test`
- Server-side pet actions, quest, badges, social share: `/api/action`, `/api/quest/claim`, `/api/social/share`, covered by `npm test`
- Stars invoice/pre-checkout logic: `/api/create-invoice`, `validatePreCheckout`, covered by `npm test`
- Successful payment idempotency: `applyPaidBoost`, covered by `npm test`
- Guest web fallback: `public/index.html`
- WhatsApp share-link only: `shareWhatsApp` in `public/index.html`
- Support/privacy: `/support`, `/privacy`, `/paysupport` handling in `bot.js`
- BotFather media packet: `BOTFATHER_PACKET.md`, `assets/openclaw-pet-avatar.png`, `assets/openclaw-pet-splash.png`
- Screenshot capture: `npm run screenshots -- WEBAPP_URL`
- Local screenshot evidence: `submission/screenshots/01-home.png`, `02-star-boosts.png`, `03-badges.png`, `04-support-privacy.png`
- Static demo video capture: `npm run demo:video`, output `submission/demo-video.mp4`
- Screenshot demo mode shows OpenClaw activity signals instead of guest fallback copy.
- GitHub Pages static demo: `.github/workflows/pages.yml`; preview only, not production backend.
- Deploy packet: `DEPLOYMENT.md`, `deploy/nginx/openclaw-pet.conf.example`, `deploy/systemd/openclaw-pet.service.example`
- Telegram setup automation: `npm run telegram:configure` sets commands, menu button, and polling/webhook mode.
- Production preflight: `npm run preflight`
- Public health endpoint avoids exposing filesystem paths unless `SHOW_HEALTH_DETAILS=1`
- Runtime requirement: Node.js `>=18.17` in `package.json` and `DEPLOYMENT.md`
- Submission packet: `APP_CENTER_SUBMISSION.md`, `SUBMISSION_CHECKLIST.md`
- Product critique and next sprint risks: `PRODUCT_REVIEW.md`
- Production input handoff: `PRODUCTION_INPUTS.md`
- Live evidence template: `LIVE_TEST_RESULTS.md`

## Verified Commands

- `npm test`
- `npm run check:deploy -- http://localhost:3002`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' OPENCLAW_PET_MEMORY_DIR='/tmp/openclaw-pet-preflight' npm run preflight`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='http://pet.example.com' OPENCLAW_PET_MEMORY_DIR='/tmp/openclaw-pet-preflight' npm run preflight` fails as expected
- `npm run screenshots -- http://localhost:3002`
- `npm run demo:video`
- `ffprobe submission/demo-video.mp4` reported 500x900 and 10 seconds
- `git diff --check`
- GitHub Pages workflow `Deploy static demo to GitHub Pages` completed successfully for commit `2f4d878`
- `curl -L https://mturac.github.io/agent-pet-telegram/` returned HTTP 200
- `npm run preflight` without production env fails at `BOT_TOKEN is required`, confirming live inputs are still required
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' TELEGRAM_UPDATE_MODE='webhook' npm run preflight` fails without `TELEGRAM_WEBHOOK_SECRET`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' TELEGRAM_UPDATE_MODE='webhook' TELEGRAM_WEBHOOK_SECRET='dev-secret-for-check' npm run preflight` passes

## Not Complete Without Live Inputs

- HTTPS production deploy with real `BOT_TOKEN` and `WEBAPP_URL`
- `npm run preflight` must pass on production host
- `npm run telegram:configure` must pass against the real bot token
- BotFather Main Mini App configuration
- Upload bot image, splash screen, screenshots, and demo video
- Review generated screenshot files in `submission/screenshots/`
- Real Telegram mobile `/start`, `/paysupport`, `/privacy` checks
- Real Stars purchase and reopen-sync verification
- `/api/health` must return `telegramEnabled: true` on production
- `LIVE_TEST_RESULTS.md` must be fully checked and filled after production deploy

## Completion Rule

Do not mark this goal complete until the live-input items above are verified with production evidence.

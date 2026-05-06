# Goal Audit

Objective: prepare OpenClaw Pet for Telegram Apps Center resubmission with Telegram-first deploy, OpenClaw memory sync, Hermes agent control, guest fallback, WhatsApp share, support/privacy, BotFather setup, and checklist.

## Evidence Complete Locally

- Telegram-first app: `public/index.html`, `bot.js`
- OpenClaw memory sync: `OPENCLAW_PET_MEMORY_DIR`, file-backed state APIs in `bot.js`
- Real OpenClaw activity sync: `OPENCLAW_ACTIVITY_DIR`, `/api/openclaw/sync`, covered by `npm test`
- Telegram `initData` validation: `validateInitData` in `bot.js`, covered by `npm test`
- Server-side hatch moment: `/api/hatch`, `hatched` state, random creature form, covered by `npm test`
- Server-side pet actions, quest, badges, social share: `/api/action`, `/api/quest/claim`, `/api/social/share`, covered by `npm test`
- Agent Training command API: `/api/agent/command`, covered by `npm test`
- Agent Training surface: `public/index.html`, `#agent`, `/agent` command setup
- Guest web fallback: `public/index.html`
- WhatsApp share-link only: `shareWhatsApp` in `public/index.html`
- Support/privacy: `/support`, `/privacy`, and `/help` handling in `bot.js`
- BotFather media packet: `BOTFATHER_PACKET.md`, `assets/openclaw-pet-avatar.png`, `assets/openclaw-pet-splash.png`
- Screenshot capture: `npm run screenshots -- WEBAPP_URL`
- Local screenshot evidence: `submission/screenshots/01-home.png`, `02-agent-console.png`, `03-badges.png`, `04-support-privacy.png`
- First screenshot shows the tap/shake mystery egg; later screenshots show the hatched Tiny Claw pet loop.
- Static demo video capture: `npm run demo:video`, output `submission/demo-video.mp4`
- Screenshot demo mode shows OpenClaw activity signals instead of guest fallback copy.
- GitHub Pages static demo: `.github/workflows/pages.yml`; preview only, not production backend.
- Deploy packet: `DEPLOYMENT.md`, `deploy/nginx/openclaw-pet.conf.example`, `deploy/systemd/openclaw-pet.service.example`
- Telegram setup automation: `npm run telegram:configure` sets commands, menu button, and polling/webhook mode.
- Production preflight: `npm run preflight`
- Bot API status audit: `npm run bot:status`
- Production signed smoke: `npm run live:smoke`
- Local submission artifact audit: `npm run audit:submission`
- Public health endpoint avoids exposing filesystem paths unless `SHOW_HEALTH_DETAILS=1`
- Runtime requirement: Node.js `>=18.17` in `package.json` and `DEPLOYMENT.md`
- Submission packet: `APP_CENTER_SUBMISSION.md`, `SUBMISSION_CHECKLIST.md`
- Product critique and next sprint risks: `PRODUCT_REVIEW.md`
- Production input handoff: `PRODUCTION_INPUTS.md`
- Live evidence template: `LIVE_TEST_RESULTS.md`
- HTTPS production deploy: `https://35.224.135.8.sslip.io` on GCP `openclaw-gateway`
- Production services: `openclaw-pet` systemd service and Caddy are active

## Verified Commands

- `npm test`
- `npm run check:deploy -- http://localhost:3002`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' OPENCLAW_PET_MEMORY_DIR='/tmp/openclaw-pet-preflight' npm run preflight`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='http://pet.example.com' OPENCLAW_PET_MEMORY_DIR='/tmp/openclaw-pet-preflight' npm run preflight` fails as expected
- `npm run screenshots -- http://localhost:3002`
- `npm run demo:video`
- `ffprobe submission/demo-video.mp4` reported 500x900 and 10 seconds
- `npm run audit:submission` passed locally with production warnings
- `npm run audit:submission -- --require-production` fails until live production inputs and tests are filled
- `npm run check:deploy -- http://localhost:3002` passed against a live local server
- `curl http://localhost:3002/api/health` returned `memoryConfigured: true`, `activityConfigured: true`, and `telegramEnabled: false`
- GitHub Actions `Submission checks` completed successfully for the Hermes reframe on `main`
- `git diff --check`
- GitHub Pages workflow `Deploy static demo to GitHub Pages` completed successfully for the Hermes reframe on `main`
- `curl -L https://mturac.github.io/agent-pet-telegram/` returned HTTP 200 and served the Agent Training / Status Check copy
- `npm run preflight` without production env fails at `BOT_TOKEN is required`, confirming live inputs are still required
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' TELEGRAM_UPDATE_MODE='webhook' npm run preflight` fails without `TELEGRAM_WEBHOOK_SECRET`
- `BOT_TOKEN='123456:abc_DEF-ghi' WEBAPP_URL='https://pet.example.com' TELEGRAM_UPDATE_MODE='webhook' TELEGRAM_WEBHOOK_SECRET='dev-secret-for-check' npm run preflight` passes
- `python3 ~/.codex/skills/promptguard/scripts/audit_prompt.py STITCH_OPUS_BRIEF.md --format markdown` returned 0 findings
- `ffprobe submission/demo-video.mp4` reported 500x900 and 10 seconds after Agent Training regeneration
- Earlier Bot API preview setup verified `@Bombaligrim_bot` commands, description, short description, and web app menu button before the production cutover.
- `curl -fsS https://35.224.135.8.sslip.io/api/health` returned `telegramEnabled: true`, `memoryConfigured: true`, and `activityConfigured: true`
- `EXPECT_TELEGRAM=1 npm run check:deploy -- https://35.224.135.8.sslip.io` passed
- `npm run preflight` passed on the production VM with `/etc/openclaw-pet.env`
- `npm run screenshots -- https://35.224.135.8.sslip.io` regenerated the Apps Center screenshots
- `npm run demo:video` generated `submission/demo-video.mp4`
- `getWebhookInfo` reported `https://35.224.135.8.sslip.io/telegram/webhook`, zero pending updates, and no last error
- Bot API production setup verified `@Bombaligrim_bot` name, description, short description, commands, and web app menu button pointing to `https://35.224.135.8.sslip.io/`
- Visual review completed for `submission/screenshots/01-home.png`, `02-agent-console.png`, `03-badges.png`, and `04-support-privacy.png`
- `LIVE_SMOKE_SEED_ACTIVITY=1 EXPECT_OPENCLAW_SIGNAL=1 npm run live:smoke -- https://35.224.135.8.sslip.io` passed on `openclaw-gateway`
- Production signed smoke verified hatch, persisted reopen state, Feed/Play/Code state updates, daily quest claim, Agent Training `status`/`focus`/`handoff`, social badge, and OpenClaw sync with 2 recent files and 16 XP
- WhatsApp share link verified in `public/index.html`: it uses `https://wa.me/` text pointing to `https://t.me/Bombaligrim_bot/pet`; automated checks reject the retired bot link
- Bot API status audit verified commands, menu URL, webhook, name, and descriptions for `@Bombaligrim_bot`; `photoCount: 0`, so BotFather profile image remains incomplete

## Not Complete Without Live Inputs

- BotFather Main Mini App configuration
- Upload bot image, splash screen, screenshots, and demo video; `REQUIRE_BOT_PHOTO=1 npm run bot:status` must pass after profile image upload
- Real Telegram mobile `/start`, `/agent`, `/sync`, `/privacy` checks
- Real Telegram mobile hatch, Agent Training, OpenClaw sync, and reopen verification
- `LIVE_TEST_RESULTS.md` must be fully checked and filled after production deploy
- `npm run audit:submission -- --require-production` must pass after live tests are filled

## Completion Rule

Do not mark this goal complete until the live-input items above are verified with production evidence.

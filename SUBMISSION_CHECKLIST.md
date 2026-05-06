# OpenClaw Pet Apps Center Checklist

## Before Resubmission

- Deploy HTTPS URL with `BOT_TOKEN`, `WEBAPP_URL`, `PORT`, `OPENCLAW_PET_MEMORY_DIR`, and `OPENCLAW_ACTIVITY_DIR`.
- Run `npm run telegram:configure` after HTTPS is live to set bot commands, menu button, and polling/webhook mode.
- In BotFather, enable Main Mini App for the same HTTPS URL.
- Configure BotFather using `BOTFATHER_PACKET.md` and the PNG assets in `assets/`.
- Configure splash screen, bot image, screenshots, and a short demo video.
- Test `/start`, `/agent`, `/sync`, `/privacy`, and reopen sync on Telegram mobile.
- Test OpenClaw Sync after recent activity exists in `OPENCLAW_ACTIVITY_DIR`.
- Confirm `npm run check` passes and `/api/health` returns `telegramEnabled: true`.
- Run `npm run screenshots -- WEBAPP_URL` and review the 500x900 PNGs in `submission/screenshots/`.
- Run `npm run demo:video` and review `submission/demo-video.mp4`.
- Run `npm run audit:submission -- --require-production` after live Telegram tests are complete.

## Submission Copy

Telegram-first agent virtual pet with synced OpenClaw/Hermes memory, daily quests, social sharing, and Clawdy evolution.

## Evidence To Capture

- Mobile screen recording: open app, train Clawdy, sync OpenClaw activity, claim quest, share status, close/reopen.
- Static preview video: `submission/demo-video.mp4`.
- Screenshot set: home, Agent Training, badges, support/privacy, share flow.
- Agent support proof: bot responds to `/help` or Support.
- Filled production evidence: `LIVE_TEST_RESULTS.md`.

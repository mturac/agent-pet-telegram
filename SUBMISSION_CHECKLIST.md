# OpenClaw Pet Apps Center Checklist

## Before Resubmission

- Deploy HTTPS URL with `BOT_TOKEN`, `WEBAPP_URL`, `PORT`, and `OPENCLAW_PET_MEMORY_DIR`.
- Run `npm run telegram:configure` after HTTPS is live to set bot commands, menu button, and polling/webhook mode.
- In BotFather, enable Main Mini App for the same HTTPS URL.
- Configure BotFather using `BOTFATHER_PACKET.md` and the PNG assets in `assets/`.
- Configure splash screen, bot image, screenshots, and a short demo video.
- Test `/start`, `/paysupport`, `/privacy`, Stars purchase, and reopen sync on Telegram mobile.
- Test OpenClaw Sync after recent activity exists in `OPENCLAW_ACTIVITY_DIR`.
- Confirm `npm run check` passes and `/api/health` returns `telegramEnabled: true`.
- Run `npm run screenshots -- WEBAPP_URL` and review the 500x900 PNGs in `submission/screenshots/`.

## Submission Copy

Telegram-first coding pet with synced OpenClaw memory, daily quests, social sharing, and Telegram Stars boosts.

## Evidence To Capture

- Mobile screen recording: open app, feed/play/code, claim quest, buy Stars boost, close/reopen.
- Screenshot set: home, Star Boosts, badges, support/privacy, share flow.
- Payment support proof: bot responds to `/paysupport`.
- Filled production evidence: `LIVE_TEST_RESULTS.md`.

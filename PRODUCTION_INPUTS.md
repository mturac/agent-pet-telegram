# Production Inputs Needed

Use this handoff to finish the remaining manual Apps Center work.

## Provided Production Inputs

- Bot: `@Bombaligrim_bot`
- `WEBAPP_URL`: `https://35.224.135.8.sslip.io/`
- VPS/OpenClaw machine: `openclaw-gateway`
- Production memory folder: `/var/lib/openclaw-pet/users`
- Production activity folder: `/var/lib/openclaw-pet/activity`
- `TELEGRAM_UPDATE_MODE`: `webhook`
- `TELEGRAM_WEBHOOK_SECRET`: configured in `/etc/openclaw-pet.env`

## Still Required From User

- Rotate `BOT_TOKEN` before final public submission because the original token appeared in chat.
- Telegram account/device for the real mobile Hermes/OpenClaw sync test.
- BotFather manual media/Main Mini App confirmation.

## Required Commands After Inputs

```bash
npm run preflight
npm test
npm run telegram:configure
EXPECT_BOT_USERNAME=Bombaligrim_bot npm run bot:status
EXPECT_TELEGRAM=1 npm run check:deploy -- "$WEBAPP_URL"
LIVE_SMOKE_SEED_ACTIVITY=1 EXPECT_OPENCLAW_SIGNAL=1 npm run live:smoke -- "$WEBAPP_URL"
npm run screenshots -- "$WEBAPP_URL"
npm run demo:video
npm run audit:submission -- --require-production
```

## Required BotFather Actions

- Set Main Mini App URL to `https://35.224.135.8.sslip.io/`.
- Upload `assets/openclaw-pet-avatar.png`.
- Upload `assets/openclaw-pet-splash.png`.
- Add command list from `BOTFATHER_PACKET.md`.
- Capture screenshots and demo video for Apps Center.
- After uploading the bot image, run `REQUIRE_BOT_PHOTO=1 EXPECT_BOT_USERNAME=Bombaligrim_bot npm run bot:status`.

## Completion Gate

Fill `LIVE_TEST_RESULTS.md` with production output and evidence. Only then can the goal be marked complete.

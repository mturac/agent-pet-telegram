# Production Inputs Needed

Use this handoff to finish the active goal.

## Required From User

- `BOT_TOKEN` from BotFather.
- HTTPS domain for `WEBAPP_URL`.
- VPS/OpenClaw machine access where Node.js 18.17+ can run.
- Confirmation of the production OpenClaw memory folder.
- Confirmation of the production OpenClaw activity folder.
- Telegram account/device for the real mobile Stars test.

## Required Commands After Inputs

```bash
npm run preflight
npm test
EXPECT_TELEGRAM=1 npm run check:deploy -- "$WEBAPP_URL"
npm run screenshots -- "$WEBAPP_URL"
```

## Required BotFather Actions

- Set Main Mini App URL to `WEBAPP_URL`.
- Upload `assets/openclaw-pet-avatar.png`.
- Upload `assets/openclaw-pet-splash.png`.
- Add command list from `BOTFATHER_PACKET.md`.
- Capture screenshots and demo video for Apps Center.

## Completion Gate

Fill `LIVE_TEST_RESULTS.md` with production output and evidence. Only then can the goal be marked complete.

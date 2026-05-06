# Manual Completion Runbook

Use this only for the remaining manual Apps Center gates.

## 1. Rotate Bot Token

The original token appeared in chat, so rotate it before final submission.

After BotFather gives the new token, update the VM:

```bash
gcloud compute ssh openclaw-gateway --zone us-central1-a
sudo editor /etc/openclaw-pet.env
sudo systemctl restart openclaw-pet
cd /opt/openclaw-pet
set -a; . /etc/openclaw-pet.env; set +a
npm run telegram:configure
npm run bot:set-photo
EXPECT_BOT_USERNAME=Bombaligrim_bot npm run bot:status
```

## 2. BotFather Media

Prepare the upload package:

```bash
npm run submission:package
```

- Bot: `@Bombaligrim_bot`
- Name: `OpenClaw Pet`
- Main Mini App URL: `https://35.224.135.8.sslip.io/`
- Direct app link: `https://t.me/Bombaligrim_bot/pet`
- Bot image: `assets/openclaw-pet-avatar.png`
- Bot API profile photo source: `assets/openclaw-pet-avatar.jpg`
- Splash screen: `assets/openclaw-pet-splash.png`
- Screenshots: `submission/screenshots/`
- Demo video: `submission/demo-video.mp4`

After uploading the profile image:

```bash
REQUIRE_BOT_PHOTO=1 EXPECT_BOT_USERNAME=Bombaligrim_bot npm run bot:status
```

## 3. Telegram Mobile Test

On a real phone:

- Open `@Bombaligrim_bot`
- Run `/start` and open the Mini App
- Tap or shake to hatch Clawdy
- Use Feed, Play, and Code
- Open `/agent` and run Status, Focus, and Handoff
- Run `/sync`
- Close and reopen the app; confirm progress persists
- Open `/privacy`

Then check the remaining boxes in `LIVE_TEST_RESULTS.md`.

## 4. Final Gate

```bash
BOT_TOKEN=present WEBAPP_URL=https://35.224.135.8.sslip.io OPENCLAW_PET_MEMORY_DIR=/var/lib/openclaw-pet/users OPENCLAW_ACTIVITY_DIR=/var/lib/openclaw-pet/activity npm run audit:submission -- --require-production
```

# Live Test Results

Fill this after production deploy.

## Environment

- Static demo URL: https://mturac.github.io/agent-pet-telegram/
- Static demo status: GitHub Pages returned HTTP 200 on 2026-05-06
- Production URL:
- Bot username:
- Test device:
- Test Telegram account:
- Test date:

## Results

- [ ] `npm run check:deploy` passes with `EXPECT_TELEGRAM=1`
- [ ] `npm run preflight` passes on production host
- [ ] `npm run telegram:configure` sets commands, menu button, and update mode
- [ ] `/api/health` returns `telegramEnabled: true`
- [ ] BotFather Main Mini App opens production URL
- [ ] `/start` opens the Mini App
- [ ] First user can tap or shake to hatch Clawdy
- [ ] `/agent` opens Agent Training
- [ ] `/sync` opens or explains OpenClaw activity sync
- [ ] `/privacy` returns privacy/storage note
- [ ] Feed, Play, and Code actions update server state
- [ ] OpenClaw Sync reads recent activity and awards daily XP
- [ ] Daily quest can be claimed after 3 actions
- [ ] Closing and reopening preserves progress
- [ ] Agent Training status, focus, and handoff commands update server state
- [ ] WhatsApp share opens a share link back to the Telegram app
- [ ] Screenshots and demo video captured for Apps Center

## Evidence Links Or Files

- GitHub Pages run: `Deploy static demo to GitHub Pages` completed successfully for the Hermes reframe on `main`
- Static demo smoke: `curl -L https://mturac.github.io/agent-pet-telegram/` returned HTTP 200 and served `Agent Training` / `Status Check`
- Local test smoke: `npm test` passed and `npm audit --omit=dev` found 0 vulnerabilities
- Local submission audit: `npm run audit:submission` passed with production warnings
- Local deploy smoke: `npm run check:deploy -- http://localhost:3002` passed; `/api/health` confirmed memory/activity configured and Telegram disabled without `BOT_TOKEN`
- GitHub Actions: `Submission checks` and `Deploy static demo to GitHub Pages` completed successfully for the Hermes reframe on `main`
- Current production preflight: blocked because `BOT_TOKEN` is not set in this environment
- Screen recording:
- Screenshots:
- Static preview video: `submission/demo-video.mp4` generated from the GitHub Pages demo at 500x900, 10 seconds
- Agent support proof:
- `EXPECT_TELEGRAM=1 npm run check:deploy -- <production-url>` output:
- `npm run preflight` output:
- `npm run telegram:configure` output:
- `/api/health` response:
- Notes:

## Completion Approval

Only mark the goal complete after every checkbox above is checked and the evidence fields are filled with production results.

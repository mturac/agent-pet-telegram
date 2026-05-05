# OpenClaw Pet Deployment

## VPS Layout

- App directory: `/opt/openclaw-pet`
- Runtime user: `openclaw`
- Runtime: Node.js 18.17 or newer
- Memory directory: `/home/openclaw/.openclaw/workspace/memory/openclaw-pet/users`
- Activity directory: `/home/openclaw/.openclaw/workspace/memory`
- Reverse proxy: Nginx to `127.0.0.1:3000`
- TLS: Certbot or any HTTPS proxy in front of Nginx

## Deploy Steps

```bash
cd /opt/openclaw-pet
npm install --omit=dev
cp .env.example .env
npm run preflight
npm run check
sudo cp deploy/systemd/openclaw-pet.service.example /etc/systemd/system/openclaw-pet.service
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-pet
```

Set `.env` values:

```bash
BOT_TOKEN=123456:telegram-token
WEBAPP_URL=https://pet.example.com
PORT=3000
OPENCLAW_PET_MEMORY_DIR=/home/openclaw/.openclaw/workspace/memory/openclaw-pet/users
OPENCLAW_ACTIVITY_DIR=/home/openclaw/.openclaw/workspace/memory
SHOW_HEALTH_DETAILS=0
```

After HTTPS is live:

```bash
EXPECT_TELEGRAM=1 npm run check:deploy -- https://pet.example.com
```

## BotFather

- Configure the HTTPS URL as the Main Mini App.
- Add bot image, description, splash screen, screenshots, and a short demo video.
- Test `/start`, `/paysupport`, `/privacy`, Stars purchase, and app reopen sync.

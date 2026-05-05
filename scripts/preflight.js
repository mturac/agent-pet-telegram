const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();

function expandHome(value) {
  return value.replace(/^~(?=$|\/|\\)/, os.homedir());
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const token = assertEnv('BOT_TOKEN');
const webAppUrl = assertEnv('WEBAPP_URL');
const memoryDir = expandHome(
  process.env.OPENCLAW_PET_MEMORY_DIR ||
  '~/.openclaw/workspace/memory/openclaw-pet/users'
);
const activityDir = expandHome(
  process.env.OPENCLAW_ACTIVITY_DIR ||
  '~/.openclaw/workspace/memory'
);
const telegramUpdateMode = (process.env.TELEGRAM_UPDATE_MODE || 'polling').toLowerCase();

if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
  throw new Error('BOT_TOKEN does not look like a Telegram bot token.');
}

const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  throw new Error('Node.js 18.17 or newer is required.');
}

const parsedUrl = new URL(webAppUrl);
if (parsedUrl.protocol !== 'https:') {
  throw new Error('WEBAPP_URL must be HTTPS for Telegram Apps Center.');
}

if (!['polling', 'webhook'].includes(telegramUpdateMode)) {
  throw new Error('TELEGRAM_UPDATE_MODE must be polling or webhook.');
}

if (telegramUpdateMode === 'webhook' && !process.env.TELEGRAM_WEBHOOK_SECRET) {
  throw new Error('TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_UPDATE_MODE=webhook.');
}

fs.mkdirSync(memoryDir, { recursive: true });
fs.mkdirSync(activityDir, { recursive: true });
const probe = path.join(memoryDir, `.preflight-${Date.now()}`);
fs.writeFileSync(probe, 'ok');
fs.unlinkSync(probe);
fs.accessSync(activityDir, fs.constants.R_OK);

console.log('Production preflight passed.');

const assert = require('assert');
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const MODE = (process.env.TELEGRAM_UPDATE_MODE || 'polling').toLowerCase();
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const ALLOWED_UPDATES = ['message', 'callback_query'];

function assertEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertHttps(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('WEBAPP_URL must be HTTPS.');
  return parsed.toString();
}

async function callTelegram(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

async function main() {
  assertEnv('BOT_TOKEN', TOKEN);
  const webAppUrl = assertHttps(assertEnv('WEBAPP_URL', WEBAPP_URL));
  assert(['polling', 'webhook'].includes(MODE), 'TELEGRAM_UPDATE_MODE must be polling or webhook.');

  const me = await callTelegram('getMe');
  await callTelegram('setMyCommands', {
    commands: [
      { command: 'start', description: 'Open OpenClaw Pet' },
      { command: 'agent', description: 'Open Hermes Console' },
      { command: 'sync', description: 'Sync OpenClaw activity' },
      { command: 'privacy', description: 'Privacy and stored data' },
      { command: 'help', description: 'Help and support' }
    ]
  });
  await callTelegram('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Open Pet',
      web_app: { url: webAppUrl }
    }
  });

  if (MODE === 'webhook') {
    const payload = {
      url: new URL('/telegram/webhook', webAppUrl).toString(),
      allowed_updates: ALLOWED_UPDATES
    };
    if (WEBHOOK_SECRET) payload.secret_token = WEBHOOK_SECRET;
    await callTelegram('setWebhook', payload);
  } else {
    await callTelegram('deleteWebhook', { drop_pending_updates: false });
  }

  console.log(`Configured @${me.username} for ${MODE} mode.`);
  console.log(`Mini App menu URL: ${webAppUrl}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

const crypto = require('crypto');
const express = require('express');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;
const TELEGRAM_UPDATE_MODE = (process.env.TELEGRAM_UPDATE_MODE || 'polling').toLowerCase();
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const INIT_DATA_MAX_AGE_SECONDS = Number(process.env.INIT_DATA_MAX_AGE_SECONDS || 86400);
const MEMORY_DIR = expandHome(
  process.env.OPENCLAW_PET_MEMORY_DIR ||
  '~/.openclaw/workspace/memory/openclaw-pet/users'
);
const ACTIVITY_DIR = expandHome(
  process.env.OPENCLAW_ACTIVITY_DIR ||
  '~/.openclaw/workspace/memory'
);

const app = express();

const BOOSTS = {
  'star-snack': {
    title: 'Star Snack',
    description: 'Refills Food and Joy for your OpenClaw Pet.',
    amount: 15
  },
  'focus-sprint': {
    title: 'Focus Sprint',
    description: 'Doubles XP from the next coding action.',
    amount: 25
  },
  'legend-aura': {
    title: 'Legend Aura',
    description: 'Unlocks a premium cosmetic glow for evolved pets.',
    amount: 50
  }
};

const STAGES = [
  { name: 'Egg', level: 1 },
  { name: 'Baby Bot', level: 3 },
  { name: 'Code Cub', level: 6 },
  { name: 'Build Beast', level: 10 },
  { name: 'Claw Legend', level: 15 }
];

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function expandHome(value) {
  return value.replace(/^~(?=$|\/|\\)/, os.homedir());
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeUserId(userId) {
  return String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
}

function statePath(userId) {
  return path.join(MEMORY_DIR, `${safeUserId(userId)}.json`);
}

function defaultState(user) {
  const firstName = user.first_name || 'Agent';
  return {
    userId: String(user.id),
    name: `${firstName}'s Clawdy`,
    stage: 0,
    level: 1,
    xp: 0,
    food: 58,
    joy: 56,
    focus: 92,
    streak: 1,
    actionsToday: 0,
    lastSeen: Date.now(),
    lastQuestDate: today(),
    claimedToday: false,
    focusBoost: false,
    aura: false,
    lastOpenClawSyncDate: '',
    openclawSignals: {
      recentFiles: 0,
      awardedXp: 0,
      lastSyncedAt: null
    },
    badges: [],
    payments: {}
  };
}

function currentStageIndex(state) {
  let index = 0;
  STAGES.forEach((stage, i) => {
    if (state.level >= stage.level) index = i;
  });
  return index;
}

function earnBadge(state, id) {
  if (!state.badges.includes(id)) state.badges.push(id);
}

function addXp(state, amount) {
  state.xp += amount;
  while (state.xp >= 100) {
    state.xp -= 100;
    state.level += 1;
  }
  state.stage = currentStageIndex(state);
}

function normalizeState(state) {
  state.food = clamp(state.food);
  state.joy = clamp(state.joy);
  state.focus = clamp(state.focus);
  state.xp = clamp(state.xp);
  state.stage = currentStageIndex(state);
  state.badges = Array.isArray(state.badges) ? state.badges : [];
  state.payments = state.payments && typeof state.payments === 'object' ? state.payments : {};
  state.openclawSignals = state.openclawSignals && typeof state.openclawSignals === 'object'
    ? state.openclawSignals
    : { recentFiles: 0, awardedXp: 0, lastSyncedAt: null };
  return state;
}

function applyOfflineDecay(state) {
  const now = Date.now();
  const minutes = Math.max(0, Math.floor((now - (state.lastSeen || now)) / 60000));

  if (minutes > 0) {
    state.food = clamp(state.food - Math.min(24, minutes * 0.6));
    state.joy = clamp(state.joy - Math.min(18, minutes * 0.35));
    state.focus = clamp(state.focus + Math.min(30, minutes * 0.8));
  }

  if (state.lastQuestDate !== today()) {
    const previous = state.lastQuestDate ? new Date(state.lastQuestDate) : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.streak = previous && previous.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10)
      ? (state.streak || 0) + 1
      : 1;
    state.actionsToday = 0;
    state.claimedToday = false;
    state.lastQuestDate = today();
  }

  state.lastSeen = now;
  return normalizeState(state);
}

async function readState(user) {
  try {
    const raw = await fs.readFile(statePath(user.id), 'utf8');
    return applyOfflineDecay({ ...defaultState(user), ...JSON.parse(raw), userId: String(user.id) });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return defaultState(user);
  }
}

async function writeState(state) {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
  normalizeState(state);
  state.lastSeen = Date.now();
  await fs.writeFile(statePath(state.userId), JSON.stringify(state, null, 2));
}

async function scanOpenClawActivity(dir = ACTIVITY_DIR, now = Date.now()) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  const allowed = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
  let recentFiles = 0;
  let scanned = 0;

  async function walk(current, depth) {
    if (depth > 3 || scanned > 250) return;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'openclaw-pet') continue;
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile() || !allowed.has(path.extname(entry.name))) continue;
      scanned += 1;

      try {
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs >= cutoff) recentFiles += 1;
      } catch {}
    }
  }

  await walk(dir, 0);
  return { recentFiles, scanned, checkedAt: now };
}

function applyOpenClawActivity(state, signal) {
  state.openclawSignals = {
    recentFiles: signal.recentFiles,
    awardedXp: 0,
    lastSyncedAt: signal.checkedAt
  };

  if (state.lastOpenClawSyncDate === today()) {
    return 'OpenClaw activity already synced today.';
  }

  if (signal.recentFiles <= 0) {
    state.lastOpenClawSyncDate = today();
    return 'No recent OpenClaw activity found yet.';
  }

  const awardedXp = Math.min(40, signal.recentFiles * 8);
  state.openclawSignals.awardedXp = awardedXp;
  state.lastOpenClawSyncDate = today();
  state.joy = clamp(state.joy + Math.min(16, signal.recentFiles * 4));
  state.focus = clamp(state.focus + Math.min(12, signal.recentFiles * 3));
  state.actionsToday += 1;
  addXp(state, awardedXp);
  earnBadge(state, 'openclaw-sync');
  return `Synced ${signal.recentFiles} OpenClaw activity signal${signal.recentFiles === 1 ? '' : 's'}: +${awardedXp} XP`;
}

function publicState(state) {
  const { payments, ...safe } = state;
  return safe;
}

function validateInitData(initData) {
  if (!TOKEN) throw Object.assign(new Error('BOT_TOKEN is required for Telegram mode.'), { statusCode: 503 });
  if (!initData) throw Object.assign(new Error('Telegram initData is required.'), { statusCode: 401 });

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw Object.assign(new Error('Telegram initData hash is missing.'), { statusCode: 401 });

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const actual = Buffer.from(hash, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) {
    throw Object.assign(new Error('Telegram initData is invalid.'), { statusCode: 401 });
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (INIT_DATA_MAX_AGE_SECONDS > 0 && authDate && Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) {
    throw Object.assign(new Error('Telegram initData is expired.'), { statusCode: 401 });
  }

  const user = JSON.parse(params.get('user') || '{}');
  if (!user.id) throw Object.assign(new Error('Telegram user is missing.'), { statusCode: 401 });
  return user;
}

async function requireTelegramUser(req, res, next) {
  try {
    req.telegramUser = validateInitData(req.get('x-telegram-init-data') || '');
    next();
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

async function sendStart(chatId) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: '🐣 OpenClaw Pet is ready. Progress syncs through OpenClaw memory, and boosts use Telegram Stars.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Open Pet', web_app: { url: WEBAPP_URL } }],
        [{ text: '⭐ Star Boosts', web_app: { url: `${WEBAPP_URL}#shop` } }],
        [{ text: '🛟 Support', callback_data: 'support' }]
      ]
    }
  });
}

async function sendSupport(chatId) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: 'Support: reply here with your issue or use /paysupport for payment help. Privacy: only Telegram user id, pet progress, and payment payload status are stored in OpenClaw memory.'
  });
}

async function validatePreCheckout(query) {
  const parsed = parsePaymentPayload(query.invoice_payload);

  if (!parsed || !BOOSTS[parsed.sku]) {
    return { ok: false, error_message: 'Unknown OpenClaw Pet boost.' };
  }

  if (String(query.from.id) !== String(parsed.userId)) {
    return { ok: false, error_message: 'This invoice belongs to another Telegram account.' };
  }

  if (query.currency !== 'XTR' || query.total_amount !== BOOSTS[parsed.sku].amount) {
    return { ok: false, error_message: 'Invoice amount does not match the selected boost.' };
  }

  try {
    const state = await readState(query.from);
    const payment = state.payments[parsed.invoiceId];
    if (!payment || payment.sku !== parsed.sku || payment.status !== 'pending') {
      return { ok: false, error_message: 'This invoice is no longer active.' };
    }
  } catch {
    return { ok: false, error_message: 'Could not verify this invoice.' };
  }

  return { ok: true };
}

function applyAction(state, type) {
  const beforeStage = state.stage;
  const xpMap = { feed: 8, play: 12, code: state.focusBoost ? 32 : 16 };
  const messages = {
    feed: 'Clawdy devoured the build snack.',
    play: 'Joy restored with a quick mini-game.',
    code: state.focusBoost ? 'Focus Sprint doubled your coding XP.' : 'Clean code energy gained.'
  };

  if (!xpMap[type]) throw Object.assign(new Error('Unknown action.'), { statusCode: 400 });

  if (type === 'feed') {
    state.food = clamp(state.food + 22);
    state.focus = clamp(state.focus - 4);
  }

  if (type === 'play') {
    state.joy = clamp(state.joy + 20);
    state.food = clamp(state.food - 8);
    state.focus = clamp(state.focus - 8);
  }

  if (type === 'code') {
    state.focus = clamp(state.focus - 12);
    state.food = clamp(state.food - 7);
    state.joy = clamp(state.joy + 6);
    state.focusBoost = false;
  }

  addXp(state, xpMap[type]);
  state.actionsToday += 1;
  earnBadge(state, 'first-care');
  if (state.stage > beforeStage) earnBadge(state, 'evolved');

  return messages[type];
}

function applyBoost(state, sku) {
  if (sku === 'star-snack') {
    state.food = 100;
    state.joy = clamp(state.joy + 25);
  }

  if (sku === 'focus-sprint') {
    state.focusBoost = true;
    state.focus = clamp(state.focus + 18);
  }

  if (sku === 'legend-aura') {
    state.aura = true;
  }

  earnBadge(state, 'star-powered');
}

function parsePaymentPayload(payload) {
  const parts = String(payload || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'openclaw-pet') return null;
  return { userId: parts[1], sku: parts[2], invoiceId: parts[3] };
}

function applyPaidBoost(state, parsed, successfulPayment) {
  if (!parsed || !BOOSTS[parsed.sku]) return false;

  const payment = state.payments[parsed.invoiceId];
  if (!payment || payment.status !== 'pending') return false;

  payment.status = 'paid';
  payment.paidAt = Date.now();
  payment.currency = successfulPayment.currency;
  payment.totalAmount = successfulPayment.total_amount;
  payment.telegramPaymentChargeId = successfulPayment.telegram_payment_charge_id;
  payment.providerPaymentChargeId = successfulPayment.provider_payment_charge_id;
  applyBoost(state, parsed.sku);
  return true;
}

async function applySuccessfulPayment(message) {
  const parsed = parsePaymentPayload(message.successful_payment.invoice_payload);
  if (!parsed || !BOOSTS[parsed.sku]) return;

  const user = message.from || { id: parsed.userId, first_name: 'Agent' };
  const state = await readState({ ...user, id: parsed.userId });
  const applied = applyPaidBoost(state, parsed, message.successful_payment);
  if (!applied) return;

  await writeState(state);

  await callTelegram('sendMessage', {
    chat_id: message.chat.id,
    text: `⭐ ${BOOSTS[parsed.sku].title} activated. Reopen OpenClaw Pet to see the synced boost.`
  });
}

async function handleUpdate(update) {
  if (update.callback_query && update.callback_query.data === 'support') {
    await sendSupport(update.callback_query.message.chat.id);
    await callTelegram('answerCallbackQuery', { callback_query_id: update.callback_query.id });
    return;
  }

  if (update.pre_checkout_query) {
    const checkout = await validatePreCheckout(update.pre_checkout_query);
    await callTelegram('answerPreCheckoutQuery', {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ...checkout
    });
    return;
  }

  const message = update.message;
  if (!message) return;

  if (message.successful_payment) {
    await applySuccessfulPayment(message);
    return;
  }

  if (message.text && /^\/start support/.test(message.text)) {
    await sendSupport(message.chat.id);
    return;
  }

  if (message.text && /^\/(start|shop)/.test(message.text)) {
    await sendStart(message.chat.id);
    return;
  }

  if (message.text && /^\/(help|paysupport|privacy)/.test(message.text)) {
    await sendSupport(message.chat.id);
  }
}

async function startPolling() {
  let offset = 0;
  console.log('Telegram bot polling enabled.');

  while (true) {
    try {
      const updates = await callTelegram('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error(`Polling error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

app.get('/api/health', (req, res) => {
  const body = {
    ok: true,
    memoryConfigured: Boolean(MEMORY_DIR),
    activityConfigured: Boolean(ACTIVITY_DIR),
    telegramEnabled: Boolean(TOKEN)
  };

  if (process.env.SHOW_HEALTH_DETAILS === '1') {
    body.memoryDir = MEMORY_DIR;
    body.activityDir = ACTIVITY_DIR;
    body.webAppUrl = WEBAPP_URL;
  }

  res.json(body);
});

app.get('/api/state', requireTelegramUser, async (req, res) => {
  const state = await readState(req.telegramUser);
  await writeState(state);
  res.json({ mode: 'telegram', state: publicState(state) });
});

app.post('/api/action', requireTelegramUser, async (req, res) => {
  try {
    const state = await readState(req.telegramUser);
    const message = applyAction(state, req.body && req.body.type);
    await writeState(state);
    res.json({ message, state: publicState(state) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post('/api/quest/claim', requireTelegramUser, async (req, res) => {
  const state = await readState(req.telegramUser);
  if (state.actionsToday < 3 || state.claimedToday) {
    res.status(400).json({ error: 'Daily quest is not ready.' });
    return;
  }

  state.claimedToday = true;
  state.joy = clamp(state.joy + 18);
  earnBadge(state, 'daily-quest');
  addXp(state, 40);
  await writeState(state);
  res.json({ message: 'Daily quest claimed: +40 XP, +18 Joy', state: publicState(state) });
});

app.post('/api/social/share', requireTelegramUser, async (req, res) => {
  const state = await readState(req.telegramUser);
  earnBadge(state, 'social');
  await writeState(state);
  res.json({ state: publicState(state) });
});

app.post('/api/openclaw/sync', requireTelegramUser, async (req, res) => {
  try {
    const state = await readState(req.telegramUser);
    const signal = await scanOpenClawActivity();
    const message = applyOpenClawActivity(state, signal);
    await writeState(state);
    res.json({ message, state: publicState(state), signal });
  } catch (error) {
    res.status(500).json({ error: 'Could not sync OpenClaw activity.' });
  }
});

app.post('/telegram/webhook', async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET && req.get('x-telegram-bot-api-secret-token') !== TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Invalid Telegram webhook secret.' });
    return;
  }

  try {
    await handleUpdate(req.body || {});
    res.json({ ok: true });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    res.status(500).json({ error: 'Telegram webhook failed.' });
  }
});

app.post('/api/create-invoice', requireTelegramUser, async (req, res) => {
  const boost = BOOSTS[req.body && req.body.sku];
  if (!boost) {
    res.status(400).json({ error: 'Unknown boost.' });
    return;
  }

  const state = await readState(req.telegramUser);
  const invoiceId = crypto.randomUUID();
  state.payments[invoiceId] = {
    sku: req.body.sku,
    status: 'pending',
    createdAt: Date.now()
  };
  await writeState(state);

  try {
    const invoiceLink = await callTelegram('createInvoiceLink', {
      title: boost.title,
      description: boost.description,
      payload: `openclaw-pet:${req.telegramUser.id}:${req.body.sku}:${invoiceId}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: boost.title, amount: boost.amount }]
    });
    res.json({ invoiceLink });
  } catch (error) {
    state.payments[invoiceId].status = 'failed';
    state.payments[invoiceId].error = error.message;
    await writeState(state);
    res.status(500).json({ error: 'Could not create Stars invoice.' });
  }
});

app.get('/privacy', (req, res) => {
  res.type('text/plain').send('OpenClaw Pet stores Telegram user id, pet progress, badges, OpenClaw activity metadata, and Stars payment payload status in OpenClaw memory. No external database is used for v1.');
});

app.get('/support', (req, res) => {
  res.type('text/plain').send('OpenClaw Pet support: contact the bot chat and use /paysupport for payment issues.');
});

if (require.main === module) {
  if (TOKEN) {
    if (TELEGRAM_UPDATE_MODE === 'webhook') {
      console.log('Telegram bot webhook mode enabled.');
    } else if (TELEGRAM_UPDATE_MODE === 'polling') {
      startPolling();
    } else {
      throw new Error('TELEGRAM_UPDATE_MODE must be polling or webhook.');
    }
  } else {
    console.warn('BOT_TOKEN is not set. Web app runs locally; Telegram mode and Stars checkout are disabled.');
  }

  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = {
  BOOSTS,
  app,
  applyAction,
  applyBoost,
  applyOpenClawActivity,
  applyPaidBoost,
  defaultState,
  parsePaymentPayload,
  publicState,
  readState,
  scanOpenClawActivity,
  TELEGRAM_UPDATE_MODE,
  validateInitData,
  validatePreCheckout,
  writeState
};

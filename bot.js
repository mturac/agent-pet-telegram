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

const STAGES = [
  { name: 'Tiny Claw', level: 1 },
  { name: 'Baby Bot', level: 3 },
  { name: 'Code Cub', level: 6 },
  { name: 'Build Beast', level: 10 },
  { name: 'Claw Legend', level: 15 }
];

const CREATURES = [
  { id: 'spark-pup', name: 'Spark Pup', icon: '🐶' },
  { id: 'byte-kit', name: 'Byte Kit', icon: '🐱' },
  { id: 'claw-cub', name: 'Claw Cub', icon: '🐾' },
  { id: 'shell-drake', name: 'Shell Drake', icon: '🐲' }
];

const AGENT_COMMANDS = {
  status: {
    title: 'Status Check',
    message: 'Hermes status check recorded in OpenClaw memory.',
    xp: 8,
    focus: 4,
    joy: 2
  },
  focus: {
    title: 'Focus Run',
    message: 'Clawdy focus training queued from Telegram.',
    xp: 16,
    focus: 14,
    joy: 4
  },
  handoff: {
    title: 'Memory Handoff',
    message: 'OpenClaw memory handoff queued for Hermes.',
    xp: 12,
    focus: 8,
    joy: 8
  }
};

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
    hatched: false,
    creature: null,
    lastOpenClawSyncDate: '',
    openclawSignals: {
      recentFiles: 0,
      awardedXp: 0,
      lastSyncedAt: null
    },
    agent: {
      lastCommand: null,
      commands: []
    },
    badges: []
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
  if (state.badges.includes('star-powered') && !state.badges.includes('agent-pilot')) {
    state.badges.push('agent-pilot');
  }
  state.badges = state.badges.filter((badge) => badge !== 'star-powered');
  state.agent = state.agent && typeof state.agent === 'object' ? state.agent : {};
  state.agent.commands = Array.isArray(state.agent.commands) ? state.agent.commands.slice(-20) : [];
  state.agent.lastCommand = state.agent.lastCommand || null;
  state.hatched = Boolean(state.hatched);
  if (state.hatched && !CREATURES.some((creature) => creature.id === (state.creature && state.creature.id))) {
    state.creature = CREATURES[0];
  }
  if (!state.hatched) state.creature = null;
  state.openclawSignals = state.openclawSignals && typeof state.openclawSignals === 'object'
    ? state.openclawSignals
    : { recentFiles: 0, awardedXp: 0, lastSyncedAt: null };
  delete state.payments;
  delete state.focusBoost;
  delete state.aura;
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
  if (!state.hatched) throw Object.assign(new Error('Hatch Clawdy first.'), { statusCode: 400 });

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

function hatchPet(state) {
  normalizeState(state);
  if (state.hatched) return 'Clawdy is already hatched.';

  const creature = CREATURES[crypto.randomInt(CREATURES.length)];
  state.hatched = true;
  state.creature = creature;
  state.joy = clamp(state.joy + 18);
  state.focus = clamp(state.focus + 6);
  addXp(state, 12);
  earnBadge(state, 'hatched');
  return `Clawdy hatched as ${creature.name}.`;
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

function appUrl(hash = '') {
  const url = new URL(WEBAPP_URL);
  if (hash) url.hash = hash.replace(/^#/, '');
  return url.toString();
}

function startMessage(chatId) {
  return {
    chat_id: chatId,
    text: '🐣 OpenClaw Pet is ready. Manage Hermes through Telegram, sync OpenClaw memory, and keep agent progress visible.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Open Pet', web_app: { url: appUrl() } }],
        [{ text: '⌁ Agent Training', web_app: { url: appUrl('agent') } }],
        [{ text: '🛟 Support', callback_data: 'support' }]
      ]
    }
  };
}

async function sendStart(chatId) {
  return callTelegram('sendMessage', startMessage(chatId));
}

function agentMessage(chatId) {
  return {
    chat_id: chatId,
    text: '⌁ Agent Training is ready. Open Clawdy and run Hermes status, focus, or memory handoff commands.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⌁ Open Agent Training', web_app: { url: appUrl('agent') } }],
        [{ text: '🎮 Open Pet', web_app: { url: appUrl() } }]
      ]
    }
  };
}

async function sendAgent(chatId) {
  return callTelegram('sendMessage', agentMessage(chatId));
}

function syncMessage(chatId) {
  return {
    chat_id: chatId,
    text: '↺ OpenClaw Sync reads recent OpenClaw activity from the deploy host and turns it into Clawdy XP.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '↺ Sync OpenClaw', web_app: { url: appUrl('sync') } }],
        [{ text: '🎮 Open Pet', web_app: { url: appUrl() } }]
      ]
    }
  };
}

async function sendSync(chatId) {
  return callTelegram('sendMessage', syncMessage(chatId));
}

function supportMessage(chatId) {
  return {
    chat_id: chatId,
    text: 'Support: reply here with your issue. Privacy: only Telegram user id, pet progress, OpenClaw activity metadata, and Hermes command metadata are stored in OpenClaw memory.'
  };
}

async function sendSupport(chatId) {
  return callTelegram('sendMessage', supportMessage(chatId));
}

function applyAction(state, type) {
  if (!state.hatched) throw Object.assign(new Error('Hatch Clawdy first.'), { statusCode: 400 });

  const beforeStage = state.stage;
  const xpMap = { feed: 8, play: 12, code: 16 };
  const messages = {
    feed: 'Clawdy devoured the build snack.',
    play: 'Joy restored with a quick mini-game.',
    code: 'Clean code energy gained.'
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
  }

  addXp(state, xpMap[type]);
  state.actionsToday += 1;
  earnBadge(state, 'first-care');
  if (state.stage > beforeStage) earnBadge(state, 'evolved');

  return messages[type];
}

function applyAgentCommand(state, command) {
  if (!state.hatched) throw Object.assign(new Error('Hatch Clawdy first.'), { statusCode: 400 });

  const spec = AGENT_COMMANDS[command];
  if (!spec) throw Object.assign(new Error('Unknown Hermes command.'), { statusCode: 400 });

  normalizeState(state);
  const entry = {
    command,
    title: spec.title,
    createdAt: Date.now(),
    source: 'telegram'
  };
  state.agent.lastCommand = entry;
  state.agent.commands = [...state.agent.commands, entry].slice(-20);
  state.focus = clamp(state.focus + spec.focus);
  state.joy = clamp(state.joy + spec.joy);
  state.actionsToday += 1;
  addXp(state, spec.xp);
  earnBadge(state, 'agent-pilot');
  return spec.message;
}

async function handleUpdate(update) {
  if (update.callback_query && update.callback_query.data === 'support') {
    await sendSupport(update.callback_query.message.chat.id);
    await callTelegram('answerCallbackQuery', { callback_query_id: update.callback_query.id });
    return;
  }

  const message = update.message;
  if (!message) return;

  if (message.text && /^\/start support/.test(message.text)) {
    await sendSupport(message.chat.id);
    return;
  }

  if (message.text && /^\/agent/.test(message.text)) {
    await sendAgent(message.chat.id);
    return;
  }

  if (message.text && /^\/sync/.test(message.text)) {
    await sendSync(message.chat.id);
    return;
  }

  if (message.text && /^\/start/.test(message.text)) {
    await sendStart(message.chat.id);
    return;
  }

  if (message.text && /^\/(help|privacy)/.test(message.text)) {
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
        allowed_updates: ['message', 'callback_query']
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

app.post('/api/hatch', requireTelegramUser, async (req, res) => {
  try {
    const state = await readState(req.telegramUser);
    const message = hatchPet(state);
    await writeState(state);
    res.json({ message, state: publicState(state) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post('/api/agent/command', requireTelegramUser, async (req, res) => {
  try {
    const state = await readState(req.telegramUser);
    const message = applyAgentCommand(state, req.body && req.body.command);
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
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Could not sync OpenClaw activity.' });
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

app.get('/privacy', (req, res) => {
  res.type('text/plain').send('OpenClaw Pet stores Telegram user id, pet progress, badges, OpenClaw activity metadata, and Hermes command metadata in OpenClaw memory. No external database is used for v1.');
});

app.get('/support', (req, res) => {
  res.type('text/plain').send('OpenClaw Pet support: contact the bot chat for Hermes, OpenClaw sync, or app issues.');
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
    console.warn('BOT_TOKEN is not set. Web app runs locally; Telegram mode is disabled.');
  }

  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = {
  AGENT_COMMANDS,
  agentMessage,
  app,
  appUrl,
  applyAction,
  applyAgentCommand,
  applyOpenClawActivity,
  hatchPet,
  defaultState,
  publicState,
  readState,
  scanOpenClawActivity,
  startMessage,
  supportMessage,
  syncMessage,
  TELEGRAM_UPDATE_MODE,
  validateInitData,
  writeState
};

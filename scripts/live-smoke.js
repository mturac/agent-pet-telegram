const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const baseUrl = process.env.WEBAPP_URL || process.argv[2];
const token = process.env.BOT_TOKEN;
const requireOpenClawSignal = process.env.EXPECT_OPENCLAW_SIGNAL === '1';
const seedActivity = process.env.LIVE_SMOKE_SEED_ACTIVITY === '1';
const userId = Number(process.env.LIVE_SMOKE_USER_ID || Date.now());

if (!baseUrl) {
  throw new Error('Set WEBAPP_URL or pass a URL: npm run live:smoke -- https://app.example');
}

if (!token) {
  throw new Error('BOT_TOKEN is required to sign Telegram initData.');
}

function signedInitData(user) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `live-smoke-${user.id}`,
    user: JSON.stringify(user)
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function endpoint(route) {
  return new URL(route, baseUrl).toString();
}

async function readJson(response, route) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${route} returned ${response.status}: ${body.error || text}`);
  }
  return body;
}

async function request(route, initData, options = {}) {
  const response = await fetch(endpoint(route), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...(options.headers || {})
    }
  });
  return readJson(response, route);
}

function seedOpenClawActivity() {
  if (!seedActivity) return null;
  const activityDir = process.env.OPENCLAW_ACTIVITY_DIR;
  if (!activityDir) throw new Error('OPENCLAW_ACTIVITY_DIR is required when LIVE_SMOKE_SEED_ACTIVITY=1.');
  fs.mkdirSync(activityDir, { recursive: true });
  const file = path.join(activityDir, `live-smoke-${Date.now()}.md`);
  fs.writeFileSync(file, 'OpenClaw Pet live smoke activity.\n');
  return file;
}

(async () => {
  const seededFile = seedOpenClawActivity();
  const user = { id: userId, first_name: 'LiveSmoke' };
  const initData = signedInitData(user);

  const health = await fetch(endpoint('/api/health')).then((response) => readJson(response, '/api/health'));
  assert(health.ok && health.telegramEnabled, '/api/health must be ok with Telegram enabled.');

  const unauthorized = await fetch(endpoint('/api/state'));
  assert(unauthorized.status === 401, '/api/state without Telegram initData must return 401.');

  let body = await request('/api/state', initData);
  assert(body.state.userId === String(user.id), '/api/state must bind the signed Telegram user.');

  body = await request('/api/hatch', initData, { method: 'POST', body: '{}' });
  assert(body.state.hatched === true, '/api/hatch must hatch Clawdy.');
  assert(body.state.creature && body.state.creature.name, '/api/hatch must assign a creature.');

  body = await request('/api/state', initData);
  assert(body.state.hatched === true, '/api/state must preserve hatched progress after reopen.');

  for (const type of ['feed', 'play', 'code']) {
    body = await request('/api/action', initData, {
      method: 'POST',
      body: JSON.stringify({ type })
    });
    assert(body.state.badges.includes('first-care'), `/api/action ${type} must update server state.`);
  }

  body = await request('/api/quest/claim', initData, { method: 'POST', body: '{}' });
  assert(body.state.badges.includes('daily-quest'), '/api/quest/claim must award the daily quest badge.');

  for (const command of ['status', 'focus', 'handoff']) {
    body = await request('/api/agent/command', initData, {
      method: 'POST',
      body: JSON.stringify({ command })
    });
    assert(body.state.agent.lastCommand.command === command, `/api/agent/command ${command} must persist.`);
  }
  assert(body.state.badges.includes('agent-pilot'), '/api/agent/command must award agent-pilot.');

  body = await request('/api/social/share', initData, { method: 'POST', body: '{}' });
  assert(body.state.badges.includes('social'), '/api/social/share must award social badge.');

  body = await request('/api/openclaw/sync', initData, { method: 'POST', body: '{}' });
  if (requireOpenClawSignal) {
    assert(body.signal.recentFiles > 0, '/api/openclaw/sync must see recent OpenClaw activity.');
    assert(body.state.badges.includes('openclaw-sync'), '/api/openclaw/sync must award openclaw-sync.');
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    userId: String(user.id),
    hatched: body.state.hatched,
    lastAgentCommand: body.state.agent.lastCommand.command,
    badges: body.state.badges,
    openclawRecentFiles: body.signal.recentFiles,
    openclawAwardedXp: body.state.openclawSignals.awardedXp,
    seededActivity: Boolean(seededFile)
  }));
})();

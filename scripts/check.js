const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);

if (!scriptMatch) {
  throw new Error('public/index.html must include an inline script.');
}

assert.ok(html.includes('Bombaligrim_bot'), 'public/index.html must share the active Telegram bot link.');
assert.ok(!html.includes('OpenClawTamagotchi_bot'), 'public/index.html must not share the retired Telegram bot link.');

for (const file of [
  'bot.js',
  'scripts/configure-telegram.js',
  'scripts/preflight.js',
  'scripts/live-smoke.js',
  'scripts/check-bot-status.js',
  'scripts/set-bot-profile-photo.js',
  'scripts/package-submission.js'
]) {
  require('child_process').execFileSync(process.execPath, ['--check', file], {
    stdio: 'inherit'
  });
}

new Function(scriptMatch[1]);

process.env.BOT_TOKEN = '123456:check-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'check-secret';
process.env.INIT_DATA_MAX_AGE_SECONDS = '0';
process.env.OPENCLAW_PET_MEMORY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-pet-check-'));
process.env.OPENCLAW_ACTIVITY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-pet-activity-'));
fs.writeFileSync(path.join(process.env.OPENCLAW_ACTIVITY_DIR, 'today.md'), 'shipped one thing');
fs.mkdirSync(path.join(process.env.OPENCLAW_ACTIVITY_DIR, 'notes'), { recursive: true });
fs.writeFileSync(path.join(process.env.OPENCLAW_ACTIVITY_DIR, 'notes', 'build.json'), '{"ok":true}');

const {
  agentMessage: buildAgentMessage,
  applyAgentCommand,
  appUrl,
  app,
  defaultState,
  hatchPet,
  startMessage: buildStartMessage,
  supportMessage: buildSupportMessage,
  syncMessage: buildSyncMessage,
  validateInitData,
  writeState
} = require('../bot');

function signedInitData(user) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'check-query',
    user: JSON.stringify(user)
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

(async () => {
  const user = { id: 4242, first_name: 'Check' };
  assert.strictEqual(appUrl('agent'), 'http://localhost:3000/#agent');
  assert.strictEqual(appUrl('#sync'), 'http://localhost:3000/#sync');
  assert.strictEqual(buildStartMessage(1).reply_markup.inline_keyboard[1][0].web_app.url, 'http://localhost:3000/#agent');
  assert.strictEqual(buildAgentMessage(1).reply_markup.inline_keyboard[0][0].web_app.url, 'http://localhost:3000/#agent');
  assert.strictEqual(buildSyncMessage(1).reply_markup.inline_keyboard[0][0].web_app.url, 'http://localhost:3000/#sync');
  assert.match(buildSupportMessage(1).text, /Privacy/);
  assert.strictEqual(validateInitData(signedInitData(user)).id, user.id);
  assert.throws(() => validateInitData('user=%7B%7D&hash=bad'), /invalid|missing/i);

  const state = defaultState(user);
  const hatchMessage = hatchPet(state);
  assert.match(hatchMessage, /hatched/i);
  assert.strictEqual(state.hatched, true);
  assert.ok(state.creature && state.creature.name);
  const agentMessage = applyAgentCommand(state, 'focus');
  assert.match(agentMessage, /Clawdy focus training/i);
  assert.strictEqual(state.agent.lastCommand.command, 'focus');
  assert.ok(state.badges.includes('agent-pilot'));
  await writeState(state);

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const initData = signedInitData(user);

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return { body, response };
  }

  let result = await fetch(`${baseUrl}/api/state`);
  assert.strictEqual(result.status, 401);

  result = await request('/api/state');
  assert.strictEqual(result.response.status, 200);
  assert.strictEqual(result.body.state.userId, String(user.id));
  assert.strictEqual(result.body.state.hatched, true);

  const freshUser = { id: 5252, first_name: 'Fresh' };
  const freshInitData = signedInitData(freshUser);
  const hatchResponse = await fetch(`${baseUrl}/api/hatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': freshInitData
    },
    body: '{}'
  });
  const hatchBody = await hatchResponse.json();
  assert.strictEqual(hatchResponse.status, 200);
  assert.strictEqual(hatchBody.state.hatched, true);
  assert.ok(hatchBody.state.creature.name);

  for (const type of ['feed', 'play', 'code']) {
    result = await request('/api/action', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
    assert.strictEqual(result.response.status, 200);
  }

  result = await request('/api/agent/command', {
    method: 'POST',
    body: JSON.stringify({ command: 'handoff' })
  });
  assert.strictEqual(result.response.status, 200);
  assert.strictEqual(result.body.state.agent.lastCommand.command, 'handoff');
  assert.ok(result.body.state.badges.includes('agent-pilot'));

  result = await request('/api/agent/command', {
    method: 'POST',
    body: JSON.stringify({ command: 'unknown' })
  });
  assert.strictEqual(result.response.status, 400);

  result = await request('/api/quest/claim', {
    method: 'POST',
    body: '{}'
  });
  assert.strictEqual(result.response.status, 200);
  assert.ok(result.body.state.badges.includes('daily-quest'));

  result = await request('/api/social/share', {
    method: 'POST',
    body: '{}'
  });
  assert.strictEqual(result.response.status, 200);
  assert.ok(result.body.state.badges.includes('social'));

  result = await request('/api/openclaw/sync', {
    method: 'POST',
    body: '{}'
  });
  assert.strictEqual(result.response.status, 200);
  assert.ok(result.body.state.badges.includes('openclaw-sync'));
  assert.ok(result.body.signal.recentFiles >= 2);

  result = await request('/api/openclaw/sync', {
    method: 'POST',
    body: '{}'
  });
  assert.strictEqual(result.response.status, 200);
  assert.match(result.body.message, /already synced/i);

  result = await fetch(`${baseUrl}/telegram/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.strictEqual(result.status, 401);

  result = await fetch(`${baseUrl}/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'check-secret'
    },
    body: '{}'
  });
  assert.strictEqual(result.status, 200);

  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(process.env.OPENCLAW_PET_MEMORY_DIR, { recursive: true, force: true });
  fs.rmSync(process.env.OPENCLAW_ACTIVITY_DIR, { recursive: true, force: true });
  console.log('OpenClaw Pet checks passed.');
})();

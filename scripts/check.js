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

for (const file of ['bot.js', 'scripts/configure-telegram.js', 'scripts/preflight.js']) {
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
  BOOSTS,
  applyPaidBoost,
  app,
  defaultState,
  parsePaymentPayload,
  validateInitData,
  validatePreCheckout,
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
  assert.strictEqual(validateInitData(signedInitData(user)).id, user.id);
  assert.throws(() => validateInitData('user=%7B%7D&hash=bad'), /invalid|missing/i);

  const state = defaultState(user);
  state.payments.invoice_check = {
    sku: 'star-snack',
    status: 'pending',
    createdAt: Date.now()
  };
  await writeState(state);

  const payload = 'openclaw-pet:4242:star-snack:invoice_check';
  assert.deepStrictEqual(parsePaymentPayload(payload), {
    userId: '4242',
    sku: 'star-snack',
    invoiceId: 'invoice_check'
  });

  const checkout = await validatePreCheckout({
    from: user,
    currency: 'XTR',
    total_amount: BOOSTS['star-snack'].amount,
    invoice_payload: payload
  });
  assert.strictEqual(checkout.ok, true);

  const wrongAmount = await validatePreCheckout({
    from: user,
    currency: 'XTR',
    total_amount: 1,
    invoice_payload: payload
  });
  assert.strictEqual(wrongAmount.ok, false);

  const paymentState = defaultState(user);
  paymentState.payments.invoice_paid = {
    sku: 'focus-sprint',
    status: 'pending',
    createdAt: Date.now()
  };
  const paidPayload = parsePaymentPayload('openclaw-pet:4242:focus-sprint:invoice_paid');
  const firstApply = applyPaidBoost(paymentState, paidPayload, {
    currency: 'XTR',
    total_amount: BOOSTS['focus-sprint'].amount,
    telegram_payment_charge_id: 'tg_charge',
    provider_payment_charge_id: 'provider_charge'
  });
  assert.strictEqual(firstApply, true);
  assert.strictEqual(paymentState.focusBoost, true);
  assert.strictEqual(paymentState.payments.invoice_paid.status, 'paid');
  assert.strictEqual(paymentState.payments.invoice_paid.telegramPaymentChargeId, 'tg_charge');

  paymentState.focusBoost = false;
  const secondApply = applyPaidBoost(paymentState, paidPayload, {
    currency: 'XTR',
    total_amount: BOOSTS['focus-sprint'].amount,
    telegram_payment_charge_id: 'tg_charge_2',
    provider_payment_charge_id: 'provider_charge_2'
  });
  assert.strictEqual(secondApply, false);
  assert.strictEqual(paymentState.focusBoost, false);

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

  for (const type of ['feed', 'play', 'code']) {
    result = await request('/api/action', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
    assert.strictEqual(result.response.status, 200);
  }

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

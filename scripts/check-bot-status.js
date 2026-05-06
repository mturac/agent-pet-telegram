require('dotenv').config();

const token = process.env.BOT_TOKEN;
const expectedUrl = process.env.WEBAPP_URL;
const expectedBot = process.env.EXPECT_BOT_USERNAME || 'Bombaligrim_bot';
const requirePhoto = process.env.REQUIRE_BOT_PHOTO === '1';

if (!token) {
  throw new Error('BOT_TOKEN is required.');
}

async function callTelegram(method, params = {}) {
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `${method} failed`);
  return data.result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeUrl(value) {
  return value ? new URL(value).toString() : '';
}

(async () => {
  const me = await callTelegram('getMe');
  assert(me.username === expectedBot, `Expected @${expectedBot}, got @${me.username}.`);

  const [commands, menu, webhook, name, shortDescription, description, photos] = await Promise.all([
    callTelegram('getMyCommands'),
    callTelegram('getChatMenuButton'),
    callTelegram('getWebhookInfo'),
    callTelegram('getMyName'),
    callTelegram('getMyShortDescription'),
    callTelegram('getMyDescription'),
    callTelegram('getUserProfilePhotos', { user_id: me.id, limit: 1 })
  ]);

  const commandNames = commands.map((command) => command.command);
  for (const command of ['start', 'agent', 'sync', 'privacy', 'help']) {
    assert(commandNames.includes(command), `Missing /${command} command.`);
  }

  const menuUrl = menu.web_app && menu.web_app.url;
  if (expectedUrl) {
    const normalizedExpectedUrl = normalizeUrl(expectedUrl);
    assert(normalizeUrl(menuUrl) === normalizedExpectedUrl, `Menu URL mismatch: ${menuUrl || 'missing'}`);
    assert(normalizeUrl(webhook.url) === new URL('/telegram/webhook', normalizedExpectedUrl).toString(), 'Webhook URL mismatch.');
  }

  const photoCount = photos.total_count || 0;
  if (requirePhoto) assert(photoCount > 0, 'Bot profile photo is missing.');

  console.log(JSON.stringify({
    ok: true,
    username: me.username,
    name: name.name,
    hasShortDescription: Boolean(shortDescription.short_description),
    hasDescription: Boolean(description.description),
    commands: commandNames,
    menuUrl,
    webhookUrl: webhook.url || null,
    lastErrorMessage: webhook.last_error_message || null,
    photoCount
  }));
})();

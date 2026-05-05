const baseUrl = process.env.WEBAPP_URL || process.argv[2];
const expectTelegram = process.env.EXPECT_TELEGRAM === '1';

if (!baseUrl) {
  throw new Error('Set WEBAPP_URL or pass a URL: npm run check:deploy -- https://app.example');
}

async function readJson(path) {
  const response = await fetch(new URL(path, baseUrl));
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function expectStatus(path, status) {
  const response = await fetch(new URL(path, baseUrl));
  if (response.status !== status) {
    throw new Error(`${path} returned ${response.status}, expected ${status}`);
  }
}

(async () => {
  const health = await readJson('/api/health');
  if (!health.ok) throw new Error('/api/health did not return ok.');
  if (!health.memoryConfigured) throw new Error('/api/health must report memoryConfigured.');
  if (!health.activityConfigured) throw new Error('/api/health must report activityConfigured.');
  if (expectTelegram && !health.telegramEnabled) {
    throw new Error('telegramEnabled is false. Check BOT_TOKEN on the deploy host.');
  }

  await expectStatus('/', 200);
  await expectStatus('/support', 200);
  await expectStatus('/privacy', 200);
  await expectStatus('/api/state', expectTelegram ? 401 : 503);

  console.log(`Deploy checks passed for ${baseUrl}`);
})();

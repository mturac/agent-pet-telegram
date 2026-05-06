const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requireProduction = process.argv.includes('--require-production');
const failures = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function pass(message) {
  console.log(`ok - ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`fail - ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`warn - ${message}`);
}

function check(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function fileExists(file) {
  return fs.existsSync(path.join(root, file));
}

function fileSize(file) {
  return fs.statSync(path.join(root, file)).size;
}

function assertSnippet(file, snippet, label) {
  check(read(file).includes(snippet), `${file}: ${label}`);
}

function pngSize(file) {
  const buffer = fs.readFileSync(path.join(root, file));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${file} is not a PNG.`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function findBinary(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    try {
      execFileSync(candidate, ['-version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  return null;
}

const requiredFiles = [
  '.env.example',
  '.github/workflows/pages.yml',
  'APP_CENTER_SUBMISSION.md',
  'BOTFATHER_PACKET.md',
  'DEPLOYMENT.md',
  'GOAL_AUDIT.md',
  'LIVE_TEST_RESULTS.md',
  'MANUAL_COMPLETION_RUNBOOK.md',
  'PRODUCTION_INPUTS.md',
  'PRODUCT_REVIEW.md',
  'SUBMISSION_CHECKLIST.md',
  'assets/openclaw-pet-avatar.png',
  'assets/openclaw-pet-avatar.jpg',
  'assets/openclaw-pet-splash.png',
  'bot.js',
  'public/index.html',
  'scripts/capture-demo-video.js',
  'scripts/capture-screenshots.js',
  'scripts/check-bot-status.js',
  'scripts/check-deploy.js',
  'scripts/check.js',
  'scripts/configure-telegram.js',
  'scripts/live-smoke.js',
  'scripts/package-submission.js',
  'scripts/preflight.js',
  'scripts/set-bot-profile-photo.js',
  'submission/demo-video.mp4',
  'submission/screenshots/01-home.png',
  'submission/screenshots/02-agent-console.png',
  'submission/screenshots/03-badges.png',
  'submission/screenshots/04-support-privacy.png'
];

for (const file of requiredFiles) {
  check(fileExists(file), `${file} exists`);
}

for (const file of requiredFiles.filter(fileExists)) {
  check(fileSize(file) > 0, `${file} is not empty`);
}

const pkg = JSON.parse(read('package.json'));
for (const script of [
  'check',
  'preflight',
  'check:deploy',
  'bot:status',
  'bot:set-photo',
  'live:smoke',
  'telegram:configure',
  'audit:submission',
  'submission:package',
  'screenshots',
  'demo:video'
]) {
  check(Boolean(pkg.scripts && pkg.scripts[script]), `package script ${script}`);
}

assertSnippet('bot.js', 'validateInitData', 'Telegram initData validation');
assertSnippet('bot.js', "app.post('/api/hatch'", 'server-side hatch endpoint');
assertSnippet('bot.js', "app.post('/api/agent/command'", 'Hermes command endpoint');
assertSnippet('bot.js', "app.post('/api/openclaw/sync'", 'OpenClaw sync endpoint');
assertSnippet('bot.js', "app.post('/telegram/webhook'", 'Telegram webhook endpoint');
assertSnippet('public/index.html', 'localStorage', 'guest web fallback');
assertSnippet('public/index.html', 'shareWhatsApp', 'WhatsApp share link');
assertSnippet('public/index.html', 'Bombaligrim_bot', 'active Telegram bot link');
assertSnippet('public/index.html', 'Agent Training', 'agent virtual pet training surface');
assertSnippet('APP_CENTER_SUBMISSION.md', 'Telegram-first', 'submission positioning');
assertSnippet('BOTFATHER_PACKET.md', 'agent - Open Agent Training', 'BotFather agent command');
assertSnippet('BOTFATHER_PACKET.md', 'Bombaligrim_bot', 'active BotFather bot username');
assertSnippet('BOTFATHER_PACKET.md', 'https://35.224.135.8.sslip.io/', 'production BotFather Mini App URL');
assertSnippet('SUBMISSION_CHECKLIST.md', 'npm run telegram:configure', 'Telegram setup gate');
assertSnippet('SUBMISSION_CHECKLIST.md', 'npm run live:smoke', 'production signed smoke gate');
assertSnippet('SUBMISSION_CHECKLIST.md', 'npm run submission:package', 'Apps Center upload package gate');
assertSnippet('MANUAL_COMPLETION_RUNBOOK.md', 'REQUIRE_BOT_PHOTO=1', 'BotFather profile photo gate');
assertSnippet('MANUAL_COMPLETION_RUNBOOK.md', 'https://t.me/Bombaligrim_bot/pet', 'active direct Mini App link');

for (const file of [
  'submission/screenshots/01-home.png',
  'submission/screenshots/02-agent-console.png',
  'submission/screenshots/03-badges.png',
  'submission/screenshots/04-support-privacy.png'
]) {
  try {
    const size = pngSize(file);
    check(size.width === 500 && size.height === 900, `${file} is 500x900`);
  } catch (error) {
    fail(error.message);
  }
}

const ffprobe = findBinary([process.env.FFPROBE_BIN, 'ffprobe', '/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe']);
if (ffprobe && fileExists('submission/demo-video.mp4')) {
  const output = execFileSync(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration',
    '-of', 'csv=p=0',
    path.join(root, 'submission/demo-video.mp4')
  ], { encoding: 'utf8' }).trim();
  const [width, height, duration] = output.split(',').map(Number);
  check(width === 500 && height === 900 && duration >= 8, 'submission/demo-video.mp4 is 500x900 and >=8s');
} else {
  warn('ffprobe unavailable; skipped demo video dimension audit.');
}

const productionBlockers = [
  ['BOT_TOKEN', process.env.BOT_TOKEN],
  ['WEBAPP_URL', process.env.WEBAPP_URL],
  ['OPENCLAW_PET_MEMORY_DIR', process.env.OPENCLAW_PET_MEMORY_DIR],
  ['OPENCLAW_ACTIVITY_DIR', process.env.OPENCLAW_ACTIVITY_DIR]
].filter(([, value]) => !value);

if (productionBlockers.length) {
  const names = productionBlockers.map(([name]) => name).join(', ');
  const message = `production inputs missing: ${names}`;
  if (requireProduction) fail(message);
  else warn(message);
} else {
  pass('production environment inputs present');
}

if (read('LIVE_TEST_RESULTS.md').includes('- [ ]')) {
  const message = 'LIVE_TEST_RESULTS.md still contains unchecked production tests';
  if (requireProduction) fail(message);
  else warn(message);
}

if (read('public/index.html').includes('OpenClawTamagotchi_bot')) {
  fail('public/index.html still contains the retired Telegram bot link');
}

const userVisibleFiles = [
  'APP_CENTER_SUBMISSION.md',
  'BOTFATHER_PACKET.md',
  'DEPLOYMENT.md',
  'MANUAL_COMPLETION_RUNBOOK.md',
  'PRODUCTION_INPUTS.md',
  'PRODUCT_REVIEW.md',
  'SUBMISSION_CHECKLIST.md',
  'assets/openclaw-pet-splash.svg',
  'public/index.html'
];

const retiredPaymentCopy = /\b(Stars?|XTR|payments?|paid|purchase|boosts?|invoice|pre-checkout|checkout|paysupport)\b/i;
for (const file of userVisibleFiles.filter(fileExists)) {
  if (retiredPaymentCopy.test(read(file))) {
    fail(`${file} contains retired Stars/payment copy`);
  }
}

if (failures.length) {
  console.error(`Submission audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Submission audit passed locally with ${warnings.length} production warning(s).`);

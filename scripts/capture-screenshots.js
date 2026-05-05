const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.WEBAPP_URL || process.argv[2] || 'http://localhost:3002';
const outDir = path.join(__dirname, '..', 'submission', 'screenshots');
const width = process.env.SCREENSHOT_WIDTH || '500';
const height = process.env.SCREENSHOT_HEIGHT || '900';
const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome',
  'chromium',
  'chromium-browser'
].filter(Boolean);

function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  throw new Error('Chrome/Chromium was not found. Set CHROME_BIN.');
}

function capture(chrome, name, hash = '') {
  const pageUrl = new URL(baseUrl);
  pageUrl.searchParams.set('demo', '1');
  if (hash) pageUrl.hash = hash.replace(/^#/, '');
  const url = pageUrl.toString();
  const output = path.join(outDir, `${name}.png`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--virtual-time-budget=1800',
    `--screenshot=${output}`,
    url
  ], { stdio: 'ignore' });
  return output;
}

fs.mkdirSync(outDir, { recursive: true });
const chrome = findChrome();
const files = [
  capture(chrome, '01-home'),
  capture(chrome, '02-star-boosts', '#shop'),
  capture(chrome, '03-badges', '#badges'),
  capture(chrome, '04-support-privacy', '#help')
];

console.log(`Captured ${files.length} screenshots in ${outDir}`);

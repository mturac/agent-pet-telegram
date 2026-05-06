const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'submission', 'upload-package');
const zipPath = path.join(root, 'submission', 'openclaw-pet-apps-center.zip');

const files = [
  ['APP_CENTER_SUBMISSION.md', 'copy'],
  ['BOTFATHER_PACKET.md', 'copy'],
  ['MANUAL_COMPLETION_RUNBOOK.md', 'copy'],
  ['SUBMISSION_CHECKLIST.md', 'copy'],
  ['assets/openclaw-pet-avatar.png', 'copy'],
  ['assets/openclaw-pet-avatar.jpg', 'copy'],
  ['assets/openclaw-pet-splash.png', 'copy'],
  ['submission/demo-video.mp4', 'copy'],
  ['submission/screenshots/01-home.png', 'copy'],
  ['submission/screenshots/02-agent-console.png', 'copy'],
  ['submission/screenshots/03-badges.png', 'copy'],
  ['submission/screenshots/04-support-privacy.png', 'copy']
];

function copyIntoPackage(source) {
  const from = path.join(root, source);
  if (!fs.existsSync(from)) throw new Error(`Missing package file: ${source}`);
  const to = path.join(outDir, source.replace(/^submission\//, ''));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function commandExists(command) {
  return spawnSync(command, ['-v'], { stdio: 'ignore' }).status === 0;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const [file] of files) copyIntoPackage(file);

fs.writeFileSync(
  path.join(outDir, 'UPLOAD_ORDER.md'),
  [
    '# Upload Order',
    '',
    '1. Set BotFather Main Mini App URL to `https://35.224.135.8.sslip.io/`.',
    '2. Upload `assets/openclaw-pet-splash.png` as splash media.',
    '3. Use screenshots from `screenshots/`.',
    '4. Use `demo-video.mp4` as the Apps Center video.',
    '5. Run the Telegram mobile checklist in `MANUAL_COMPLETION_RUNBOOK.md`.',
    ''
  ].join('\n')
);

fs.rmSync(zipPath, { force: true });
let zipped = false;
if (commandExists('zip')) {
  const result = spawnSync('zip', ['-qr', zipPath, '.'], { cwd: outDir });
  if (result.status !== 0) throw new Error('zip failed.');
  zipped = true;
}

console.log(JSON.stringify({
  ok: true,
  packageDir: path.relative(root, outDir),
  zip: zipped ? path.relative(root, zipPath) : null,
  files: files.length + 1
}));

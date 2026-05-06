const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const screenshotDir = path.join(root, 'submission', 'screenshots');
const output = path.join(root, 'submission', 'demo-video.mp4');
const frameSeconds = Number(process.env.DEMO_FRAME_SECONDS || 2);
const ffmpegCandidates = [process.env.FFMPEG_BIN, 'ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']
  .filter(Boolean);

function findFfmpeg() {
  for (const candidate of ffmpegCandidates) {
    try {
      execFileSync(candidate, ['-version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  throw new Error('ffmpeg was not found. Install ffmpeg or set FFMPEG_BIN.');
}

function escapeConcatPath(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

const frames = [
  '01-home.png',
  '02-agent-console.png',
  '03-badges.png',
  '04-support-privacy.png'
].map((name) => path.join(screenshotDir, name));

const missing = frames.filter((file) => !fs.existsSync(file));
if (missing.length) {
  throw new Error(`Missing screenshots: ${missing.map((file) => path.basename(file)).join(', ')}. Run npm run screenshots first.`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const concatFile = path.join(os.tmpdir(), `openclaw-pet-demo-${Date.now()}.txt`);
const lines = [];
for (const frame of frames) {
  lines.push(`file '${escapeConcatPath(frame)}'`);
  lines.push(`duration ${frameSeconds}`);
}
lines.push(`file '${escapeConcatPath(frames[frames.length - 1])}'`);
fs.writeFileSync(concatFile, `${lines.join('\n')}\n`);

try {
  const ffmpeg = findFfmpeg();
  execFileSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-vf', 'scale=500:900:force_original_aspect_ratio=decrease,pad=500:900:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p',
    '-movflags', '+faststart',
    output
  ], { stdio: 'ignore' });
  console.log(`Captured demo video at ${output}`);
} finally {
  fs.rmSync(concatFile, { force: true });
}

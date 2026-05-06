const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const photoPath = process.env.BOT_PROFILE_PHOTO || path.join(__dirname, '..', 'assets', 'openclaw-pet-avatar.jpg');

if (!token) {
  throw new Error('BOT_TOKEN is required.');
}

if (!fs.existsSync(photoPath)) {
  throw new Error(`Profile photo does not exist: ${photoPath}`);
}

if (path.extname(photoPath).toLowerCase() !== '.jpg' && path.extname(photoPath).toLowerCase() !== '.jpeg') {
  throw new Error('Telegram setMyProfilePhoto requires a static JPG photo.');
}

(async () => {
  const form = new FormData();
  form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://profile_photo' }));
  form.append(
    'profile_photo',
    new Blob([fs.readFileSync(photoPath)], { type: 'image/jpeg' }),
    path.basename(photoPath)
  );

  const response = await fetch(`https://api.telegram.org/bot${token}/setMyProfilePhoto`, {
    method: 'POST',
    body: form
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || 'setMyProfilePhoto failed');
  console.log(JSON.stringify({ ok: true, photo: path.basename(photoPath) }));
})();

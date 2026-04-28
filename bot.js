const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com';

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🐣 Agent Pet is waiting!', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🎮 Open Pet',
        web_app: { url: WEBAPP_URL }
      }]]
    }
  });
});

app.listen(3000, () => console.log('🚀 Server on port 3000'));

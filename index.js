require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { DateTime } = require('luxon');

const botLogic = require('./src/botLogic');
const timetableData = require('./src/timetable');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const SUBSCRIBERS_FILE = path.join(__dirname, 'data/subscribers.json');

// Root route - Modernized Web Dashboard
app.get('/', (req, res) => {
  const lastUpdate = DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy/MM/dd HH:mm:ss');

  const html = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>時間割LINE Bot ダッシュボード</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body { font-family: 'Inter', 'Hiragino Kaku Gothic ProN', sans-serif; }
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900 min-h-screen">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <!-- Header -->
      <header class="text-center mb-12">
        <h1 class="text-4xl font-extrabold text-green-600 mb-2 flex items-center justify-center gap-3">
          <i class="fab fa-line text-5xl"></i>
          時間割LINE Bot
        </h1>
        <p class="text-slate-500">毎日の授業をもっとスマートに確認</p>
      </header>

      <!-- Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div class="bg-green-100 p-3 rounded-full text-green-600">
            <i class="fas fa-server"></i>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</p>
            <p class="font-bold text-green-600">稼働中</p>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div class="bg-blue-100 p-3 rounded-full text-blue-600">
            <i class="fas fa-clock"></i>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Last Sync</p>
            <p class="font-bold">${lastUpdate}</p>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div class="bg-purple-100 p-3 rounded-full text-purple-600">
            <i class="fas fa-bell"></i>
          </div>
          <div>
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Auto Notification</p>
            <p class="font-bold">毎日 07:00 JST</p>
          </div>
        </div>
      </div>

      <!-- Timetable Section -->
      <section class="bg-white rounded-3xl shadow-xl overflow-hidden mb-12 border border-slate-200">
        <div class="bg-green-600 px-8 py-6 flex justify-between items-center">
          <h2 class="text-white text-xl font-bold flex items-center gap-2">
            <i class="fas fa-calendar-alt"></i>
            週間時間割
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">曜日</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">1限</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">2限</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">3限</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">4限</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">5限</th>
                <th class="px-6 py-4 text-slate-500 font-semibold border-b">6限</th>
              </tr>
            </thead>
            <tbody>
              ${['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'].map(day => {
                const subjects = timetableData[day];
                return `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 border-b font-bold text-green-700 bg-green-50/50">${day}</td>
                  ${subjects.map(s => `<td class="px-6 py-4 border-b text-sm text-slate-600">${s}</td>`).join('')}
                  ${subjects.length < 6 ? Array(6 - subjects.length).fill('<td class="px-6 py-4 border-b text-sm text-slate-300">-</td>').join('') : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Usage and QR -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
            <i class="fas fa-terminal text-green-500"></i>
            使い方
          </h2>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold mt-1 whitespace-nowrap">Command</span>
              <div>
                <p class="font-semibold">今日の時間割 / 明日の時間割</p>
                <p class="text-sm text-slate-500">直近の予定を即座に確認できます</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold mt-1 whitespace-nowrap">Command</span>
              <div>
                <p class="font-semibold">〇曜日の時間割</p>
                <p class="text-sm text-slate-500">特定の曜日の授業をチェック</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold mt-1 whitespace-nowrap">Feature</span>
              <div>
                <p class="font-semibold">モーニング通知</p>
                <p class="text-sm text-slate-500">毎朝7時に自動で通知が届きます</p>
              </div>
            </li>
          </ul>
        </section>

        <section class="bg-slate-900 p-8 rounded-3xl shadow-sm text-white flex flex-col items-center justify-center text-center">
          <h2 class="text-2xl font-bold mb-4">今すぐ友だち追加</h2>
          <p class="text-slate-400 mb-6 text-sm text-wrap">QRコードをスキャンして、<br>あなたのLINEに時間割を。</p>
          <div class="bg-white p-4 rounded-2xl mb-4">
            <img src="/QR.png" alt="LINE QR Code" class="w-40 h-40">
          </div>
          <p class="text-xs text-slate-500">SHS 2D Class Bot Project</p>
        </section>
      </div>

      <footer class="mt-16 text-center text-slate-400 text-sm">
        <p>© ${DateTime.now().year} 時間割LINE Bot. All rights reserved.</p>
      </footer>
    </div>
  </body>
  </html>`;
  res.send(html);
});

// Webhook
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(req.body.events.map(event => botLogic.handleEvent(event, client)));
    res.json(results);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook is healthy');
});

// Morning Notification Cron Job (7:00 AM JST)
cron.schedule('0 7 * * *', async () => {
  console.log('Running morning notification task...');
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
      const timetableFlex = botLogic.getTodayTimetable();

      console.log(`Sending morning notification to ${subscribers.length} subscribers`);

      for (const id of subscribers) {
        try {
          await client.pushMessage(id, timetableFlex);
        } catch (pushErr) {
          console.error(`Failed to push to ${id}:`, pushErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Tokyo"
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot server is running on port ${port}`);
});

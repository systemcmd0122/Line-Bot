require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { DateTime } = require('luxon');
const axios = require('axios');

const botLogic = require('./src/botLogic');
const timetableData = require('./src/timetable');
const googleCalendar = require('./src/googleCalendar');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const SUBSCRIBERS_FILE = path.join(__dirname, 'data/subscribers.json');
const CHATS_FILE = path.join(__dirname, 'data/chats.json');

// API to get events
app.get('/api/events', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || DateTime.now().setZone('Asia/Tokyo').year;
    const month = parseInt(req.query.month) || DateTime.now().setZone('Asia/Tokyo').month;
    const calendarIds = (process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || '').split(',').filter(id => id.trim());

    if (calendarIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const events = await googleCalendar.getEventsForMonth(calendarIds, year, month);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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

      <!-- Calendar Events Section -->
      <section class="bg-white rounded-3xl shadow-xl overflow-hidden mb-12 border border-slate-200">
        <div class="bg-blue-600 px-8 py-6 flex justify-between items-center">
          <h2 class="text-white text-xl font-bold flex items-center gap-2">
            <i class="fas fa-calendar-day"></i>
            行事予定 (${DateTime.now().setZone('Asia/Tokyo').toFormat('LL月')})
          </h2>
        </div>
        <div id="events-container" class="p-6">
          <div class="animate-pulse flex space-y-4 flex-col">
            <div class="h-4 bg-slate-200 rounded w-3/4"></div>
            <div class="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </section>

      <script>
        async function loadEvents() {
          const container = document.getElementById('events-container');
          try {
            const response = await fetch('/api/events');
            const result = await response.json();

            if (result.success && result.data.length > 0) {
              container.innerHTML = \`
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  \${result.data.map(event => {
                    const date = new Date(event.start).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                    return \`
                    <div class="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                      <div class="text-xs font-bold text-blue-600 mb-1">\${date}</div>
                      <div class="font-bold text-slate-800">\${event.summary}</div>
                      \${event.location ? \`<div class="text-xs text-slate-500 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>\${event.location}</div>\` : ''}
                    </div>
                    \`;
                  }).join('')}
                </div>
              \`;
            } else {
              container.innerHTML = '<p class="text-slate-400 text-center py-8">今月の予定はありません</p>';
            }
          } catch (err) {
            container.innerHTML = '<p class="text-red-400 text-center py-8">予定の読み込みに失敗しました</p>';
          }
        }
        loadEvents();
      </script>

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
                <p class="font-semibold">今日の時間割 / 今日の行事</p>
                <p class="text-sm text-slate-500">直近の授業や行事を即座に確認できます</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold mt-1 whitespace-nowrap">Command</span>
              <div>
                <p class="font-semibold">明日の時間割 / 明日の行事</p>
                <p class="text-sm text-slate-500">翌日の予定を先取りしてチェック</p>
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

// Admin Dashboard
app.get('/admin', (req, res) => {
  const password = req.query.pw;
  if (password !== process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Forbidden</h1><p>Invalid password.</p>');
  }

  let subscribersCount = 0;
  if (fs.existsSync(SUBSCRIBERS_FILE)) {
    subscribersCount = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8')).length;
  }

  let chats = {};
  if (fs.existsSync(CHATS_FILE)) {
    chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
  }
  const chatsCount = Object.keys(chats).length;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
      <h1 class="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-blue-600 text-sm font-bold uppercase">Subscribers</p>
          <p class="text-3xl font-bold">${subscribersCount}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-green-600 text-sm font-bold uppercase">Total Chats (Groups/Users)</p>
          <p class="text-3xl font-bold">${chatsCount}</p>
        </div>
      </div>

      <h2 class="text-xl font-bold mb-4">Broadcast Announcement</h2>
      <form action="/admin/broadcast?pw=${password || ''}" method="POST" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Message</label>
          <textarea name="message" rows="4" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Enter message to all chats..."></textarea>
        </div>
        <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 transition">Send to All ${chatsCount} Chats</button>
      </form>
    </div>
  </body>
  </html>`;
  res.send(html);
});

// Broadcast Logic
app.post('/admin/broadcast', express.urlencoded({ extended: true }), async (req, res) => {
  const password = req.query.pw;
  if (password !== process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD) {
    return res.status(403).send('Forbidden');
  }

  const { message } = req.body;
  if (!message) return res.status(400).send('Message is required');

  if (fs.existsSync(CHATS_FILE)) {
    const chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    const chatIds = Object.keys(chats);

    console.log(`Broadcasting message to ${chatIds.length} chats...`);

    // Send messages in background
    for (const id of chatIds) {
      try {
        await client.pushMessage(id, { type: 'text', text: message });
      } catch (err) {
        console.error(`Failed to broadcast to ${id}:`, err.message);
      }
    }
  }

  res.send('<h1>Broadcast started</h1><p>Messages are being sent to all tracked chats.</p><a href="/admin?pw=' + (password || '') + '">Back to Dashboard</a>');
});

// Self-pinging to stay awake on Koyeb (every 10 minutes)
const SITE_URL = process.env.SITE_URL;
if (SITE_URL) {
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log(`Self-pinging: ${SITE_URL}`);
      await axios.get(SITE_URL);
    } catch (err) {
      console.error('Self-ping error:', err.message);
    }
  });
}

// Morning Notification Cron Job (7:00 AM JST)
cron.schedule('0 7 * * *', async () => {
  console.log('Running morning notification task...');
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
      const timetableFlex = await botLogic.getTodayTimetable();

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

// Koyeb用 LINE時間割ボット（設定機能なし・動作確認サイト付き・毎日24時自動送信機能付き）
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const cron = require('node-cron');

const config = {
  channelAccessToken: 'a0jMn1h2zhLfz4+XCzpjWG8GnQAtp6ub3EO6ZNzvMl5RYHCaHMBK7lxVSdgAm2zJVRO3SsWPXlJfHs1FRjdzcj0rq+7iDe4H5ZsBNKPBY9cQYDdAAdjBCr21SCTV2XQPSvoX3KtZESwRL/P9/+CB8wdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'ac94f72d2a8718696eed8e830e4682d8'
};

// 時間割データ（静的）
const timetableData = {
  "月曜日": ["地理総合", "ハードウェア技術", "プログラミング技術", "コンピュータシステム", "体育", "Ⅰ類：数学・Ⅱ類：物理"],
  "火曜日": ["プログラミング技術", "Ⅰ類：電気回路・Ⅱ類：物理", "Ⅰ類：英語・Ⅱ類：国語", "Ⅰ類：物理・Ⅱ類：数学", "コンピュータシステム"],
  "水曜日": ["Ⅰ類：数学・Ⅱ類：物理", "ハードウェア技術", "Ⅰ類：国語・Ⅱ類：英語", "Ⅰ類：物理・Ⅱ類：数学", "Ⅰ類：英語・Ⅱ類：国語", "体育"],
  "木曜日": ["実習", "実習", "実習", "実習", "ハードウェア技術", "LHR"],
  "金曜日": ["Ⅰ類：国語・Ⅱ類：英語", "Ⅰ類：英語・Ⅱ類：国語", "Ⅰ類：電気回路・Ⅱ類：数学", "地理総合", "Ⅰ類：数学・Ⅱ類：物理", "保健"],
  "土曜日": [],
  "日曜日": []
};

// ユーザーIDを保存する配列
const subscribedUsers = new Set();

const app = express();

// 静的ファイルの提供設定を追加
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const SITE_URL = 'https://wasteful-morgan-tisk01010100-446ccc96.koyeb.app/';

const client = new line.Client(config);

app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>時間割LINE Bot</title>
    <style>
      :root {
        --primary-color: #4CAF50;
        --background-color: #ffffff;
        --text-color: #333333;
        --border-color: #dddddd;
        --hover-color: #45a049;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        background-color: var(--background-color);
        padding: 20px;
      }

      .container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
      }

      h1 {
        color: var(--primary-color);
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 10px;
        margin-bottom: 20px;
        font-size: 2em;
        text-align: center;
      }

      h2 {
        color: var(--primary-color);
        margin: 30px 0 15px;
        font-size: 1.5em;
      }

      .status {
        background-color: #f1f8e9;
        border-left: 5px solid var(--primary-color);
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }

      .status h2 {
        margin-top: 0;
        color: var(--primary-color);
      }

      .commands {
        background-color: #f5f5f5;
        border: 1px solid var(--border-color);
        padding: 20px;
        border-radius: 4px;
        margin: 20px 0;
      }

      .commands ul {
        list-style-type: none;
        padding-left: 0;
      }

      .commands li {
        margin-bottom: 10px;
        padding-left: 20px;
        position: relative;
      }

      .commands li:before {
        content: "•";
        color: var(--primary-color);
        font-weight: bold;
        position: absolute;
        left: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background-color: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      th, td {
        border: 1px solid var(--border-color);
        padding: 12px;
        text-align: left;
      }

      th {
        background-color: var(--primary-color);
        color: white;
        font-weight: 600;
      }

      tr:nth-child(even) {
        background-color: #f9f9f9;
      }

      .day {
        font-weight: bold;
        background-color: #f1f8e9;
      }

      .qr-section {
        margin: 30px 0;
        text-align: center;
      }

      .qr-section img {
        max-width: 200px;
        height: auto;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 10px;
        background-color: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
        text-align: center;
        color: #666;
      }

      @media (max-width: 768px) {
        .container {
          padding: 15px;
        }

        table {
          font-size: 14px;
        }

        th, td {
          padding: 8px;
        }

        .commands {
          padding: 15px;
        }
      }

      @media (max-width: 480px) {
        table {
          font-size: 12px;
        }

        th, td {
          padding: 6px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>時間割LINE Bot</h1>
      
      <div class="status">
        <h2>ステータス</h2>
        <p>✅ サーバー稼働中</p>
        <p>最終起動日時: ${new Date().toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</p>
        <p>✅ 毎日24時（0時）に明日の時間割を自動送信</p>
      </div>
      
      <h2>使用可能なコマンド</h2>
      <div class="commands">
        <ul>
          <li><strong>今日の時間割</strong> - 今日の時間割を表示します</li>
          <li><strong>明日の時間割</strong> - 明日の時間割を表示します</li>
          <li><strong>月曜日の時間割</strong> (他の曜日も同様) - 指定した曜日の時間割を表示します</li>
          <li><strong>自動通知オン</strong> - 毎日24時に明日の時間割を自動送信します</li>
          <li><strong>自動通知オフ</strong> - 自動送信を停止します</li>
          <li><strong>使い方</strong> or <strong>ヘルプ</strong> - コマンド一覧を表示します</li>
        </ul>
      </div>
      
      <h2>時間割表</h2>
      <div style="overflow-x: auto;">
        <table>
          <tr>
            <th>曜日</th>
            <th>1時間目</th>
            <th>2時間目</th>
            <th>3時間目</th>
            <th>4時間目</th>
            <th>5時間目</th>
            <th>6時間目</th>
          </tr>
          ${Object.entries(timetableData)
            .filter(([day]) => day !== '土曜日' && day !== '日曜日')
            .map(([day, subjects]) => `
            <tr>
              <td class="day">${day}</td>
              ${subjects.map(subject => `<td>${subject}</td>`).join('')}
            </tr>
          `).join('')}
        </table>
      </div>
      
      <div class="qr-section">
        <h2>友だち追加</h2>
        <p>下記QRコードを読み取って、LINE Botを友だち追加してください。</p>
        <img src="/QR.png" alt="LINE Bot QRコード" />
      </div>
      
      <footer>
        <p>© ${new Date().getFullYear()} 時間割LINE Bot</p>
        <p>最終更新: ${new Date().toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</p>
      </footer>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook is healthy');
});

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();
  let replyMessage = '';
  
  // グループチャットとプライベートチャットの判定
  const isGroupChat = event.source.type === 'group' || event.source.type === 'room';
  
  // ユーザーIDまたはグループID/ルームIDを取得
  let chatId;
  if (event.source.type === 'user') {
    chatId = event.source.userId;
  } else if (event.source.type === 'group') {
    chatId = event.source.groupId;
  } else if (event.source.type === 'room') {
    chatId = event.source.roomId;
  }

  // グループチャットの場合は「使い方」か「ヘルプ」または自動通知関連コマンドのみ反応
  if (isGroupChat) {
    if (userMessage === '使い方' || userMessage === 'ヘルプ') {
      replyMessage = `【時間割ボットの使い方】
・「今日の時間割」：今日の時間割を表示します
・「明日の時間割」：明日の時間割を表示します
・「〇曜日の時間割」：指定した曜日の時間割を表示します
・「自動通知オン」：毎日24時に明日の時間割を自動送信します
・「自動通知オフ」：自動送信を停止します

詳しい使い方と時間割表はこちらのサイトでご確認いただけます：
${SITE_URL}`;
    }
    else if (userMessage === '自動通知オン') {
      if (!subscribedUsers.has(chatId)) {
        subscribedUsers.add(chatId);
        replyMessage = '自動通知をオンにしました。毎日24時（0時）に明日の時間割を送信します。';
      } else {
        replyMessage = 'すでに自動通知はオンになっています。';
      }
    }
    else if (userMessage === '自動通知オフ') {
      if (subscribedUsers.has(chatId)) {
        subscribedUsers.delete(chatId);
        replyMessage = '自動通知をオフにしました。';
      } else {
        replyMessage = '自動通知はすでにオフになっています。';
      }
    } else {
      // グループチャットで対象外のメッセージには反応しない
      return Promise.resolve(null);
    }
  } else {
    // 個人チャットの場合は通常通り全ての機能に反応
    if (userMessage === '使い方' || userMessage === 'ヘルプ') {
      replyMessage = `【時間割ボットの使い方】
・「今日の時間割」：今日の時間割を表示します
・「明日の時間割」：明日の時間割を表示します
・「〇曜日の時間割」：指定した曜日の時間割を表示します
・「自動通知オン」：毎日24時に明日の時間割を自動送信します
・「自動通知オフ」：自動送信を停止します

詳しい使い方と時間割表はこちらのサイトでご確認いただけます：
${SITE_URL}`;
    } 
    else if (userMessage === '今日の時間割') {
      const today = new Date();
      // 日本時間に調整
      const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
      const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][jstToday.getUTCDay()];
      replyMessage = getTimetableForDay(dayOfWeek);
    } 
    else if (userMessage === '明日の時間割') {
      const today = new Date();
      // 日本時間に調整
      const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
      const tomorrow = new Date(jstToday);
      tomorrow.setDate(jstToday.getDate() + 1);
      const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][tomorrow.getUTCDay()];
      replyMessage = getTimetableForDay(dayOfWeek);
    } 
    else if (/^(月|火|水|木|金|土|日)曜日の時間割$/.test(userMessage)) {
      const dayOfWeek = userMessage.replace('の時間割', '');
      replyMessage = getTimetableForDay(dayOfWeek);
    } 
    else if (userMessage === '自動通知オン') {
      if (!subscribedUsers.has(chatId)) {
        subscribedUsers.add(chatId);
        replyMessage = '自動通知をオンにしました。毎日24時（0時）に明日の時間割を送信します。';
      } else {
        replyMessage = 'すでに自動通知はオンになっています。';
      }
    }
    else if (userMessage === '自動通知オフ') {
      if (subscribedUsers.has(chatId)) {
        subscribedUsers.delete(chatId);
        replyMessage = '自動通知をオフにしました。';
      } else {
        replyMessage = '自動通知はすでにオフになっています。';
      }
    }
    else {
      replyMessage = '時間割ボットをご利用いただきありがとうございます。「使い方」と入力すると、使用可能なコマンドが表示されます。';
    }
  }

  // 返信メッセージがある場合のみ返信
  if (replyMessage) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMessage
    });
  }

  return Promise.resolve(null);
}

function getTimetableForDay(dayOfWeek) {
  const subjects = timetableData[dayOfWeek];
  
  if (!subjects || subjects.length === 0) {
    if (dayOfWeek === '土曜日' || dayOfWeek === '日曜日') {
      return `${dayOfWeek}は授業がありません。`;
    }
    return `${dayOfWeek}の時間割情報がありません。`;
  }
  
  return `【${dayOfWeek}の時間割】\n${subjects.map((subject, index) => `${index + 1}時間目: ${subject}`).join('\n')}`;
}

// 毎日24時（0時）に自動送信する関数
async function sendDailyTimetable() {
  try {
    console.log('Starting daily timetable notification: ' + new Date().toISOString());
    console.log(`Subscribers count: ${subscribedUsers.size}`);

    const today = new Date();
    // 日本時間に調整
    const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const tomorrow = new Date(jstToday);
    tomorrow.setDate(jstToday.getDate() + 1);
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][tomorrow.getUTCDay()];
    
    const message = getTimetableForDay(dayOfWeek);
    const notificationMessage = `【明日の時間割のお知らせ】\n${message}`;
    
    // 登録されている全ユーザーに送信
    const promises = Array.from(subscribedUsers).map(userId => {
      return client.pushMessage(userId, {
        type: 'text',
        text: notificationMessage
      }).catch(err => {
        console.error(`Failed to send message to ${userId}:`, err);
        
        // ユーザーがブロックしている場合などはリストから削除
        if (err.statusCode === 400 || err.statusCode === 404 || err.statusCode === 500) {
          subscribedUsers.delete(userId);
          console.log(`Removed user ${userId} from subscribers list`);
        }
      });
    });
    
    await Promise.all(promises);
    console.log('Daily timetable notification completed');
  } catch (error) {
    console.error('Error in sendDailyTimetable:', error);
  }
}

// Cron設定: 毎日24時（0時）に実行（JSTで実行）
// サーバーがUTCの場合、15:00 UTCは日本時間の24:00（0時）
cron.schedule('0 15 * * *', sendDailyTimetable, {
  scheduled: true,
  timezone: "UTC"
});

const keepAlive = () => {
  setInterval(() => {
    console.log('Keeping server alive: ' + new Date().toISOString());
  }, 5 * 60 * 1000);
};

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot server is running on port ${port}`);
  console.log(`Daily timetable notification scheduled for 00:00 JST (15:00 UTC)`);
  keepAlive();
});

// package.jsonの依存関係に追加が必要:
// "node-cron": "^3.0.2"
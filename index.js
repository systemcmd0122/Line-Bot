// Koyeb用 LINE時間割ボット（設定機能なし・動作確認サイト付き）
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');

const config = {
  channelAccessToken: 'a0jMn1h2zhLfz4+XCzpjWG8GnQAtp6ub3EO6ZNzvMl5RYHCaHMBK7lxVSdgAm2zJVRO3SsWPXlJfHs1FRjdzcj0rq+7iDe4H5ZsBNKPBY9cQYDdAAdjBCr21SCTV2XQPSvoX3KtZESwRL/P9/+CB8wdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'ac94f72d2a8718696eed8e830e4682d8'
};

// 時間割データ（静的）
const timetableData = {
  "月曜日": ["数学", "国語", "英語", "理科", "社会", "体育"],
  "火曜日": ["英語", "数学", "国語", "社会", "美術", "理科"],
  "水曜日": ["国語", "社会", "数学", "英語", "音楽", "技術"],
  "木曜日": ["理科", "英語", "体育", "国語", "数学", "総合"],
  "金曜日": ["社会", "数学", "英語", "国語", "理科", "保健"],
  "土曜日": [],
  "日曜日": []
};

// Expressアプリの初期化
const app = express();

// 静的ファイルのホスティング（確認用ページ）
app.use(express.static(path.join(__dirname, 'public')));

// ルートURLにアクセスした時の処理
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>時間割LINE Bot</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #4CAF50;
        border-bottom: 2px solid #4CAF50;
        padding-bottom: 10px;
      }
      .status {
        background-color: #f1f8e9;
        border-left: 5px solid #4CAF50;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .commands {
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #f0f0f0;
      }
      .day {
        font-weight: bold;
      }
      footer {
        margin-top: 30px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
        font-size: 0.9em;
        color: #666;
      }
      .qr-section {
        margin: 30px 0;
        text-align: center;
      }
      .qr-placeholder {
        display: inline-block;
        width: 200px;
        height: 200px;
        background-color: #f0f0f0;
        border: 1px dashed #ccc;
        line-height: 200px;
        text-align: center;
        color: #666;
      }
    </style>
  </head>
  <body>
    <h1>時間割LINE Bot</h1>
    
    <div class="status">
      <h2>ステータス</h2>
      <p>✅ サーバー稼働中</p>
      <p>最終起動日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>
    
    <h2>使用可能なコマンド</h2>
    <div class="commands">
      <ul>
        <li><strong>今日の時間割</strong> - 今日の時間割を表示します</li>
        <li><strong>明日の時間割</strong> - 明日の時間割を表示します</li>
        <li><strong>月曜日の時間割</strong> (他の曜日も同様) - 指定した曜日の時間割を表示します</li>
        <li><strong>使い方</strong> or <strong>ヘルプ</strong> - コマンド一覧を表示します</li>
      </ul>
    </div>
    
    <h2>時間割表</h2>
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
    
    <div class="qr-section">
      <h2>友だち追加</h2>
      <p>下記QRコードを読み取って、LINE Botを友だち追加してください。</p>
      <div class="qr-placeholder">
        QRコード画像を表示<br>
        (LINE Developersコンソールから取得)
      </div>
    </div>
    
    <footer>
      <p>© ${new Date().getFullYear()} 時間割LINE Bot</p>
      <p>最終更新: ${new Date().toLocaleString('ja-JP')}</p>
    </footer>
  </body>
  </html>
  `;
  res.send(html);
});

// Webhookのヘルスチェック用エンドポイント
app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook is healthy');
});

// LINEクライアントの初期化
const client = new line.Client(config);

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベントハンドラー
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // テキストメッセージ以外は無視
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();
  let replyMessage = '';

  // コマンド処理
  if (userMessage === '使い方' || userMessage === 'ヘルプ') {
    replyMessage = `【時間割ボットの使い方】
・「今日の時間割」：今日の時間割を表示します
・「明日の時間割」：明日の時間割を表示します
・「〇曜日の時間割」：指定した曜日の時間割を表示します`;
  } 
  else if (userMessage === '今日の時間割') {
    const today = new Date();
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][today.getDay()];
    replyMessage = getTimetableForDay(dayOfWeek);
  } 
  else if (userMessage === '明日の時間割') {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][tomorrow.getDay()];
    replyMessage = getTimetableForDay(dayOfWeek);
  } 
  else if (/^(月|火|水|木|金|土|日)曜日の時間割$/.test(userMessage)) {
    const dayOfWeek = userMessage.replace('の時間割', '');
    replyMessage = getTimetableForDay(dayOfWeek);
  } 
  else {
    replyMessage = '時間割ボットをご利用いただきありがとうございます。「使い方」と入力すると、使用可能なコマンドが表示されます。';
  }

  // 返信メッセージを送信
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

// 特定の曜日の時間割を取得する関数
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

// サーバーを15分ごとに自己ピング（Koyebの無料プランでもオフラインにならないように）
const keepAlive = () => {
  setInterval(() => {
    console.log('Keeping server alive: ' + new Date().toISOString());
  }, 5 * 60 * 1000); // 5分ごとにログ出力
};

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot server is running on port ${port}`);
  keepAlive(); // 自己ピング開始
});

// Koyebはprocess.env.PORTを使用するので、package.jsonのスクリプトは以下のようにする
/*
{
  "name": "line-timetable-bot",
  "version": "1.0.0",
  "description": "Simple LINE Bot for checking timetables",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@line/bot-sdk": "^7.5.2"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
*/
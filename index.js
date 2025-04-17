// Koyeb用 LINE時間割ボット（設定機能なし・動作確認サイト付き・天気予報と定時通知機能付き）
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const axios = require('axios'); // 外部APIリクエスト用
const cron = require('node-cron'); // スケジュールタスク用

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

// 天気コード（WMO Weather interpretation codes）と対応する日本語の説明
const weatherCodeMap = {
  0: "快晴",
  1: "晴れ",
  2: "一部曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "軽い霧雨",
  53: "霧雨",
  55: "強い霧雨",
  56: "氷点下の霧雨",
  57: "強い氷点下の霧雨",
  61: "小雨",
  63: "雨",
  65: "強い雨",
  66: "氷点下の雨",
  67: "強い氷点下の雨",
  71: "小雪",
  73: "雪",
  75: "強い雪",
  77: "霰",
  80: "弱いにわか雨",
  81: "にわか雨",
  82: "強いにわか雨",
  85: "小さな雪のシャワー",
  86: "大きな雪のシャワー",
  95: "雷雨",
  96: "雷雨と小さな雹",
  99: "雷雨と大きな雹"
};

// 傘が必要な天気コード
const umbrellaNeededCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

// 学校の位置情報 (例: 東京の座標)
const SCHOOL_LATITUDE = 35.6895;
const SCHOOL_LONGITUDE = 139.6917;

const app = express();

// 静的ファイルの提供設定を追加
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const SITE_URL = 'https://wasteful-morgan-tisk01010100-446ccc96.koyeb.app/';

// LINEクライアントの初期化
const client = new line.Client(config);

// ユーザーIDの保存用配列
let subscribedUsers = [];

// 購読者リストの管理
function saveSubscriber(userId) {
  if (!subscribedUsers.includes(userId)) {
    subscribedUsers.push(userId);
    console.log(`新しいユーザーが登録されました: ${userId}`);
    return true;
  }
  return false;
}

function removeSubscriber(userId) {
  const index = subscribedUsers.indexOf(userId);
  if (index !== -1) {
    subscribedUsers.splice(index, 1);
    console.log(`ユーザーが購読解除しました: ${userId}`);
    return true;
  }
  return false;
}

// 天気情報を取得する関数
async function getWeatherForecast() {
  try {
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude: SCHOOL_LATITUDE,
        longitude: SCHOOL_LONGITUDE,
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'Asia/Tokyo',
        forecast_days: 1
      }
    });

    const data = response.data;
    const weatherCode = data.daily.weathercode[0];
    const maxTemp = data.daily.temperature_2m_max[0];
    const minTemp = data.daily.temperature_2m_min[0];
    const precipitation = data.daily.precipitation_sum[0];

    return {
      weatherCode,
      weatherDescription: weatherCodeMap[weatherCode] || "不明な天気",
      maxTemp,
      minTemp,
      precipitation,
      umbrellaNeeded: umbrellaNeededCodes.includes(weatherCode) || precipitation > 1.0
    };
  } catch (error) {
    console.error('天気情報の取得に失敗しました:', error);
    return null;
  }
}

// 天気に基づいたアドバイスを生成する関数
function generateWeatherAdvice(weather) {
  let advice = '';

  if (weather.umbrellaNeeded) {
    advice += '☂️ 降水の可能性があります。傘を忘れずに持っていきましょう。\n';
  }

  if (weather.maxTemp >= 30) {
    advice += '🔥 今日は気温が高くなります。熱中症に注意し、こまめに水分補給をしましょう。\n';
  } else if (weather.maxTemp >= 25) {
    advice += '☀️ 暖かい一日になりそうです。水分補給を忘れずに。\n';
  } else if (weather.minTemp <= 5) {
    advice += '❄️ 寒い一日になりそうです。暖かい服装で登校しましょう。\n';
  }

  return advice.trim();
}

// 毎日24時（0時）に翌日の時間割と天気予報を送信するスケジュールタスク
cron.schedule('0 0 * * *', async () => {
  console.log('毎日の時間割と天気情報を送信します...');
  
  try {
    // 翌日の時間割を取得
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][tomorrow.getDay()];
    
    // 土日は送信しない選択肢もある
    if (dayOfWeek === '土曜日' || dayOfWeek === '日曜日') {
      console.log('週末は時間割通知をスキップします');
      return;
    }
    
    // 天気情報を取得
    const weather = await getWeatherForecast();
    
    let message = `【明日(${tomorrow.getMonth()+1}月${tomorrow.getDate()}日・${dayOfWeek})の時間割】\n`;
    
    const subjects = timetableData[dayOfWeek];
    if (subjects && subjects.length > 0) {
      message += subjects.map((subject, index) => `${index + 1}時間目: ${subject}`).join('\n');
    } else {
      message += '授業はありません。';
    }
    
    // 天気情報を追加
    if (weather) {
      message += `\n\n【明日の天気予報】\n${weather.weatherDescription}\n気温: ${weather.minTemp}℃～${weather.maxTemp}℃\n`;
      
      // アドバイスがあれば追加
      const advice = generateWeatherAdvice(weather);
      if (advice) {
        message += `\n【アドバイス】\n${advice}`;
      }
    }
    
    // 登録ユーザー全員に送信
    if (subscribedUsers.length > 0) {
      const promises = subscribedUsers.map(userId => {
        return client.pushMessage(userId, {
          type: 'text',
          text: message
        }).catch(err => {
          console.error(`ユーザー ${userId} へのメッセージ送信に失敗しました:`, err);
          
          // エラーコードが4xx系の場合はユーザーリストから削除（ブロックされた可能性）
          if (err.statusCode >= 400 && err.statusCode < 500) {
            removeSubscriber(userId);
          }
        });
      });
      
      await Promise.all(promises);
      console.log(`${subscribedUsers.length}人のユーザーに時間割と天気情報を送信しました`);
    } else {
      console.log('登録ユーザーがいないため、メッセージは送信されませんでした');
    }
  } catch (error) {
    console.error('毎日のメッセージ送信中にエラーが発生しました:', error);
  }
}, {
  timezone: 'Asia/Tokyo'
});

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
      </div>
      
      <h2>使用可能なコマンド</h2>
      <div class="commands">
        <ul>
          <li><strong>今日の時間割</strong> - 今日の時間割を表示します</li>
          <li><strong>明日の時間割</strong> - 明日の時間割を表示します</li>
          <li><strong>月曜日の時間割</strong> (他の曜日も同様) - 指定した曜日の時間割を表示します</li>
          <li><strong>天気</strong> - 今日の天気予報を表示します</li>
          <li><strong>明日の天気</strong> - 明日の天気予報を表示します</li>
          <li><strong>通知登録</strong> - 毎日24時の時間割と天気予報の自動通知を登録します</li>
          <li><strong>通知解除</strong> - 自動通知を解除します</li>
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
  const userId = event.source.userId;

  // グループチャットの場合は「使い方」か「ヘルプ」の場合のみ反応
  if (isGroupChat) {
    if (userMessage === '使い方' || userMessage === 'ヘルプ') {
      replyMessage = `【時間割ボットの使い方】
・「今日の時間割」：今日の時間割を表示します
・「明日の時間割」：明日の時間割を表示します
・「〇曜日の時間割」：指定した曜日の時間割を表示します
・「天気」：今日の天気予報を表示します
・「明日の天気」：明日の天気予報を表示します

詳しい使い方と時間割表はこちらのサイトでご確認いただけます：
${SITE_URL}`;
    } else {
      // グループチャットで「使い方」「ヘルプ」以外のメッセージには反応しない
      return Promise.resolve(null);
    }
  } else {
    // 個人チャットの場合は通常通り全ての機能に反応
    if (userMessage === '使い方' || userMessage === 'ヘルプ') {
      replyMessage = `【時間割ボットの使い方】
・「今日の時間割」：今日の時間割を表示します
・「明日の時間割」：明日の時間割を表示します
・「〇曜日の時間割」：指定した曜日の時間割を表示します
・「天気」：今日の天気予報を表示します
・「明日の天気」：明日の天気予報を表示します
・「通知登録」：毎日24時の時間割と天気予報の自動通知を登録します
・「通知解除」：自動通知を解除します

詳しい使い方と時間割表はこちらのサイトでご確認いただけます：
${SITE_URL}`;
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
    else if (userMessage === '天気' || userMessage === '今日の天気') {
      try {
        const weather = await getWeatherForecast();
        if (weather) {
          let message = `【今日の天気予報】\n${weather.weatherDescription}\n気温: ${weather.minTemp}℃～${weather.maxTemp}℃\n`;
          
          // アドバイスがあれば追加
          const advice = generateWeatherAdvice(weather);
          if (advice) {
            message += `\n【アドバイス】\n${advice}`;
          }
          
          replyMessage = message;
        } else {
          replyMessage = '申し訳ありません。天気情報の取得に失敗しました。';
        }
      } catch (error) {
        console.error('天気情報取得エラー:', error);
        replyMessage = '申し訳ありません。天気情報の取得に失敗しました。';
      }
    }
    else if (userMessage === '明日の天気') {
      try {
        const weather = await getWeatherForecast(); // 明日の天気も同じAPIで取得可能
        if (weather) {
          let message = `【明日の天気予報】\n${weather.weatherDescription}\n気温: ${weather.minTemp}℃～${weather.maxTemp}℃\n`;
          
          // アドバイスがあれば追加
          const advice = generateWeatherAdvice(weather);
          if (advice) {
            message += `\n【アドバイス】\n${advice}`;
          }
          
          replyMessage = message;
        } else {
          replyMessage = '申し訳ありません。天気情報の取得に失敗しました。';
        }
      } catch (error) {
        console.error('天気情報取得エラー:', error);
        replyMessage = '申し訳ありません。天気情報の取得に失敗しました。';
      }
    }
    else if (userMessage === '通知登録') {
      if (saveSubscriber(userId)) {
        replyMessage = '毎日24時（午前0時）に翌日の時間割と天気予報をお知らせする通知に登録しました。';
      } else {
        replyMessage = 'すでに通知に登録されています。';
      }
    }
    else if (userMessage === '通知解除') {
      if (removeSubscriber(userId)) {
        replyMessage = '通知を解除しました。';
      } else {
        replyMessage = '通知登録がされていません。';
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

// サーバーが終了しないようにする関数
const keepAlive = () => {
  setInterval(() => {
    console.log('Keeping server alive: ' + new Date().toISOString());
  }, 5 * 60 * 1000);
};

// メモリ内の購読者リストを定期的に表示（デバッグ用）
setInterval(() => {
  console.log(`現在の購読者数: ${subscribedUsers.length}`);
}, 30 * 60 * 1000); // 30分ごと

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot server is running on port ${port}`);
  keepAlive();
});
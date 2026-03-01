const { DateTime } = require('luxon');
const timetableData = require('./timetable');
const flexTemplates = require('./flexTemplates');
const googleCalendar = require('./googleCalendar');
const fs = require('fs');
const path = require('path');

const SUBSCRIBERS_FILE = path.join(__dirname, '../data/subscribers.json');
const CHATS_FILE = path.join(__dirname, '../data/chats.json');

const validCommands = [
  '使い方', 'ヘルプ', '今日の時間割', '明日の時間割',
  '今日の行事', '明日の行事',
  '月曜日の時間割', '火曜日の時間割', '水曜日の時間割',
  '木曜日の時間割', '金曜日の時間割', '土曜日の時間割', '日曜日の時間割',
  '通知オン', '通知オフ'
];

/**
 * Handle incoming LINE events
 */
async function handleEvent(event, client) {
  // Track chats on follow/join/leave/unfollow events
  if (['follow', 'join'].includes(event.type)) {
    const chatId = event.source.userId || event.source.groupId || event.source.roomId;
    saveChat(chatId, event.source.type);
    if (event.type === 'join') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'はじめまして！時間割Botです。「使い方」と送ると、できることを確認できます。'
      });
    }
    return null;
  }

  if (['unfollow', 'leave'].includes(event.type)) {
    const chatId = event.source.userId || event.source.groupId || event.source.roomId;
    removeChat(chatId);
    removeSubscriber(chatId);
    return null;
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim();
  const source = event.source;
  let chatId;
  let isGroup = false;

  if (source.type === 'user') {
    chatId = source.userId;
  } else if (source.type === 'group') {
    chatId = source.groupId;
    isGroup = true;
  } else if (source.type === 'room') {
    chatId = source.roomId;
    isGroup = true;
  }

  // Filter non-commands in groups
  if (isGroup && !validCommands.includes(userMessage)) {
    return null;
  }

  // Ensure chat is tracked
  saveChat(chatId, source.type);

  let reply;

  if (userMessage === '使い方' || userMessage === 'ヘルプ') {
    reply = flexTemplates.createHelpFlex();
  } else if (userMessage === '今日の時間割') {
    reply = await getTodayTimetable();
  } else if (userMessage === '明日の時間割') {
    reply = await getTomorrowTimetable();
  } else if (userMessage === '今日の行事') {
    reply = await getTodayEvents();
  } else if (userMessage === '明日の行事') {
    reply = await getTomorrowEvents();
  } else if (userMessage === '通知オン') {
    const added = saveSubscriber(chatId);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: added ? '毎朝7時の時間割通知をオンにしました。' : '既に通知はオンになっています。',
      quickReply: flexTemplates.getQuickReplies()
    });
  } else if (userMessage === '通知オフ') {
    const removed = removeSubscriber(chatId);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: removed ? '時間割通知をオフにしました。再度オンにするには「通知オン」と送ってください。' : '通知は既にオフになっています。',
      quickReply: flexTemplates.getQuickReplies()
    });
  } else if (userMessage.endsWith('曜日の時間割')) {
    const day = userMessage.replace('の時間割', '');
    reply = await getTimetableForDay(day);
  } else {
    if (!isGroup) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '「使い方」と入力すると、使用可能なコマンドが表示されます。',
        quickReply: flexTemplates.getQuickReplies()
      });
    }
    return null;
  }

  // Add quick replies to all replies
  reply.quickReply = flexTemplates.getQuickReplies();

  return client.replyMessage(event.replyToken, reply);
}

async function getTodayTimetable() {
  const now = DateTime.now().setZone('Asia/Tokyo');
  const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][now.weekday % 7];
  return getTimetableForDay(dayOfWeek, now);
}

async function getTomorrowTimetable() {
  const tomorrow = DateTime.now().setZone('Asia/Tokyo').plus({ days: 1 });
  const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][tomorrow.weekday % 7];
  return getTimetableForDay(dayOfWeek, tomorrow);
}

async function getTodayEvents() {
  const now = DateTime.now().setZone('Asia/Tokyo');
  const calendarIds = (process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || '').split(',').filter(id => id.trim());
  const events = calendarIds.length > 0 ? await googleCalendar.getEventsForDate(calendarIds, now) : [];
  return flexTemplates.createEventsFlex('今日', events);
}

async function getTomorrowEvents() {
  const tomorrow = DateTime.now().setZone('Asia/Tokyo').plus({ days: 1 });
  const calendarIds = (process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || '').split(',').filter(id => id.trim());
  const events = calendarIds.length > 0 ? await googleCalendar.getEventsForDate(calendarIds, tomorrow) : [];
  return flexTemplates.createEventsFlex('明日', events);
}

async function getTimetableForDay(dayOfWeek, date = null) {
  const subjects = timetableData[dayOfWeek] || [];
  let events = [];

  if (date) {
    const calendarIds = (process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || '').split(',').filter(id => id.trim());
    if (calendarIds.length > 0) {
      events = await googleCalendar.getEventsForDate(calendarIds, date);
    }
  }

  return flexTemplates.createTimetableFlex(dayOfWeek, subjects, events);
}

function saveSubscriber(id) {
  if (!id) return false;
  try {
    if (!fs.existsSync(path.dirname(SUBSCRIBERS_FILE))) {
      fs.mkdirSync(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
    }

    let subscribers = [];
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
    }

    if (!subscribers.includes(id)) {
      subscribers.push(id);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
      console.log(`New subscriber added: ${id}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error saving subscriber:', err);
    return false;
  }
}

function removeSubscriber(id) {
  if (!id) return false;
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      let subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
      if (subscribers.includes(id)) {
        subscribers = subscribers.filter(sid => sid !== id);
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
        console.log(`Subscriber removed: ${id}`);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error removing subscriber:', err);
    return false;
  }
}

function saveChat(id, type) {
  if (!id) return false;
  try {
    if (!fs.existsSync(path.dirname(CHATS_FILE))) {
      fs.mkdirSync(path.dirname(CHATS_FILE), { recursive: true });
    }

    let chats = {};
    if (fs.existsSync(CHATS_FILE)) {
      chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    }

    if (!chats[id]) {
      chats[id] = { type, addedAt: new Date().toISOString() };
      fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
      console.log(`New chat tracked: ${id} (${type})`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error saving chat:', err);
    return false;
  }
}

function removeChat(id) {
  if (!id) return false;
  try {
    if (fs.existsSync(CHATS_FILE)) {
      let chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
      if (chats[id]) {
        delete chats[id];
        fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
        console.log(`Chat removed: ${id}`);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error removing chat:', err);
    return false;
  }
}

module.exports = {
  handleEvent,
  getTodayTimetable
};

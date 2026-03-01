const botLogic = require('./botLogic');
const { DateTime } = require('luxon');

// Mock client
const client = {
  replyMessage: (token, message) => {
    console.log(`[MOCK] Replying with:`, JSON.stringify(message, null, 2));
    return Promise.resolve(message);
  }
};

async function runTests() {
  console.log('--- Testing Bot Logic ---');

  // Test 1: Notification On
  console.log('\nTest 1: Notification On');
  await botLogic.handleEvent({
    type: 'message',
    message: { type: 'text', text: '通知オン' },
    source: { type: 'user', userId: 'U999' },
    replyToken: 'T1'
  }, client);

  // Test 2: Notification Off
  console.log('\nTest 2: Notification Off');
  await botLogic.handleEvent({
    type: 'message',
    message: { type: 'text', text: '通知オフ' },
    source: { type: 'user', userId: 'U999' },
    replyToken: 'T2'
  }, client);

  // Test 3: Today's Events
  console.log('\nTest 3: Today\'s Events');
  await botLogic.handleEvent({
    type: 'message',
    message: { type: 'text', text: '今日の行事' },
    source: { type: 'user', userId: 'U999' },
    replyToken: 'T3'
  }, client);

  // Test 4: Tracking on Join
  console.log('\nTest 4: Tracking on Join');
  await botLogic.handleEvent({
    type: 'join',
    source: { type: 'group', groupId: 'G123' },
    replyToken: 'T4'
  }, client);

  // Test 5: Verification
  console.log('\nTest 5: Final Verification');
  const fs = require('fs');
  const path = require('path');
  const subsFile = path.join(__dirname, '../data/subscribers.json');
  if (fs.existsSync(subsFile)) {
    const subs = JSON.parse(fs.readFileSync(subsFile, 'utf8'));
    console.log('Subscribers in file:', subs);
    if (!subs.includes('U999')) {
      console.log('SUCCESS: User U999 was removed.');
    } else {
      console.log('FAILURE: User U999 was NOT removed.');
    }
  }

  const chatsFile = path.join(__dirname, '../data/chats.json');
  if (fs.existsSync(chatsFile)) {
    const chats = JSON.parse(fs.readFileSync(chatsFile, 'utf8'));
    console.log('Chats in file:', Object.keys(chats));
    if (chats['G123']) {
      console.log('SUCCESS: Group G123 was tracked.');
    } else {
      console.log('FAILURE: Group G123 was NOT tracked.');
    }
  }

  console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);

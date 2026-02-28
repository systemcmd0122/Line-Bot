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

  // Test 3: Verification
  console.log('\nTest 3: Final Subscriber Verification');
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

  console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);

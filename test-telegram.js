const fetch = require('node-fetch');

const BOT_TOKEN = '8835754485:AAG5X36rcJXEu5s32C1h4SnQDBM_hkzxc0I';
const CHAT_ID = '307433758';

async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
    }),
  });
  const data = await response.json();
  console.log('✅ Message sent:', data);
}

sendMessage('Hello from Node.js!');

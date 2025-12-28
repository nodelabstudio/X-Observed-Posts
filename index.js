import axios from 'axios';
import 'dotenv/config';

const QB = axios.create({
  baseURL: `https://api.quickbase.com/v1`,
  headers: {
    'QB-Realm-Hostname': `${process.env.QB_REALM}.quickbase.com`,
    Authorization: `QB-USER-TOKEN ${process.env.QB_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function run() {
  const payload = {
    to: process.env.QB_TABLE_ID,
    data: [
      {
        6: { value: 'https://x.com/test/status/123' },
        7: { value: 'test_account' },
        8: { value: 'This is a test row from Phase 1.' },
        9: { value: new Date().toISOString() },
      },
    ],
  };

  await QB.post('/records', payload);
  console.log('Row inserted');
}

run();

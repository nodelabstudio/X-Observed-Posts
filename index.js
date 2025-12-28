import dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config();
console.log('BOOT: script started');
console.log('BOOT: Node version', process.version);

const X_POST_URL = process.env.X_POST_URL;
if (!X_POST_URL) {
  throw new Error('X_POST_URL is not set');
}

async function fetchXPost() {
  console.log('STEP 1: entering fetchXPost');
  console.log('STEP 2: launching chromium');
  const browser = await chromium.launch({ headless: true });
  console.log('STEP 3: chromium launched');
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
  });

  const page = await context.newPage();

  console.log('STEP 4: navigating to', X_POST_URL);
  await page.goto(X_POST_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  // Give X time to hydrate React after DOM load
  await page.waitForTimeout(3000);

  // Wait for tweet text to render
  await page.waitForSelector('[data-testid="tweetText"]', {
    timeout: 15000,
  });

  const text = await page.$$eval('[data-testid="tweetText"]', nodes =>
    nodes.map(n => n.innerText).join(' ')
  );

  const author = X_POST_URL.split('/')[3];

  await browser.close();

  if (!text || !text.trim()) {
    throw new Error('Could not extract tweet text');
  }

  return { text: text.trim(), author };
}

async function run() {
  const { text, author } = await fetchXPost();
  console.log('AUTHOR:', author);
  console.log('TEXT:', text.slice(0, 200));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

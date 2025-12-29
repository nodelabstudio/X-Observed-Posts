import dotenv from 'dotenv';
import { chromium } from 'playwright';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const x_handles = (process.env.X_HANDLES || '')
  .split(',')
  .map(h => h.trim())
  .filter(Boolean);

if (x_handles.length === 0) {
  throw new Error('x_handles is not set or empty');
}

function normalizeCookies(rawCookies) {
  return (rawCookies || [])
    .filter(c => c && c.name && typeof c.value === 'string')
    .map(c => {
      const sameSiteRaw = (c.sameSite || '').toString().toLowerCase();
      let sameSite;
      if (sameSiteRaw === 'no_restriction' || sameSiteRaw === 'none')
        sameSite = 'None';
      else if (sameSiteRaw === 'lax') sameSite = 'Lax';
      else if (sameSiteRaw === 'strict') sameSite = 'Strict';
      else sameSite = undefined; // omit invalid/unspecified values

      const isSession = Boolean(c.session);
      const expires =
        !isSession && typeof c.expirationDate === 'number'
          ? Math.floor(c.expirationDate)
          : undefined;

      return {
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        httpOnly: Boolean(c.httpOnly),
        secure: Boolean(c.secure),
        ...(sameSite ? { sameSite } : {}),
        ...(expires ? { expires } : {}),
      };
    });
}

async function fetchLatestPostsForHandle(browser, handle, limit = 3) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
  });

  const rawCookies = JSON.parse(process.env.X_COOKIES_JSON);
  const cookies = normalizeCookies(rawCookies);
  await context.addCookies(cookies);

  const page = await context.newPage();
  const profileUrl = `https://x.com/${handle}?tab=posts`;

  await page.goto(profileUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  console.log(
    'Logged-in check:',
    await page.isVisible('[data-testid="SideNav_AccountSwitcher_Button"]')
  );

  await page.waitForTimeout(4000);

  // Scroll to force newer posts to load
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  }

  await page.waitForSelector('article', { timeout: 15000 });
  const posts = await page.$$eval(
    'article',
    (articles, { max, handle }) => {
      return articles
        .map(article => {
          const timeEl = article.querySelector('time');
          const postedAt = timeEl ? timeEl.getAttribute('datetime') : null;
          const timeText = timeEl ? timeEl.innerText : null;
          if (!timeEl || !postedAt) return null;

          const textNodes = article.querySelectorAll(
            '[data-testid="tweetText"]'
          );
          const text = Array.from(textNodes)
            .map(n => n.innerText)
            .join(' ')
            .trim();

          const link = article.querySelector(`a[href^="/${handle}/status/"]`);
          const url = link ? `https://x.com${link.getAttribute('href')}` : null;

          return {
            text,
            postedAt,
            timeText,
            url,
            likes: 0,
            reposts: 0,
            views: 0,
          };
        })
        .filter(p => p && p.url)
        .slice(0, max);
    },
    { max: 20, handle }
  );
  console.log('Scraped', posts.length, 'raw posts for', handle);
  await context.close();
  return posts;
}

async function qbRecordExistsURL(url) {
  const res = await fetch('https://api.quickbase.com/v1/records/query', {
    method: 'POST',
    headers: {
      'QB-Realm-Hostname': `${process.env.QB_REALM}.quickbase.com`,
      Authorization: `QB-USER-TOKEN ${process.env.QB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.QB_TABLE_ID,
      select: [3],
      where: `{6.EX.'${url.replace(/'/g, "\\'")}'}`, // field 6 = post URL
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Quickbase dedupe query failed: ' + text);
  }

  const json = await res.json();
  return Array.isArray(json.data) && json.data.length > 0;
}

async function run() {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const handle of x_handles) {
    console.log('Scanning', handle);
    const posts = await fetchLatestPostsForHandle(browser, handle, 20);

    for (const post of posts.slice(0, 3)) {
      const exists = await qbRecordExistsURL(post.url);

      if (exists) {
        console.log('Skipping existing post', post.url);
        continue;
      }

      console.log('Saving new post', post.url);

      try {
        // Capture screenshot of the post and upload to Cloudinary
        const page = await browser.newPage();
        await page.goto(post.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(3000);

        let screenshotUrl = null;

        const article = await page.$('article');
        if (article) {
          const safeName = post.url.split('/status/')[1];
          const filePath = `screenshots/${safeName}.png`;

          await article.screenshot({ path: filePath });

          const upload = await cloudinary.uploader.upload(filePath, {
            folder: 'x-observed-posts',
            public_id: safeName,
          });

          screenshotUrl = upload.secure_url;
          fs.unlinkSync(filePath);
        }

        await page.close();

        const draftTemplates = [
          'Worth bookmarking.',
          'This is a strong breakdown.',
          'Good example of this idea.',
        ];

        const quoteDraft =
          draftTemplates[Math.floor(Math.random() * draftTemplates.length)];

        const payload = {
          to: process.env.QB_TABLE_ID,
          data: [
            {
              6: { value: post.url },
              7: { value: handle },
              8: { value: post.text },
              9: { value: new Date().toISOString() },
              10: { value: post.postedAt },
              11: { value: post.likes },
              12: { value: post.reposts },
              13: { value: post.views },
              14: { value: screenshotUrl },
              15: { value: quoteDraft },
            },
          ],
        };

        const res = await fetch('https://api.quickbase.com/v1/records', {
          method: 'POST',
          headers: {
            'QB-Realm-Hostname': `${process.env.QB_REALM}.quickbase.com`,
            Authorization: `QB-USER-TOKEN ${process.env.QB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log('QB INSERT STATUS:', res.status);
        console.log('QB INSERT RESPONSE:', text);
      } catch (err) {
        console.error('Failed to process post', post.url, err.message);
      }
    }
  }

  await browser.close();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

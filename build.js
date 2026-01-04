#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

const FEED_URL = 'https://jeffhuber.substack.com/feed';

function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

    if (title && link) {
      items.push({ title, link, pubDate: new Date(pubDate) });
    }
  }

  return items.sort((a, b) => b.pubDate - a.pubDate);
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHTML(items) {
  const postsHTML = items.map(item => `
      <li>
        <span class="date">${formatDate(item.pubDate)}</span>
        <a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a>
      </li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jeff Huber</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 16px;
      line-height: 1.5;
      color: #000;
      max-width: 650px;
      margin: 50px auto;
      padding: 0 20px;
    }
    h1 { font-size: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 1.1em; margin-top: 2em; margin-bottom: 0.5em; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { margin: 0.4em 0; display: flex; }
    .date { color: #666; width: 110px; flex-shrink: 0; }
    a { color: #000; }
    a:hover { color: #666; }
    .subscribe { margin: 1.5em 0; display: flex; gap: 0.5em; }
    .subscribe input { padding: 0.4em 0.6em; border: 1px solid #ccc; font-family: inherit; font-size: inherit; }
    .subscribe button { padding: 0.4em 1em; background: #000; color: #fff; border: none; font-family: inherit; font-size: inherit; cursor: pointer; }
    .subscribe button:hover { background: #333; }
  </style>
</head>
<body>
  <h1>Jeff Huber</h1>
  <p><a href="https://x.com/jeffreyhuber">@jeffreyhuber</a> · founder <a href="https://x.com/trychroma">@trychroma</a></p>
  <form class="subscribe" action="https://jeffhuber.substack.com/api/v1/free?nojs=true" method="post" target="_blank">
    <input type="email" name="email" placeholder="your@email.com" required>
    <button type="submit">Subscribe</button>
  </form>
  <h2>Posts</h2>
  <ul>
${postsHTML}
  </ul>
</body>
</html>`;
}

async function build() {
  console.log('Fetching RSS feed...');
  const xml = await fetchFeed(FEED_URL);

  console.log('Parsing feed...');
  const items = parseRSS(xml);
  console.log(`Found ${items.length} posts`);

  console.log('Generating HTML...');
  const html = generateHTML(items);

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/index.html', html);

  console.log('Done! Output: dist/index.html');
}

build().catch(console.error);

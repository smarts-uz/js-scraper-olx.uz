// getCategories.js
import * as cheerio from 'cheerio';

// если Node < 18, раскомментируй ↓
// import fetch from 'node-fetch';

const url = 'https://www.olx.uz';

const res = await fetch(url);
const html = await res.text();
const $ = cheerio.load(html);

export const categories = [];

$('a[data-testid^="cat-"]').each((i, el) => {
  const name = $(el).find('p').text().trim();   // <p> внутри ссылки
  const link = $(el).attr('href');              // ссылка

  categories.push({ name, link });
});

console.log(categories);

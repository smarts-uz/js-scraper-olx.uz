import puppeteer from "puppeteer";
import { scrapeAd } from './scrapeAd.js';
import { getPaginationUrls } from './pagination.js';
import { autoScroll, sleep } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log(process.cwd(),"cwd");

/**
 * Saves all ads from a search page, including pagination
 */
export async function scrapeSearch(searchUrl, saveDir, browser = null) {


  let localBrowser = browser;
  let adsCount = 0;

  if (!localBrowser) {
    localBrowser = await puppeteer.launch({
      headless: process.env.HeadlessURL === 'true' || process.env.HeadlessURL === true ? true : process.env.HeadlessURL === 'new' ? 'new' : false,
      slowMo: 100,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  // Получаем все страницы пагинации
  const mainPage = await localBrowser.newPage();
  await mainPage.setViewport({ width: 1280, height: 900 });
  console.log(`📖 Загружаю главную страницу для получения пагинации: ${searchUrl}`);
  await mainPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  // Прокручиваем вниз для загрузки пагинации
  await autoScroll(mainPage);
  await sleep(2000); // Ждём загрузку элементов
  
  const paginationUrls = await getPaginationUrls(mainPage);
  await mainPage.close();
  
  console.log(`📑 Найдено ${paginationUrls.length} страниц пагинации`);
  
  // Если пагинация не найдена, обрабатываем только первую страницу
  let urlsToProcess = [searchUrl];
  if (paginationUrls.length > 0) {
    // Add original search URL and all pagination URLs
    urlsToProcess = [searchUrl, ...paginationUrls];
    // Remove duplicates
    urlsToProcess = [...new Set(urlsToProcess)];
  }
  
  console.log(`📄 Всего будет обработано ${urlsToProcess.length} страниц`);
  
  // Обрабатываем каждую страницу поиска
  for (const [index, url] of urlsToProcess.entries()) {
    console.log(`📄 Обрабатываю страницу ${index + 1}/${urlsToProcess.length}: ${url}`);
    
    const page = await localBrowser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await autoScroll(page);
    
    let adLinks = await page.$$eval(
      'a[href*="/obyavlenie/"], a[href*="/offer/"]',
      (els) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter(Boolean)
          .map((href) =>
            href.startsWith("http") ? href : "https://www.olx.uz" + href
          )
    );
    
    // Убираем дубликаты
    adLinks = [...new Set(adLinks)];
    console.log(`📌 Найдено ${adLinks.length} объявлений на этой странице.`);
    
    await page.close();
    
    // Обрабатываем каждое объявление
    for (const adUrl of adLinks) {
      adsCount++;
      await scrapeAd(adUrl, saveDir, localBrowser);
    }
    
    // Делаем паузу между страницами
    if (index < urlsToProcess.length - 1) {
      console.log("⏳ Пауза перед следующей страницей...");
      await sleep(3000);
    }
  }

  if (!browser) {
    await localBrowser.close();
  }

  console.log(`🎉 Сохранено ${adsCount} объявлений с поиска.`);
}

/**
 * Accepts an array of searches and saves all ads
 */
export async function scrapeMultipleSearches(tasks) {
  console.log(process.env.HeadlessURL,'headlessURL');

 const browser = await puppeteer.launch({
    headless: process.env.HeadlessURL === 'true' || process.env.HeadlessURL === true ? true : process.env.HeadlessURL === 'new' ? 'new' : false,
    slowMo: 100,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const { url, saveDir } of tasks) {
    await scrapeSearch(url, saveDir, browser);
  }

  await browser.close();
  console.log("🎉 Все поиски обработаны!");
}

// 🚀 CLI for a single search
if (process.argv.length >= 4) {
  const url = process.argv[2];
  const saveDir = process.argv[3];

  scrapeSearch(url, saveDir)
    .then(() => {
      console.log("🎉 Готово!");
    })
    .catch((err) => {
      console.error("❌ Ошибка:", err);
    });
}

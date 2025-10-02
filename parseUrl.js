import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Загружаю объявление: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const urlFileContent = `[InternetShortcut]
URL=${url}
`;
  // Имя файла = title страницы
  let title = await page.title();
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `olx_ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.url`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  fs.writeFileSync(filePath, urlFileContent);
  console.log(`💾 Сохранён URL файл: ${filePath}`);
  
  await page.close();
}

/**
 * Получает все ссылки на страницы пагинации
 */
async function getPaginationUrls(page) {
  try {
    const paginationUrls = await page.$$eval(
      'ul.pagination-list a[href]',
      (elements) => elements.map(el => el.href)
    );
    return [...new Set(paginationUrls)]; // Убираем дубликаты
  } catch (error) {
    console.warn("⚠️ Ошибка при получении пагинации:", error.message);
    return [];
  }
}

/**
 * Сохраняет все объявления со страницы поиска, включая пагинацию
 */
export async function scrapeSearch(searchUrl, saveDir, browser = null) {
  let localBrowser = browser;
  let adsCount = 0;

  if (!localBrowser) {
    localBrowser = await puppeteer.launch({
      headless: true,
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
  const urlsToProcess = paginationUrls.length > 0 ? paginationUrls : [searchUrl];
  
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
 * Принимает массив поисков и сохраняет все объявления
 */
export async function scrapeMultipleSearches(tasks) {
 const browser = await puppeteer.launch({
    headless: true,
    slowMo: 100,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const { url, saveDir } of tasks) {
    await scrapeSearch(url, saveDir, browser);
  }

  await browser.close();
  console.log("🎉 Все поиски обработаны!");
}

// 🚀 CLI для одного поиска
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

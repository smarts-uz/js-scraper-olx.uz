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

/**
 * Сохраняет одно объявление OLX в MHTML
 */
async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Загружаю объявление: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Показать телефон
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log("✅ Номер телефона показан!");
  } catch {
    console.warn("⚠️ Телефон открыть не удалось.");
  }

  // Снимок страницы
  let data = null;
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send("Page.enable");
    const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
    data = snapshot.data;
  } catch (err) {
    console.error(`⚠️ Не удалось снять MHTML для ${url}: ${err.message}`);
  }

  // Имя файла = title страницы
  let title = await page.title();
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `olx_ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.mhtml`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  if (data) {
    fs.writeFileSync(filePath, data);
    console.log(`💾 Сохранено: ${filePath}`);
  } else {
    const htmlPath = filePath.replace(/\.mhtml$/, ".html");
    await fs.promises.writeFile(htmlPath, await page.content(), "utf-8");
    console.log(`💾 Сохранено (fallback HTML): ${htmlPath}`);
  }
}

/**
 * Сохраняет все объявления со страницы поиска
 */
export async function scrapeSearch(searchUrl, saveDir, browser = null) {
  let localBrowser = browser;
  let adsCount = 0;

  if (!localBrowser) {
    localBrowser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const page = await localBrowser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`🔎 Загружаю поиск: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

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

  // убираем дубликаты
  adLinks = [...new Set(adLinks)];

  console.log(`📌 Найдено ${adLinks.length} уникальных объявлений.`);

  await page.close();

  for (const adUrl of adLinks) {
    adsCount++;
    await scrapeAd(adUrl, saveDir, localBrowser);
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
    headless: false,
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

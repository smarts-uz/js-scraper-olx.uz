// save-ad-mhtml.js
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

async function scrapeAd(url, saveDir) {
  const browser = await puppeteer.launch({
    headless: false, // set true if you don't want to see the browser
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Открываю объявление: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Показать телефон
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log("✅ Телефон показан!");
  } catch {
    console.warn("⚠️ Телефон открыть не удалось.");
  }

  // Сохраняем MHTML
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send("Page.enable");
    const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    let title = await page.title();
    let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 80);
    if (!safeName) safeName = `olx_ad_${Date.now()}`;
    const filePath = path.join(saveDir, `${safeName}.mhtml`);

    fs.writeFileSync(filePath, snapshot.data);
    console.log(`💾 Сохранено: ${filePath}`);
  } catch (err) {
    console.error(`❌ Не удалось сохранить MHTML: ${err.message}`);
  }

  await browser.close();
}

// CLI запуск
if (process.argv.length < 4) {
  console.error("Usage: node save-ad-mhtml.js <url> <saveDir>");
  process.exit(1);
}

const url = process.argv[2];
const saveDir = process.argv[3];

scrapeAd(url, saveDir).catch((err) => {
  console.error("❌ Ошибка:", err);
});

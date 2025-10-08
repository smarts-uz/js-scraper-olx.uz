import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Wait_Min = process.env.Wait_Min || 5;
const Wait_Max = process.env.Wait_Max || 30;
const Scroll_Count_Min = process.env.Scroll_Count_Min || 2;
const Scroll_Count_Max = process.env.Scroll_Count_Max || 5;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}


export async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Loading ad: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Random waiting and scrolling to simulate human behavior
  const waitTime = getRandomInt(parseInt(Wait_Min), parseInt(Wait_Max));
  const scrollCount = getRandomInt(parseInt(Scroll_Count_Min), parseInt(Scroll_Count_Max));
  
  console.log(`⏳ Waiting for ${waitTime}s with ${scrollCount} random scrolls...`);
  
  const timePerScroll = waitTime / (scrollCount + 1);
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const maxScroll = pageHeight - viewportHeight;
  
  // Initial wait before first scroll
  await new Promise(resolve => setTimeout(resolve, timePerScroll * 1000));
  
  for (let i = 0; i < scrollCount; i++) {
    const scrollPosition = getRandomInt(0, maxScroll);
    console.log(`🖱️ Scroll ${i + 1}/${scrollCount}: Scrolling to ${scrollPosition}px...`);
    await page.evaluate(pos => window.scrollTo(0, pos), scrollPosition);
    const scrollDelay = getRandomFloat(0.5, 2.5);
    await new Promise(resolve => setTimeout(resolve, scrollDelay * 1000));
  }

  const finalScrollPosition = getRandomInt(0, maxScroll);
  console.log(`🖱️ Final scroll to ${finalScrollPosition}px before checking phone...`);
  await page.evaluate(pos => window.scrollTo(0, pos), finalScrollPosition);

  // ✅ Handle phone number display
  let phoneShown = false;
  try {
    const phoneButton = await page.$('button[data-testid="show-phone"]');
    if (phoneButton) {
      console.log("📞 Found phone button, clicking...");
      await phoneButton.click();
      await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
      console.log("✅ Phone number displayed!");
      phoneShown = true;
    } else {
      const phoneVisible = await page.$('[data-testid="contact-phone"]');
      if (phoneVisible) {
        console.log("✅ Phone number already visible (no button).");
        phoneShown = true;
      } else {
        console.warn("⚠️ No phone button found.");
      }
    }
  } catch (err) {
    console.warn(`⚠️ Phone handling error: ${err.message}`);
  }

  // Safe file naming
  let title = await page.title();
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.mhtml`);

  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  let savedPath = null;

  if (phoneShown) {
    // ✅ Save as MHTML only if phoneShown = true
    try {
      const cdp = await page.target().createCDPSession();
      await cdp.send("Page.enable");
      const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
      fs.writeFileSync(filePath, snapshot.data);
      console.log(`💾 Saved (MHTML): ${filePath}`);
      savedPath = filePath;
    } catch (err) {
      console.error(`⚠️ Failed to capture MHTML for ${url}: ${err.message}`);
    }
  } else {
    const htmlPath = filePath.replace(/\.mhtml$/, ".html");
    await fs.promises.writeFile(htmlPath, await page.content(), "utf-8");
    console.log(`💾 Saved (fallback HTML): ${htmlPath}`);
    savedPath = htmlPath;
  }

  await page.close();
  return { phoneShown, savedPath };
}
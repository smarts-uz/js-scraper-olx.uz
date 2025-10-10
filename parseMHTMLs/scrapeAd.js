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
    const phoneButtons = await page.$$('button[data-testid="show-phone"]');
      for (const btn of phoneButtons) {
        const visible = await btn.isVisible?.() || await btn.evaluate(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        if (visible) {
          console.log('📞 Found visible phone button, clicking...');
          await btn.click();
          await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
          console.log('✅ Phone number displayed!');
          phoneShown = true;
          break;
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
      console.log("🧩 Capturing MHTML snapshot...");
      const cdp = await page.createCDPSession();
      await cdp.send("Page.enable");

      // Wait a bit to let dynamic content settle
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
        fs.writeFileSync(filePath, data);
        console.log(`💾 Saved (MHTML): ${filePath}`);
        savedPath = filePath;
      } catch (mhtmlErr) {
        // More specific error handling for MHTML capture
        if (
          mhtmlErr.message &&
          mhtmlErr.message.includes("Protocol error (Page.captureSnapshot): Failed  to generate MHTML")
        ) {
          console.error(
            `❌ Failed to capture MHTML for ${url}: The page may contain resources or frames that prevent MHTML generation.`
          );
        } else {
          console.error(`⚠️ Failed to capture MHTML for ${url}: ${mhtmlErr.message}`);
        }
      }
    } catch (err) {
      console.error(`⚠️ Unexpected error during MHTML capture for ${url}: ${err.message}`);
    }
  } else {
    console.log("⚠️ Phone number not shown. Skipping MHTML capture.");
  }

  await page.close();
  return { phoneShown, savedPath };
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Wait_Min = process.env.Wait_Min || 5;
const Wait_Max = process.env.Wait_Max || 30;
// Add Scroll_Count_Min and Scroll_Count_Max for number of scrolls
const Scroll_Count_Min = process.env.Scroll_Count_Min || 2;
const Scroll_Count_Max = process.env.Scroll_Count_Max || 5;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max
 */
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Scrapes an ad from a URL and saves it as MHTML
 */
export async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Loading ad: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Add human-like scrolling behavior during wait time
  const waitTime = getRandomInt(parseInt(Wait_Min), parseInt(Wait_Max));
  const scrollCount = getRandomInt(parseInt(Scroll_Count_Min), parseInt(Scroll_Count_Max));
  
  console.log(`⏳ Waiting for ${waitTime} seconds with ${scrollCount} random scrolls...`);
  
  // Calculate time intervals for scrolling
  const timePerScroll = waitTime / (scrollCount + 1);
  
  // Get page dimensions for more realistic scrolling
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const maxScroll = pageHeight - viewportHeight;
  
  // Initial wait before first scroll
  await new Promise(resolve => setTimeout(resolve, timePerScroll * 1000));
  
  // Perform multiple random scrolls at different positions
  for (let i = 0; i < scrollCount; i++) {
    // Generate random scroll position within page bounds
    const scrollPosition = getRandomInt(0, maxScroll);
    console.log(`🖱️ Scroll ${i + 1}/${scrollCount}: Scrolling to position ${scrollPosition}px...`);
    await page.evaluate(pos => window.scrollTo(0, pos), scrollPosition);
    
    // Add small random delay between scrolls to mimic human behavior
    const scrollDelay = getRandomFloat(0.5, 2.5);
    await new Promise(resolve => setTimeout(resolve, scrollDelay * 1000));
  }
  
  // Final scroll to a random position before clicking phone button
  const finalScrollPosition = getRandomInt(0, maxScroll);
  console.log(`🖱️ Final scroll: Scrolling to position ${finalScrollPosition}px before phone button click...`);
  await page.evaluate(pos => window.scrollTo(0, pos), finalScrollPosition);

  // Try to show phone number
  let phoneShown = false;
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log("✅ Phone number displayed!");
    phoneShown = true;
  } catch {
    console.warn("⚠️ Failed to display phone number.");
  }

  // Capture page snapshot as MHTML
  let data = null;
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send("Page.enable");
    const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
    data = snapshot.data;
  } catch (err) {
    console.error(`⚠️ Failed to capture MHTML for ${url}: ${err.message}`);
  }

  // Generate safe file name
  let title = await page.title();
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.mhtml`);

  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  let savedPath = null;
  if (data) {
    fs.writeFileSync(filePath, data);
    console.log(`💾 Saved: ${filePath}`);
    savedPath = filePath;
  } else {
    const htmlPath = filePath.replace(/\.mhtml$/, ".html");
    await fs.promises.writeFile(htmlPath, await page.content(), "utf-8");
    console.log(`💾 Saved (fallback HTML): ${htmlPath}`);
    savedPath = htmlPath;
  }

  await page.close();
  return { phoneShown, savedPath };
}
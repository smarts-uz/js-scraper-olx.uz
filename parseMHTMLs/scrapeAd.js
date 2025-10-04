import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scrapes an ad from a URL and saves it as MHTML
 */
export async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Loading ad: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

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
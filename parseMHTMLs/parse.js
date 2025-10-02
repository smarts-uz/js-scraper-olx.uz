import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Scrapes an ad from a URL and saves it as MHTML
 */
async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Loading ad: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Show phone number
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log("✅ Phone number displayed!");
  } catch {
    console.warn("⚠️ Failed to display phone number.");
  }

  // Capture page snapshot
  let data = null;
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send("Page.enable");
    const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
    data = snapshot.data;
  } catch (err) {
    console.error(`⚠️ Failed to capture MHTML for ${url}: ${err.message}`);
  }

  // File name = page title
  let title = await page.title();
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `olx_ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.mhtml`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  if (data) {
    fs.writeFileSync(filePath, data);
    console.log(`💾 Saved: ${filePath}`);
  } else {
    const htmlPath = filePath.replace(/\.mhtml$/, ".html");
    await fs.promises.writeFile(htmlPath, await page.content(), "utf-8");
    console.log(`💾 Saved (fallback HTML): ${htmlPath}`);
  }
  
  await page.close();
}

/**
 * Reads .url files from a directory and extracts URLs
 */
function readUrlsFromDirectory(dirPath) {
  const urls = [];
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    if (path.extname(file) === '.url') {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract URL from .url file content
      const urlMatch = content.match(/URL=(.*)/i);
      if (urlMatch && urlMatch[1]) {
        urls.push(urlMatch[1].trim());
      }
    }
  }
  
  return urls;
}

/**
 * Processes all .url files from input directory and saves MHTML files to output directory
 * @param {string} inputDir - Directory containing .url files
 * @param {string} outputDir - Directory to save MHTML files
 */
export async function processUrlFiles(inputDir, outputDir) {
  console.log(`📂 Reading .url files from: ${inputDir}`);
  console.log(`💾 Saving MHTML files to: ${outputDir}`);
  
  // Read URLs from .url files
  const urls = readUrlsFromDirectory(inputDir);
  console.log(`🔗 Found ${urls.length} URLs to process`);
  
  if (urls.length === 0) {
    console.log("📭 No .url files found in the input directory");
    return;
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    slowMo: 100,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  console.log("🌐 Browser launched");
  
  // Process each URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n📝 Processing ${i + 1}/${urls.length}: ${url}`);
    
    try {
      await scrapeAd(url, outputDir, browser);
    } catch (error) {
      console.error(`❌ Error processing ${url}: ${error.message}`);
    }
  }
  
  // Close browser
  await browser.close();
  console.log("\n🏁 All URLs processed!");
}

await processUrlFiles("../- Theory/App","../- Theory" );
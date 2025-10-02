import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Scrapes an ad from a URL and saves it as MHTML
 * Returns { phoneShown: boolean, savedPath: string }
 */
async function scrapeAd(url, saveDir, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ Loading ad: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Show phone number
  let phoneShown = false;
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log("✅ Phone number displayed!");
    phoneShown = true;
  } catch (err) {
    console.warn("⚠️ Failed to display phone number.");
    phoneShown = false;
  }

  // Capture page snapshot (MHTML)
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
  if (!safeName) safeName = `ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.mhtml`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

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

/**
 * Launch a browser instance with given profile and extension
 */
async function launchBrowserWithProfile(extensionPath, userDataDir) {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-background-mode",
    "--disable-extension-welcome-page",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-features=HttpsUpgrades",
    "--disable-popup-blocking",
    "--hide-crash-restore-bubble",
    `--user-data-dir=${userDataDir}`,
    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.174 Safari/537.36",
    "--lang=en-US",
    "--window-position=0,0",
  ];

  if (extensionPath && fs.existsSync(extensionPath)) {
    args.push(`--disable-extensions-except=${extensionPath}`);
    args.push(`--load-extension=${extensionPath}`);
  }

  return await puppeteer.launch({
    headless: false,
    slowMo: 100,
    args
  });
}

/**
 * Reads .url files from a directory and extracts URLs
 */
function readUrlsFromDirectory(dirPath) {
  const urls = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (path.extname(file).toLowerCase() === '.url') {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const urlMatch = content.match(/URL=(.*)/i);
      if (urlMatch && urlMatch[1]) {
        urls.push({
          url: urlMatch[1].trim(),
          filePath: filePath,
          fileName: file
        });
      }
    }
  }
  return urls;
}

/**
 * Main processing
 */
export async function processUrlFiles(inputDir, outputDir, otherDir = null) {
  if (!otherDir) otherDir = path.join(inputDir, "Other");

  console.log(`📂 Reading .url files from: ${inputDir}`);
  console.log(`💾 Saving MHTML files to: ${outputDir}`);
  console.log(`📁 Moving processed .url files to: ${otherDir}`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(otherDir)) fs.mkdirSync(otherDir, { recursive: true });

  const urlObjects = readUrlsFromDirectory(inputDir);
  console.log(`🔗 Found ${urlObjects.length} URLs to process`);
  if (urlObjects.length === 0) {
    console.log("📭 No .url files found in the input directory");
    return;
  }

  // === CONFIG ===
  const extensionPath = "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\extension\\omghfjlpggmjjaagoclmmobgdodcjboh";
  const profileDirs = [
    "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\fc42f8a0228a7c8a3d26b24835f9971b",
    "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\fd30c293f724d89f8f1aaead951d17e6",
    "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\4f927d157bea46185cfac529ff7e553f"
  ];

  console.log("🌐 Starting processing with profiles:", profileDirs);

  let currentProfileIndex = 0;

  for (let i = 0; i < urlObjects.length; i++) {
    const { url, filePath, fileName } = urlObjects[i];
    console.log(`\n📝 Processing ${i + 1}/${urlObjects.length}: ${url}`);

    let success = false;
    let lastSavedPath = null;
    let attempts = 0;

    while (!success && attempts < profileDirs.length) {
      const profile = profileDirs[currentProfileIndex];
      console.log(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

      let browser = null;
      try {
        browser = await launchBrowserWithProfile(extensionPath, profile);
        const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
        lastSavedPath = savedPath;
        await browser.close();

        if (phoneShown) {
          console.log(`✅ Phone shown with profile ${profile}`);
          success = true;
          // ❗ shu profilda davom etadi
        } else {
          console.warn(`⚠️ Phone NOT shown with profile ${profile}`);
          if (currentProfileIndex === profileDirs.length - 1) {
            console.error("❌ All profiles failed. Stopping process...");
            process.exit(1);   // ❗ to‘xtatadi
          }
          currentProfileIndex++;
        }
      } catch (err) {
        console.error(`❌ Error with profile ${profile}: ${err.message}`);
        if (browser) { try { await browser.close(); } catch {} }
        if (currentProfileIndex === profileDirs.length - 1) {
          console.error("❌ All profiles failed. Stopping process...");
          process.exit(1);   // ❗ to‘xtatadi
        }
        currentProfileIndex++;
      }

      attempts++;
    }

    try {
      const destinationPath = path.join(otherDir, fileName);
      fs.renameSync(filePath, destinationPath);
      console.log(`➡️ Moved ${fileName} to ${otherDir}`);
    } catch (err) {
      console.error(`⚠️ Failed to move ${fileName}: ${err.message}`);
    }

    if (!success) {
      console.warn(`❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`);
    } else {
      console.log(`🏁 Completed ${url}, saved: ${lastSavedPath}`);
    }
  }

  console.log("\n🏁 All URLs processed!");
}

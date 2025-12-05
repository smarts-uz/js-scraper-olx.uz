import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import { Utils } from './Logs.js';
import { readFileSync } from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envpath = path.join(__dirname, "..", ".env");
const utils = new Utils();
const logger = utils.log;
dotenv.config({ path: envpath });
const headlessENV = process.env.Headless?.toLowerCase() === 'true';

export class ChromeRunner {


 static async  tryProfilesForUrl(
  url,
  outputDir,
  profileDirs,
  currentProfileIndex,
  globalLangIndex,
  currentSavedCount,
  is_native
) {
  let success = false;
  let lastSavedPath = null;
  let attempts = 0;
  let profileData = {};


  const runner = new ChromeRunner();
const utils = new Utils();
const chromeLanguages = [
  'fr', 'en-US', 'ru', 'tr', 'de', 'es', 'it', 'ja', 'zh-CN', 'ko', 'ar'
];

  while (!success && attempts < profileDirs.length) {
    const profile = profileDirs[currentProfileIndex];
    logger.info(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectDir = path.resolve(__dirname, '..');
    const profileIndexFile = path.join(projectDir, 'profile.json');
    
    let browser = null;
    try {
      const lang = chromeLanguages[globalLangIndex % chromeLanguages.length];
      const userAgent = new UserAgent([/Chrome/, {deviceCategory: 'desktop'}]);
      
     profileData = {
      number: currentProfileIndex + 1,
      currentProfileIndex,
      profilePath: profile,
      agent: userAgent.toString(),
      lang:lang,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));

        browser = await runner.run(profile,lang,userAgent.toString(),is_native);
      const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
      lastSavedPath = savedPath;
      await browser.close();

      if (phoneShown) {
        logger.info(`✅ Phone shown with profile ${profile} (lang: ${lang})`);
        success = true;
      } else {
        logger.warn(`⚠️ Phone NOT shown with profile ${profile} (lang: ${lang})`);
        await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  Phone NOT shown with profile ${profile} (lang: ${lang}) for ${url}`);

        if (currentProfileIndex === profileDirs.length - 1) {
          logger.error('❌ All profiles failed. Stopping process...');
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      }
    } catch (err) {
      logger.error(`❌ Error with profile ${profile}: ${err.message}`);
      // Check if this is a recoverable error
      const isRecoverableError = err.message.includes('Target closed') || 
                                err.message.includes('Protocol error') || 
                                err.message.includes('Navigation failed') ||
                                err.message.includes('net::ERR_');
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          logger.warn(`⚠️ Error closing browser: ${closeErr.message}`);
        }
      }
      
      // If it's a recoverable error, try the next profile
      if (isRecoverableError) {
        logger.info(`🔄 Recoverable error detected. Trying next profile...`);
        // Add a small delay to allow Chrome to fully close
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (currentProfileIndex === profileDirs.length - 1) {
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      } else {
        // For non-recoverable errors, exit
        if (currentProfileIndex === profileDirs.length - 1) {
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      }
    }
    attempts++;
  }

  return { success, lastSavedPath, currentProfileIndex, globalLangIndex };
}



  static getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  static async scrapeMhtml(url, saveDir, browser) {

    const Wait_Min = process.env.Wait_Min || 5;
    const Wait_Max = process.env.Wait_Max || 30;
    const Scroll_Count_Min = process.env.Scroll_Count_Min || 2;
    const Scroll_Count_Max = process.env.Scroll_Count_Max || 5;

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    logger.info(`➡️ Loading ad: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Random waiting and scrolling to simulate human behavior
    const waitTime = getRandomInt(parseInt(Wait_Min), parseInt(Wait_Max));
    const scrollCount = getRandomInt(parseInt(Scroll_Count_Min), parseInt(Scroll_Count_Max));

    logger.info(`⏳ Waiting for ${waitTime}s with ${scrollCount} random scrolls...`);

    const timePerScroll = waitTime / (scrollCount + 1);
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxScroll = pageHeight - viewportHeight;

    // Initial wait before first scroll
    await new Promise(resolve => setTimeout(resolve, timePerScroll * 1000));

    for (let i = 0; i < scrollCount; i++) {
      const scrollPosition = getRandomInt(0, maxScroll);
      logger.info(`🖱️ Scroll ${i + 1}/${scrollCount}: Scrolling to ${scrollPosition}px...`);
      await page.evaluate(pos => window.scrollTo(0, pos), scrollPosition);
      const scrollDelay = getRandomFloat(0.5, 2.5);
      await new Promise(resolve => setTimeout(resolve, scrollDelay * 1000));
    }

    const finalScrollPosition = getRandomInt(0, maxScroll);
    logger.info(`🖱️ Final scroll to ${finalScrollPosition}px before checking phone...`);
    await page.evaluate(pos => window.scrollTo(0, pos), finalScrollPosition);

    // ✅ Handle phone number display
    let phoneShown = false;
    try {
      const phoneButtons = await page.$$('button[data-testid="show-phone"]');
      for (const btn of phoneButtons) {
        const visible = await btn.isVisible?.() || await btn.evaluate(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        if (visible) {
          logger.info('📞 Found visible phone button, clicking...');
          await btn.click();
          await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
          logger.info('✅ Phone number displayed!');
          phoneShown = true;
          break;
        }
      }
      phoneShown = true;
    } catch (err) {
      logger.warn(`⚠️ Phone handling error: ${err.message}`);
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
        logger.info("🧩 Capturing MHTML snapshot...");
        const cdp = await page.createCDPSession();
        await cdp.send("Page.enable");

        // Wait a bit to let dynamic content settle
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
          fs.writeFileSync(filePath, data);
          logger.info(`💾 Saved (MHTML): ${filePath}`);
          savedPath = filePath;
        } catch (mhtmlErr) {
          // More specific error handling for MHTML capture
          if (
            mhtmlErr.message &&
            mhtmlErr.message.includes("Protocol error (Page.captureSnapshot): Failed  to generate MHTML")
          ) {
            logger.error(
              `❌ Failed to capture MHTML for ${url}: The page may contain resources or frames that prevent MHTML generation.`
            );
          } else {
            logger.error(`⚠️ Failed to capture MHTML for ${url}: ${mhtmlErr.message}`);
          }
        }
      } catch (err) {
        logger.error(`⚠️ Unexpected error during MHTML capture for ${url}: ${err.message}`);
      }
    } else {
      logger.info("⚠️ Phone number not shown. Skipping MHTML capture.");
    }

    await page.close();
    return { phoneShown, savedPath };
  }


  static async scrapeUrl(url, saveDir, browser) {
    // Check if URL already exists in any relevant directory
    if (urlExistsInDirectories(url, saveDir)) {
      logger.info(`⏭️  URL already exists, skipping: ${url}`);
      return;
    }

    // Extract title from URL without loading the page
    const urlObj = new URL(url);

    let title = urlObj.pathname;
    const urlFileContent = `[InternetShortcut]
URL=${url}`;

    let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
    const filePath = path.join(saveDir, `Olx.Uz ${safeName}.url`);

    // Check if file already exists in the current directory
    if (fs.existsSync(filePath)) {
      return;
    }

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    fs.writeFileSync(filePath, urlFileContent);
    logger.info(`💾 Saved URL file: ${filePath}`);
  }



  constructor(chromeVersion = process.env.CHROME_VERSION) {
    if (!chromeVersion) {
      throw new Error('❌ CHROME_VERSION belgilanmagan (env orqali).');
    }
    this.chromeVersion = chromeVersion;
    this.win = path.win32;
  }

  static findRawPathInTxtFiles(rawPath) {
    const folderPath = path.join(__dirname, "../CmdLine");
    this.log.info("folderPath:", folderPath);

    if (!fs.existsSync(folderPath)) {
      this.log.info("❌ Folder mavjud emas!");
      return null;
    }

    const files = fs.readdirSync(folderPath);
    const txtFiles = files.filter(file => file.endsWith(".txt"));

    const normalizePath = (p) =>
      p.replace(/\\/g, "\\")
        .replace(/\\\\+/g, "\\")
        .toLowerCase();

    const normalizedRaw = normalizePath(rawPath);

    for (const file of txtFiles) {
      const filePath = path.join(folderPath, file);
      this.log.info(`Tekshirilmoqda: ${filePath}`);

      const content = fs.readFileSync(filePath, "utf8");
      const normalizedContent = normalizePath(content);

      if (normalizedContent.includes(normalizedRaw)) {
        this.log.info(`✅ ${filePath} fayl ichida topildi!`);
        return filePath;
      }
    }

    this.log.error(`❌ ${rawPath} hech bir faylda topilmadi.`);
    return null;
  }


  async run(rawPath, lang, agent, is_find) {
    if (!rawPath) throw new Error('❗ rawPath argumenti kerak (user data dir yo‘li)');
    if (!lang) throw new Error('❗ lang argumenti kerak (lang)');
    if (!is_find) {
      let browser;
      const normalized = this.win.normalize(rawPath);
      const segments = normalized.split(this.win.sep).filter(Boolean);
      const lowerSegments = segments.map(s => s.toLowerCase());

      let roamingIndex = lowerSegments.indexOf('roaming');
      if (roamingIndex === -1) {
        const appIdx = lowerSegments.indexOf('appdata');
        if (appIdx !== -1 && lowerSegments[appIdx + 1] === 'roaming')
          roamingIndex = appIdx + 1;
      }
      if (roamingIndex === -1) {
        throw new Error('❌ "Roaming" segment topilmadi.');
      }

      const roamingBase = this.win.join(...segments.slice(0, roamingIndex + 1));
      const chromeDir = this.win.join(roamingBase, 'ixBrowser-Resources', 'chrome');


      const chromeExePath = this.win.join(chromeDir, this.chromeVersion, 'chrome.exe');

      const extensionBase = this.win.join(roamingBase, 'ixBrowser', 'Browser Data', 'extension');
      let extensions = [];
      try {
        const extDirs = await fs.readdir(extensionBase, { withFileTypes: true });
        extensions = extDirs
          .filter(d => d.isDirectory())
          .map(d => this.win.join(extensionBase, d.name));
      } catch {
        logger.warn('⚠️ Extension papkasi topilmadi yoki bo‘sh:', extensionBase);
      }

      if (!existsSync(chromeExePath)) {
        throw new Error(`❌ chrome.exe topilmadi: ${chromeExePath}`);
      }

      const args = [
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--password-store=basic',
        '--use-mock-keychain',
        `--user-data-dir=${normalized}`,
        '--no-default-browser-check',
        '--disable-background-mode',
        '--disable-extension-welcome-page',
        '--autoplay-policy=no-user-gesture-required',
        '--protected-enablechromeversion=1',
        '---protected-gems=2147483649',
        '--js-flags=--ignore_debugger',
        '--protected-webgpu=nvidia,ampere',
        '--disable-features=HttpsUpgrades,HttpsFirstModeV2ForEngagedSites,HttpsFirstBalancedMode,HttpsFirstBalancedModeAutoEnable,EnableFingerprintingProtectionFilter,FlashDeprecationWarning,EnablePasswordsAccountStorage,RendererCodeIntegrity',
        '--disable-popup-blocking',
        '--hide-crash-restore-bubble',
        `--user-agent=${agent}`,
        `--lang=${lang}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-position=0,0',
      ];

      if (extensions.length > 0) {
        args.push(
          `--disable-extensions-except=${extensions.join(',')}`,
          `--load-extension=${extensions.join(',')}`
        );
      }

      try {
        browser = await puppeteer.launch({
          // executablePath: chromeExePath,
          headless: headlessENV, // ⚠️ extensionlar faqat headless=false da ishlaydi
          defaultViewport: { width: 800, height: 600 },
          args,
        });

        logger.info('✅ Puppeteer orqali Chrome ishga tushdi.', args);
      } catch (err) {
        logger.error('❌ Puppeteer.launch() xatosi:', err.message);
        throw err;
      }

      // Extension sahifasi avtomatik ochilmasligi uchun
      const pages = await browser.pages();
      if (pages.length > 0) await pages[0].goto('about:blank');

      browser.on('disconnected', () => {
      });
      return browser;
    } else {
      const txtPath = utils.findRawPathInTxtFiles(rawPath);
      if (!txtPath) logger.error("❌ Fayl topilmadi.");

      logger.info(`✅ Chrome konfiguratsiya fayli: ${txtPath}`);

      // Faylni o‘qish
      const lines = readFileSync(txtPath, "utf8")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      const fullLine = lines.find(l => l.startsWith("[FULL]"));
      let argsText = fullLine ? fullLine.replace("[FULL]", "").trim() : lines.join(" ");

      // .exe joylashuvini topamiz
      const exeMatch = argsText.match(/([A-Z]:\\[^\s"]+chrome\.exe)/i);
      if (!exeMatch) throw new Error("❌ chrome.exe topilmadi!");

      const executablePath = exeMatch[1].replace(/\\/g, "\\");
      logger.info("🧭 Chrome executable:", executablePath);

      const regex = /"([^"]+)"|(\S+)/g;
      const args = [];
      let match;
      while ((match = regex.exec(argsText)) !== null) {
        args.push(match[1] || match[2]);
      }

      const filteredArgs = args
        .filter(a => !a.includes("chrome.exe"))
        .map(a => a.includes(":\\") ? utils.cleanPath(a) : a);


      // logger.info("⚙️ Chrome args:", filteredArgs);
      let extPath;
      extPath = filteredArgs.find(a => a.startsWith("--load-extension"));
      extPath = extPath ? extPath.split("=")[1] : null;
      if (!extPath) throw new Error("❌ Extension .crx fayli topilmadi!");
      // Puppeteer ishga tushurish
      const browser = await puppeteerCore.launch({
        executablePath,
        headless: false,
        args: [
          `--disable-extensions-except=${extPath}`,
          `--load-extension=${extPath}`,
          ...filteredArgs.filter(a => !a.startsWith("--load-extension"))
        ]
      })

      const pages = await browser.pages();
      const page = pages.length ? pages[0] : await browser.newPage();
      logger.info("✅ Puppeteer ishga tushdi!");

      return browser;
    }
  }
}

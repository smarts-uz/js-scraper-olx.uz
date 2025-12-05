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

export class Chromes {




  static runChrome() {

    const rawPath = process.argv[2];

    if (!rawPath) {
      logger.error('❗ Foydalanish:');
      logger.error('  node autoRunChrome.mjs "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\<folder>"');
      process.exit(1);
    }

    const runner = new ChromeRunner(); // CHROME_VERSION avtomatik .env dan olinadi
    runner.run(rawPath, 'en-us', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', true).catch(err => logger.error(err));


  }
  static runCurrentChrome() {
    const win = path.win32;

    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    const profileData = JSON.parse(readFileSync(profileIndexFile, 'utf8'));
    const rawPath = profileData.profilePath;

    const runner = new ChromeRunner();
    runner.run(rawPath, profileData.lang, profileData.agent)
      .then(() => logger.info(""))
      .catch(err => logger.error("❌ Xatolik:", err.message));


  }

  static async tryProfilesForUrl(
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
        const userAgent = new UserAgent([/Chrome/, { deviceCategory: 'desktop' }]);

        profileData = {
          number: currentProfileIndex + 1,
          currentProfileIndex,
          profilePath: profile,
          agent: userAgent.toString(),
          lang: lang,
          timestamp: new Date().toISOString(),
        };

        fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));

        browser = await runner.run(profile, lang, userAgent.toString(), is_native);
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



  static async processUrlFiles(inputDir, outputDir, is_native, otherDir = null) {
    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    const Folder_Ixbrowser = process.env.Folder_Ixbrowser;

    if (!otherDir) otherDir = path.join(inputDir, "@ Other");

    logger.info(`📂 Reading .url files from: ${inputDir}`);
    logger.info(`💾 Saving MHTML files to: ${outputDir}`);
    logger.info(`📁 Moving processed .url files to: ${otherDir}`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(otherDir)) fs.mkdirSync(otherDir, { recursive: true });

    const urlObjects = readUrlsFromDirectory(inputDir);
    logger.info(`🔗 Found ${urlObjects.length} URLs to process`);
    if (urlObjects.length === 0) {
      logger.info("📭 No .url files found in the input directory");
      return;
    }


    if (!Folder_Ixbrowser) {
      throw new Error('Folder_Ixbrowser environment variable is required but not set');
    }


    const browserDataPath = path.join(Folder_Ixbrowser, 'Browser Data');
    logger.info("📂 Browser Data directory:", browserDataPath);

    let profileDirs = [];

    if (fs.existsSync(browserDataPath)) {
      const items = fs.readdirSync(browserDataPath, { withFileTypes: true });
      profileDirs = items
        .filter(item => item.isDirectory() && item.name !== 'extension')
        .map(item => path.join(browserDataPath, item.name));
    }
    profileDirs = [...profileDirs];

    if (profileDirs.length === 0) {
      throw new Error('No profile directories found');
    }

    logger.info("🌐 Starting processing with profiles:", profileDirs);

    let currentProfileIndex = 0;
    let globalLangIndex = 0;
    if (fs.existsSync(profileIndexFile)) {
      try {
        const profileData = JSON.parse(fs.readFileSync(profileIndexFile, 'utf8'));
        currentProfileIndex = profileData.currentProfileIndex || 0;
        logger.info(`🔄 Resuming from profile index: ${currentProfileIndex}`);
      } catch (err) {
        logger.warn(`⚠️ Failed to read profile index file: ${err.message}`);
      }
    }

    for (let i = 0; i < urlObjects.length; i++) {
      const { url, filePath, fileName } = urlObjects[i];
      logger.info(`\n📝 Processing ${i + 1}/${urlObjects.length}: ${url}`);

      const {
        success,
        lastSavedPath,
        currentProfileIndex: newProfileIndex,
        globalLangIndex: newGlobalLangIndex,
      } = await tryProfilesForUrl(
        url,
        outputDir,
        profileDirs,
        currentProfileIndex,
        globalLangIndex,
        i,
        is_native
      );
      currentProfileIndex = newProfileIndex;
      globalLangIndex = newGlobalLangIndex;
      try {
        const destinationPath = path.join(otherDir, fileName);
        fs.renameSync(filePath, destinationPath);
        logger.info(`➡️ Moved ${fileName} to ${otherDir}`);
      } catch (err) {
        logger.error(`⚠️ Failed to move ${fileName}: ${err.message}`);
      }

      if (!success) {

        logger.warn(`❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`);
      } else {
        logger.info(`🏁 Completed ${url}, saved: ${lastSavedPath}`);
      }
    }

    logger.info("\n🏁 All URLs processed!");
    process.exit(0);
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

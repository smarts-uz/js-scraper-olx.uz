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

  static async scrapeAd(url, saveDir, browser) {
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

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envpath = path.join(__dirname, "..", ".env");

dotenv.config({ path: envpath });
const headlessENV = process.env.Headless?.toLowerCase() === 'true';

export class ChromeRunner {
  constructor(chromeVersion = process.env.CHROME_VERSION) {
    if (!chromeVersion) {
      throw new Error('❌ CHROME_VERSION belgilanmagan (env orqali).');
    }
    this.chromeVersion = chromeVersion;
    this.win = path.win32;
  }

  async run(rawPath, lang,agent, port = 9222) {
    if (!rawPath) throw new Error('❗ rawPath argumenti kerak (user data dir yo‘li)');
    if (!lang) throw new Error('❗ lang argumenti kerak (lang)');

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
      console.warn('⚠️ Extension papkasi topilmadi yoki bo‘sh:', extensionBase);
    }

    if (!existsSync(chromeExePath)) {
      throw new Error(`❌ chrome.exe topilmadi: ${chromeExePath}`);
    }
    console.log("agen **Ko'rib chiqsin hamma !*", agent);
    
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
      `--remote-debugging-port=${port}`,
    ];

    if (extensions.length > 0) {
      args.push(
        `--disable-extensions-except=${extensions.join(',')}`,
        `--load-extension=${extensions.join(',')}`
      );
    }

  

    let browser;
    try {
      browser = await puppeteer.launch({
        // executablePath: chromeExePath,
        headless: headlessENV, // ⚠️ extensionlar faqat headless=false da ishlaydi
        defaultViewport: { width: 800, height: 600 },
        args,
      });

      console.log('✅ Puppeteer orqali Chrome ishga tushdi.');
    } catch (err) {
      console.error('❌ Puppeteer.launch() xatosi:', err.message);
      throw err;
    }

    // Extension sahifasi avtomatik ochilmasligi uchun
    const pages = await browser.pages();
    if (pages.length > 0) await pages[0].goto('about:blank');

    browser.on('disconnected', () => {
    });

    return browser;
  }
}

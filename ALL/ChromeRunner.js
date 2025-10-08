import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core';

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

  async run(rawPath, lang, port = 9222) {
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

    const args = [
      `--user-data-dir=${normalized}`,
      `--remote-debugging-port=${port}`,
      '--no-default-browser-check',
      '--no-first-run',
      '--window-position=0,0',
      '--disable-popup-blocking',
      '--hide-crash-restore-bubble',
      '--disable-setuid-sandbox',
      `--lang=${lang}`,
      '--force-color-profile=srgb',
      '--disable-background-mode',
      '--no-sandbox',
      '--disable-features=RendererCodeIntegrity,CanvasNoise,FlashDeprecationWarning',
    ];

    if (extensions.length > 0) {
      args.push(
        `--disable-extensions-except=${extensions.join(',')}`,
        `--load-extension=${extensions.join(',')}`
      );
    }

    // console.log('🚀 Chrome (puppeteer orqali) ishga tushirilmoqda...');
    // console.log('📁 User-data-dir:', normalized);
    // console.log('📁 Extensions:', extensions.length);
    // console.log('📁 Headless:', headlessENV);

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: chromeExePath,
        headless: false, // ⚠️ extensionlar faqat headless=false da ishlaydi
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

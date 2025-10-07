// ChromeRunner.js
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core'; // 🔥 Qo‘shiladi

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envpath = path.join(__dirname, "..", ".env");

dotenv.config({ path: envpath });

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
      extensions = extDirs.filter(d => d.isDirectory()).map(d => this.win.join(extensionBase, d.name));
    } catch {
      console.warn('⚠️ Extension papkasi topilmadi yoki bo‘sh:', extensionBase);
    }

    const args = [
      `--user-data-dir=${normalized}`,
      `--remote-debugging-port=${port}`, // 🔥 Muhim
      '--no-default-browser-check',
      '--no-first-run',
      '--window-position=0,0',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-popup-blocking',
      '--hide-crash-restore-bubble',
      '--disable-setuid-sandbox',
      `--lang=${lang}`,
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-background-mode',
      '--disable-extension-welcome-page',
      '--protected-enablechromeversion=1',
      '--enable-unsafe-swiftshader',
      '--disable-features=HttpsUpgrades,HttpsFirstModeV2ForEngagedSites,HttpsFirstBalancedMode,HttpsFirstBalancedModeAutoEnable,EnableFingerprintingProtectionFilter,FlashDeprecationWarning,EnablePasswordsAccountStorage,RendererCodeIntegrity,CanvasNoise',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.94 Safari/537.36',
      '--no-sandbox'
    ];

    if (extensions.length > 0) args.push(`--load-extension=${extensions.join(',')}`);

    if (!existsSync(chromeExePath)) {
      throw new Error(`❌ chrome.exe topilmadi: ${chromeExePath}`);
    }

    console.log('🚀 Chrome ishga tushirilmoqda...');
    console.log('📁 user-data-dir:', normalized);
    console.log('📁 Chrome:', chromeExePath);
    console.log('📁 Extensions:', extensions.length);

    // 🔹 1. Chrome ishga tushadi
    const child = spawn(chromeExePath, args, {  stdio: 'inherit' });

    console.log('✅ Chrome ishga tushirildi (detached). Ulanish uchun kutilyapti...');

    // 🔹 2. Chrome endpoint ochilishini kutamiz
    const endpoint = `http://127.0.0.1:${port}/json/version`;

    let browserWSEndpoint = null;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          browserWSEndpoint = data.webSocketDebuggerUrl;
          break;
        }
      } catch {
        await new Promise(r => setTimeout(r, 500)); // 0.5s kutish
      }
    }

    if (!browserWSEndpoint) {
      throw new Error('❌ Chrome bilan ulanib bo‘lmadi (devtools endpoint topilmadi)');
    }

    // 🔹 3. Puppeteer orqali ulanamiz
    const browser = await puppeteer.connect({ browserWSEndpoint });
    console.log('✅ Puppeteer Chrome bilan ulanib oldi.');

    return browser; // 🔥 endi browser instance qaytadi
  }
}

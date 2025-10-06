import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const win = path.win32;

// ✅ 1. Argumentni olish (faqat user-data-dir kerak)
const rawPath = process.argv[2];
if (!rawPath) {
  console.error('❗ Foydalanish:');
  console.error('  node autoRunChrome.mjs "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\<folder>"');
  process.exit(1);
}

// ✅ 2. Normalizatsiya va segmentlarga ajratish
const normalized = win.normalize(rawPath);
const segments = normalized.split(win.sep).filter(Boolean);
const lowerSegments = segments.map(s => s.toLowerCase());

// ✅ 3. "Roaming" segmentini topish
let roamingIndex = lowerSegments.indexOf('roaming');
if (roamingIndex === -1) {
  const appIdx = lowerSegments.indexOf('appdata');
  if (appIdx !== -1 && lowerSegments[appIdx + 1] === 'roaming')
    roamingIndex = appIdx + 1;
}
if (roamingIndex === -1) {
  console.error('❌ Xatolik: "Roaming" segment topilmadi.');
  process.exit(2);
}

// ✅ 4. Roaming bazasi
const roamingBase = win.join(...segments.slice(0, roamingIndex + 1));
const chromeDir = win.join(roamingBase, 'ixBrowser-Resources', 'chrome');

// ✅ 5. Chrome versiya papkasini avtomatik aniqlash
let chromeExePath;
try {
  const dirs = await fs.readdir(chromeDir, { withFileTypes: true });
  const chromeVersions = dirs.filter(d => d.isDirectory()).map(d => d.name);
  chromeVersions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const latest = chromeVersions.at(-1);
  chromeExePath = win.join(chromeDir, latest, 'chrome.exe');
  console.log(`🧩 Eng so‘nggi Chrome versiyasi: ${latest}`);
} catch (err) {
  console.warn('⚠️ Chrome versiyasini aniqlab bo‘lmadi, fallback ishlatiladi.');
  chromeExePath = win.join(chromeDir, '138-0004', 'chrome.exe');
}

// ✅ 6. Extension papkalarini o‘qish
const extensionBase = win.join(roamingBase, 'ixBrowser', 'Browser Data', 'extension');
let extensions = [];
try {
  const extDirs = await fs.readdir(extensionBase, { withFileTypes: true });
  extensions = extDirs
    .filter(d => d.isDirectory())
    .map(d => win.join(extensionBase, d.name));
} catch {
  console.warn('⚠️ Extension papkasi topilmadi yoki bo‘sh:', extensionBase);
}

// ✅ 7. Chrome argumentlarini tayyorlash
const args = [
  `--user-data-dir=${normalized}`,
  '--no-default-browser-check',
  '--no-first-run',
  '--window-position=0,0',
  '--autoplay-policy=no-user-gesture-required',
  '--disable-popup-blocking',
  '--hide-crash-restore-bubble',
  '--disable-setuid-sandbox',
  '--lang=en-US',
  'http://127.0.0.1:24451/?id=4',
  'chrome://newtab'
];

if (extensions.length > 0) {
  args.push(`--load-extension=${extensions.join(',')}`);
}

// ✅ 8. Chrome’ni avtomatik ishga tushirish (flag kerak emas)
if (!existsSync(chromeExePath)) {
  console.error('❌ chrome.exe topilmadi:', chromeExePath);
  process.exit(3);
}

console.log('🚀 Chrome ishga tushirilmoqda...');
console.log('📁 user-data-dir:', normalized);
console.log('📁 Chrome:', chromeExePath);
console.log('📁 Extensions:', extensions.length);

const child = spawn(chromeExePath, args, {
  detached: true,
  stdio: 'ignore'
});
child.unref();

console.log('✅ Chrome ishga tushirildi (detached).');

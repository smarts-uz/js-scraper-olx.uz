import { ChromeRunner } from './ALL/ChromeRunner.js';

const rawPath = process.argv[2];

if (!rawPath) {
  console.error('❗ Foydalanish:');
  console.error('  node autoRunChrome.mjs "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\<folder>"');
  process.exit(1);
}

const runner = new ChromeRunner(); // CHROME_VERSION avtomatik .env dan olinadi
runner.run(rawPath,'fa_IR');

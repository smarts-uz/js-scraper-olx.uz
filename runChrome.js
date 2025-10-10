import { ChromeRunner } from './ALL/ChromeRunner.js';

const rawPath = process.argv[2];

if (!rawPath) {
  console.error('❗ Foydalanish:');
  console.error('  node autoRunChrome.mjs "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\<folder>"');
  process.exit(1);
}

const runner = new ChromeRunner(); // CHROME_VERSION avtomatik .env dan olinadi
runner.run(rawPath,'en-us', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',true).catch(err => console.error(err));

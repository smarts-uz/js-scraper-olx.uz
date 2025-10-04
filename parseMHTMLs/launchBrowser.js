import fs from 'fs';
import puppeteer from 'puppeteer';

/**
 * Launch Chrome with a specific profile
 */
function getHeadlessFromEnv() {
  // Try to read .env file from project root
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/^Headless\s*=\s*(.*)$/im);
    if (match) {
      const value = match[1].trim().toLowerCase();
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
  } catch (e) {
    // ignore, fallback to default
  }
  return true; // default to true if not found
}

export async function launchBrowserWithProfile(extensionPath, userDataDir) {
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

  const headless = getHeadlessFromEnv();

  return await puppeteer.launch({ headless, slowMo: 100, args });
}
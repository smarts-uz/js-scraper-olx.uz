import fs from 'fs';
import puppeteer from 'puppeteer';

/**
 * Launch Chrome with a specific profile
 */
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

  return await puppeteer.launch({ headless: false, slowMo: 100, args });
}
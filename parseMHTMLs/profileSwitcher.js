import fs from 'fs';
import path from 'path';
import { scrapeAd } from './scrapeAd.js';
import { launchBrowserWithProfile } from './launchBrowser.js';

// Language cycling list (moved from caller)
const chromeLanguages = [
  'fr',    // French
  'en-US', // English
  'ru',    // Russian
  'tr',    // Turkish
  'de',    // German
  'es',    // Spanish
  'it',    // Italian
  'ja',    // Japanese
  'zh-CN', // Chinese (Simplified)
  'ko',    // Korean
  'ar',    // Arabic
];
export async function tryProfilesForUrl(
  url,
  outputDir,
  profileDirs,
  extensionPaths,
  currentProfileIndex,
  globalLangIndex
) {
  let success = false;
  let lastSavedPath = null;
  let attempts = 0;

  while (!success && attempts < profileDirs.length) {
    const profile = profileDirs[currentProfileIndex];
    console.log(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

    // Save current profile index to JSON file in project folder
    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    const profileData = {
      number:currentProfileIndex+1,
      currentProfileIndex: currentProfileIndex,
      profilePath: profile,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));

    let browser = null;
    try {
      const lang = chromeLanguages[globalLangIndex % chromeLanguages.length];
      const langFile = path.join(profile, 'last_lang.txt');
      fs.writeFileSync(langFile, String(globalLangIndex % chromeLanguages.length));

      const extensionToUse = extensionPaths.length > 0 ? extensionPaths[0] : null;
      browser = await launchBrowserWithProfile(extensionToUse, profile, lang);
      const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
      lastSavedPath = savedPath;
      await browser.close();

      if (phoneShown) {
        console.log(`✅ Phone shown with profile ${profile} (lang: ${lang})`);
        success = true;
      } else {
        console.warn(`⚠️ Phone NOT shown with profile ${profile} (lang: ${lang})`);
        if (currentProfileIndex === profileDirs.length - 1) {
          console.error('❌ All profiles failed. Stopping process...');
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      }
    } catch (err) {
      console.error(`❌ Error with profile ${profile}: ${err.message}`);
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      if (currentProfileIndex === profileDirs.length - 1) {
        console.error('❌ All profiles failed. Stopping process...');
        process.exit(1);
      }
      currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
      globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
    }

    attempts++;
  }

  return { success, lastSavedPath, currentProfileIndex, globalLangIndex };
}
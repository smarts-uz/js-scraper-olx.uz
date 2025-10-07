import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { scrapeAd } from './scrapeAd.js';
import { launchBrowserWithProfile } from './launchBrowser.js';
import { ChromeRunner } from '../ALL/ChromeRunner.js';
import {sendTelegramMessage} from '../utils.js';
dotenv.config();

const runner = new ChromeRunner();
const chromeLanguages = [
  'fr', 'en-US', 'ru', 'tr', 'de', 'es', 'it', 'ja', 'zh-CN', 'ko', 'ar'
];

export async function tryProfilesForUrl(
  url,
  outputDir,
  profileDirs,
  extensionPaths,
  currentProfileIndex,
  globalLangIndex,
  currentSavedCount
) {
  let success = false;
  let lastSavedPath = null;
  let attempts = 0;

  while (!success && attempts < profileDirs.length) {
    const profile = profileDirs[currentProfileIndex];
    console.log(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    const profileData = {
      number: currentProfileIndex + 1,
      currentProfileIndex,
      profilePath: profile,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));

    let browser = null;
    try {
      const lang = chromeLanguages[globalLangIndex % chromeLanguages.length];
      const langFile = path.join(profile, 'last_lang.txt');
      fs.writeFileSync(langFile, String(globalLangIndex % chromeLanguages.length));

      const extensionToUse = extensionPaths.length > 0 ? extensionPaths[0] : null;
      // browser = await launchBrowserWithProfile(extensionToUse, profile, lang);
        browser = await runner.run(profile,lang);
      const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
      lastSavedPath = savedPath;
      await browser.close();

      if (phoneShown) {
        console.log(`✅ Phone shown with profile ${profile} (lang: ${lang})`);
        success = true;
      } else {
        console.warn(`⚠️ Phone NOT shown with profile ${profile} (lang: ${lang})`);
        await sendTelegramMessage(`❌ ${currentSavedCount} saved and  Phone NOT shown with profile ${profile} (lang: ${lang}) for ${url}`);

        if (currentProfileIndex === profileDirs.length - 1) {
          console.error('❌ All profiles failed. Stopping process...');
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
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
        profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
        fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
        await sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
        process.exit(1);
      }
      currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
      globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
    }
    attempts++;
  }

  return { success, lastSavedPath, currentProfileIndex, globalLangIndex };
}

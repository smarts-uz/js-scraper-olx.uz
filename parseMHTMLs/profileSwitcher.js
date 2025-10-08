import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { scrapeAd } from './scrapeAd.js';
import { ChromeRunner } from '../ALL/ChromeRunner.js';
import { Utils } from '../ALL/Utils.js';
import UserAgent from 'user-agents';


dotenv.config();

const runner = new ChromeRunner();
const utils = new Utils();
const chromeLanguages = [
  'fr', 'en-US', 'ru', 'tr', 'de', 'es', 'it', 'ja', 'zh-CN', 'ko', 'ar'
];

export async function tryProfilesForUrl(
  url,
  outputDir,
  profileDirs,
  currentProfileIndex,
  globalLangIndex,
  currentSavedCount
) {
  let success = false;
  let lastSavedPath = null;
  let attempts = 0;
  let profileData = {};

  while (!success && attempts < profileDirs.length) {
    const profile = profileDirs[currentProfileIndex];
    console.log(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    
    let browser = null;
    try {
      const lang = chromeLanguages[globalLangIndex % chromeLanguages.length];
      const userAgent = new UserAgent([/Chrome/, {deviceCategory: 'desktop'}]);
      
     profileData = {
      number: currentProfileIndex + 1,
      currentProfileIndex,
      profilePath: profile,
      agent: userAgent.toString(),
      lang:lang,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));

        browser = await runner.run(profile,lang,userAgent.toString());
      const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
      lastSavedPath = savedPath;
      await browser.close();

      if (phoneShown) {
        console.log(`✅ Phone shown with profile ${profile} (lang: ${lang})`);
        success = true;
      } else {
        console.warn(`⚠️ Phone NOT shown with profile ${profile} (lang: ${lang})`);
        await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  Phone NOT shown with profile ${profile} (lang: ${lang}) for ${url}`);

        if (currentProfileIndex === profileDirs.length - 1) {
          console.error('❌ All profiles failed. Stopping process...');
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      }
    } catch (err) {
      console.error(`❌ Error with profile ${profile}: ${err.message}`);
      // Check if this is a recoverable error
      const isRecoverableError = err.message.includes('Target closed') || 
                                err.message.includes('Protocol error') || 
                                err.message.includes('Navigation failed') ||
                                err.message.includes('net::ERR_');
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          console.warn(`⚠️ Error closing browser: ${closeErr.message}`);
        }
      }
      
      // If it's a recoverable error, try the next profile
      if (isRecoverableError) {
        console.log(`🔄 Recoverable error detected. Trying next profile...`);
        // Add a small delay to allow Chrome to fully close
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (currentProfileIndex === profileDirs.length - 1) {
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      } else {
        // For non-recoverable errors, exit
        if (currentProfileIndex === profileDirs.length - 1) {
          profileData.description = `❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`;
          fs.writeFileSync(profileIndexFile, JSON.stringify(profileData, null, 2));
          await utils.sendTelegramMessage(`❌ ${currentSavedCount} saved and  All profiles failed for ${url}`);
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        globalLangIndex = (globalLangIndex + 1) % chromeLanguages.length;
      }
    }
    attempts++;
  }

  return { success, lastSavedPath, currentProfileIndex, globalLangIndex };
}

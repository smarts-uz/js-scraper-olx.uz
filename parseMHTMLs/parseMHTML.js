import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { scrapeAd } from './scrapeAd.js';
import { launchBrowserWithProfile } from './launchBrowser.js';
import { readUrlsFromDirectory, readProfilesFromFile } from './utils.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);






/**
 * Main processing
 */
export async function processUrlFiles(inputDir, outputDir, otherDir = null) {
  if (!otherDir) otherDir = path.join(inputDir, "Other");

  console.log(`📂 Reading .url files from: ${inputDir}`);
  console.log(`💾 Saving MHTML files to: ${outputDir}`);
  console.log(`📁 Moving processed .url files to: ${otherDir}`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(otherDir)) fs.mkdirSync(otherDir, { recursive: true });

  const urlObjects = readUrlsFromDirectory(inputDir);
  console.log(`🔗 Found ${urlObjects.length} URLs to process`);
  if (urlObjects.length === 0) {
    console.log("📭 No .url files found in the input directory");
    return;
  }

  // === CONFIG ===
  // Use environment variables only (no hardcoded fallbacks)
  const Folder_Ixbrowser = process.env.Folder_Ixbrowser;
  
  if (!Folder_Ixbrowser) {
    throw new Error('Folder_Ixbrowser environment variable is required but not set');
  }

  const extensionPath = path.join(Folder_Ixbrowser, 'Browser Data/extension');
  
  // Check if extension path exists and find valid extensions
  let extensionPaths = [];
  if (fs.existsSync(extensionPath)) {
    const items = fs.readdirSync(extensionPath, { withFileTypes: true });
    extensionPaths = items
      .filter(item => item.isDirectory())
      .map(item => path.join(extensionPath, item.name))
      .filter(extPath => {
        const manifestPaths = [
          path.join(extPath, 'manifest.json'),
          path.join(extPath, 'manifest')
        ];
        return manifestPaths.some(manifestPath => fs.existsSync(manifestPath));
      });
    
    if (extensionPaths.length === 0) {
      console.warn(`⚠️ Extension path exists but no valid extensions found in: ${extensionPath}`);
    } else {
      console.log(`✅ Found ${extensionPaths.length} valid extensions`);
    }
  } else {
    console.warn(`⚠️ Extension path does not exist: ${extensionPath}`);
  }
  
  // Get all directories in Folder_Ixbrowser except "Browser Data/extension"
  const browserDataPath = path.join(Folder_Ixbrowser, 'Browser Data');
  console.log("📂 Browser Data directory:", browserDataPath);
  
  let profileDirs = [];
  
  if (fs.existsSync(browserDataPath)) {
    const items = fs.readdirSync(browserDataPath, { withFileTypes: true });
    profileDirs = items
      .filter(item => item.isDirectory() && item.name !== 'extension')
      .map(item => path.join(browserDataPath, item.name));
  }
  profileDirs = [...profileDirs];

  if (profileDirs.length === 0) {
    throw new Error('No profile directories found');
  }

  console.log("🌐 Starting processing with profiles:", profileDirs);

  let currentProfileIndex = 0;

  for (let i = 0; i < urlObjects.length; i++) {
    const { url, filePath, fileName } = urlObjects[i];
    console.log(`\n📝 Processing ${i + 1}/${urlObjects.length}: ${url}`);

    let success = false;
    let lastSavedPath = null;
    let attempts = 0;

    while (!success && attempts < profileDirs.length) {
      const profile = profileDirs[currentProfileIndex];
      console.log(`🔁 Using profile [${currentProfileIndex + 1}/${profileDirs.length}]: ${profile}`);

      let browser = null;
      try {
        // Pass extension paths to launch function (use first valid extension or null)
        const extensionToUse = extensionPaths.length > 0 ? extensionPaths[0] : null;
        browser = await launchBrowserWithProfile(extensionToUse, profile);
        const { phoneShown, savedPath } = await scrapeAd(url, outputDir, browser);
        lastSavedPath = savedPath;
        await browser.close();

        if (phoneShown) {
          console.log(`✅ Phone shown with profile ${profile}`);
          success = true;
        } else {
          console.warn(`⚠️ Phone NOT shown with profile ${profile}`);
          if (currentProfileIndex === profileDirs.length - 1) {
            console.error("❌ All profiles failed. Stopping process...");
            process.exit(1);
          }
          currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
        }
      } catch (err) {
        console.error(`❌ Error with profile ${profile}: ${err.message}`);
        if (browser) { try { await browser.close(); } catch {} }
        if (currentProfileIndex === profileDirs.length - 1) {
          console.error("❌ All profiles failed. Stopping process...");
          process.exit(1);
        }
        currentProfileIndex = (currentProfileIndex + 1) % profileDirs.length;
      }

      attempts++;
    }

    try {
      const destinationPath = path.join(otherDir, fileName);
      fs.renameSync(filePath, destinationPath);
      console.log(`➡️ Moved ${fileName} to ${otherDir}`);
    } catch (err) {
      console.error(`⚠️ Failed to move ${fileName}: ${err.message}`);
    }

    if (!success) {
      console.warn(`❗ All profiles exhausted for ${url}. Last saved path (if any): ${lastSavedPath}`);
    } else {
      console.log(`🏁 Completed ${url}, saved: ${lastSavedPath}`);
    }
  }

  console.log("\n🏁 All URLs processed!");
}

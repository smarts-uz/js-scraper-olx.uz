import fs from 'fs';
import path from 'path';
import { readUrlsFromDirectory } from './utils.js';
import { tryProfilesForUrl } from './profileSwitcher.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export async function processUrlFiles(inputDir, outputDir,is_native, otherDir = null) {
    const projectDir = process.cwd();
    const profileIndexFile = path.join(projectDir, 'profile.json');
    const Folder_Ixbrowser = process.env.Folder_Ixbrowser;
   
    if (!otherDir) otherDir = path.join(inputDir, "@ Other");

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

  
  if (!Folder_Ixbrowser) {
    throw new Error('Folder_Ixbrowser environment variable is required but not set');
  }

  
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
  let globalLangIndex = 0;
  if (fs.existsSync(profileIndexFile)) {
    try {
      const profileData = JSON.parse(fs.readFileSync(profileIndexFile, 'utf8'));
      currentProfileIndex = profileData.currentProfileIndex || 0;
      console.log(`🔄 Resuming from profile index: ${currentProfileIndex}`);
    } catch (err) {
      console.warn(`⚠️ Failed to read profile index file: ${err.message}`);
    }
  }

  for (let i = 0; i < urlObjects.length; i++) {
    const { url, filePath, fileName } = urlObjects[i];
    console.log(`\n📝 Processing ${i + 1}/${urlObjects.length}: ${url}`);

    const {
      success,
      lastSavedPath,
      currentProfileIndex: newProfileIndex,
      globalLangIndex: newGlobalLangIndex,
    } = await tryProfilesForUrl(
      url,
      outputDir,
      profileDirs,
      currentProfileIndex,
      globalLangIndex,
      i,
      is_native
    );
    currentProfileIndex = newProfileIndex;
    globalLangIndex = newGlobalLangIndex;
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
  process.exit(0);
}
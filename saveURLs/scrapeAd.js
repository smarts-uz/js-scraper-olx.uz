import fs from "fs";
import path from "path";

/**
 * Finds all directories that need to be checked for duplicates
 * @param {string} rootDir - The project root directory
 * @returns {string[]} - Array of paths to directories
 */
function findRelevantDirectories(rootDir) {
  const dirs = [];
  
  // Check main directory (where App would be created)
  const mainDir = path.join(rootDir, 'App');
  if (fs.existsSync(mainDir)) {
    dirs.push(mainDir);
  }
  
  // Check @ Weak directory
  const weakDir = path.join(rootDir, '@ Weak');
  if (fs.existsSync(weakDir)) {
    dirs.push(weakDir);
  }
  
  // Check @ Other directory
  const otherDir = path.join(rootDir, '@ Other');
  if (fs.existsSync(otherDir)) {
    dirs.push(otherDir);
  }
  
  return dirs;
}

/**
 * Checks if a URL already exists in any relevant directory
 * @param {string} url - The URL to check
 * @param {string} currentSaveDir - The current save directory to exclude from checking
 * @returns {boolean} - True if URL exists, false otherwise
 */
function urlExistsInDirectories(url, currentSaveDir) {
  const rootDir = path.resolve('.');
  const directories = findRelevantDirectories(rootDir);
  
  // Check each directory
  for (const dir of directories) {
    // Skip the current save directory
    if (path.resolve(dir) === path.resolve(currentSaveDir)) continue;
    
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (path.extname(file).toLowerCase() === '.url') {
            const filePath = path.join(dir, file);
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              // Check for exact URL match
              if (content.includes(`URL=${url}`)) {
                console.log(`⚠️  URL already exists in: ${filePath}`);
                return true;
              }
            } catch (err) {
              console.warn(`⚠️  Could not read file: ${filePath}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️  Could not access directory: ${dir}`);
    }
  }
  
  return false;
}

/**
 * Scrapes an ad from a URL and saves it as a .url file
 */
export async function scrapeAd(url, saveDir, browser) {
  // Check if URL already exists in any relevant directory
  if (urlExistsInDirectories(url, saveDir)) {
    console.log(`⏭️  Skipping duplicate URL: ${url}`);
    return;
  }

  // Extract title from URL without loading the page
  const urlObj = new URL(url);
  
  let title = urlObj.pathname;  
  const urlFileContent = `[InternetShortcut]
URL=${url}`;

  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  const filePath = path.join(saveDir, `Olx.Uz ${safeName}.url`);

  // Check if file already exists in the current directory
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  File already exists, skipping: ${filePath}`);
    return;
  }

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  fs.writeFileSync(filePath, urlFileContent);
  console.log(`💾 Saved URL file: ${filePath}`);
}
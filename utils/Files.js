import fs from "fs";
import path from "path";
import { Utils } from './Logs.js';


class files {
  constructor(parameters) {

  }



  /**
   * Finds all directories that need to be checked for duplicates
   * @param {string} rootDir - The project root directory
   * @returns {string[]} - Array of paths to directories
   */
  static findRelevantDirectories(rootDir) {
    const dirs = [];

    // Check main directory and subdirectories
    const checkDirs = [rootDir, path.join(rootDir, '@ Weak'), path.join(rootDir, '@ Other')];

    for (const dir of checkDirs) {
      if (fs.existsSync(dir)) {
        dirs.push(dir);
      }
    }

    return dirs;
  }



  /**
   * Reads .url files from directory
   */
  static readUrlsFromDirectory(dirPath) {
    const urls = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (path.extname(file).toLowerCase() === '.url') {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const urlMatch = content.match(/URL=(.*)/i);
        if (urlMatch && urlMatch[1]) {
          urls.push({ url: urlMatch[1].trim(), filePath, fileName: file });
        }
      }
    }
    return urls;
  }

  /**
   * Reads profile directories from text file
   */
  static readProfilesFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Profile list file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }

/**
 * Checks if a URL already exists in any relevant directory
 * @param {string} url - The URL to check
 * @param {string} currentSaveDir - The current save directory to exclude from checking
 * @returns {boolean} - True if URL exists, false otherwise
 */
function urlExistsInDirectories(url, currentSaveDir) {
  const directories = findRelevantDirectories(currentSaveDir);
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

}

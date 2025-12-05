import fs from "fs";
import path from "path";
import { Utils } from './Logs.js';

const logger = new Utils().log;

/**
 * Finds all directories that need to be checked for duplicates
 * @param {string} rootDir - The project root directory
 * @returns {string[]} - Array of paths to directories
 */
function findRelevantDirectories(rootDir) {
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
              logger.warn(`⚠️  Could not read file: ${filePath}`);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`⚠️  Could not access directory: ${dir}`);
    }
  }
  
  return false;
}

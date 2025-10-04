import fs from 'fs';
import path from 'path';

/**
 * Reads .url files from directory
 */
export function readUrlsFromDirectory(dirPath) {
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
export function readProfilesFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Profile list file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}
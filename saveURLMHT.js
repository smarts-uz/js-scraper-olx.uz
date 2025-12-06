import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const logger = new Utils().log;

const runner = new Utils();

// Get command line arguments
const args = process.argv.slice(2);
const mhtmlFilePath = args[0];

// Get parent path for current file
const currentFilePath = process.argv[1];
const currentDir = path.dirname(currentFilePath);
logger.info(currentDir);

// Append .env to current path
const envpath = path.join(currentDir, ".env");

// === Load environment variables ===
dotenv.config({ path: envpath });

logger.info(process.cwd(), "cwd");

if (!mhtmlFilePath) {
  logger.error("Please provide the path to the MHTML file as an argument.");
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(mhtmlFilePath)) {
  logger.error(`File not found: ${mhtmlFilePath}`);
  process.exit(1);
}

// Read MHTML file and extract URL
const mhtmlContent = fs.readFileSync(mhtmlFilePath, "utf-8");
const urlMatch = mhtmlContent.match(/Snapshot-Content-Location:\s*(.*)/i);
const extractedUrl = urlMatch ? urlMatch[1].trim() : null;

if (!extractedUrl) {
  logger.error("Could not extract URL from MHTML file.");
  process.exit(1);
}

// Determine save directory based on the instruction:
// If the MHTML file is in a folder named 'Theory', create 'App' next to it.
// Otherwise, create 'App' inside the same directory as the MHTML file.
const mhtmlDir = path.dirname(mhtmlFilePath);
const mhtmlParentDir = path.dirname(mhtmlDir);
const mhtmlFolderName = path.basename(mhtmlDir);

let saveDir;
if (mhtmlFolderName === '- Theory') {
  // Place 'App' beside 'Theory'
  saveDir = path.join(mhtmlParentDir, 'App');
} else {
  // Place 'App' inside the same directory as the MHTML file
  saveDir = path.join(mhtmlDir, 'App');
}

// Ensure the save directory exists
if (!fs.existsSync(saveDir)) {
  fs.mkdirSync(saveDir, { recursive: true });
}

const tasks = [
  {
    url: extractedUrl,
    saveDir: saveDir,
  }
];

(async () => {
  try {
    await scrapeMultipleSearches(tasks);
   await runner.showMessageBox(`All URLs downloaded for ${mhtmlFilePath}`, "Completed");
   process.exit(0);
  } catch (err) {
    logger.error("❌ Error during scraping:", err);
  }
})();

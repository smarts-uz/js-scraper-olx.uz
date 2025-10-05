import { scrapeMultipleSearches } from "./saveURLs/parseUrl.js";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';

// Get command line arguments
const args = process.argv.slice(2);
const mhtmlFilePath = args[0];


// Get parent path for current file
const currentFilePath = process.argv[1];
const currentDir = path.dirname(currentFilePath);
console.log(currentDir);


// Append .env to current path
const envpath = path.join(currentDir, ".env");

// === Load environment variables ===
dotenv.config({ path: envpath });

console.log(process.cwd(),"cwd");



if (!mhtmlFilePath) {
  console.error("Please provide the path to the MHTML file as an argument.");
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(mhtmlFilePath)) {
  console.error(`File not found: ${mhtmlFilePath}`);
  process.exit(1);
}

// Read MHTML file and extract URL
const mhtmlContent = fs.readFileSync(mhtmlFilePath, "utf-8");
const urlMatch = mhtmlContent.match(/Snapshot-Content-Location:\s*(.*)/i);
const extractedUrl = urlMatch ? urlMatch[1].trim() : null;

if (!extractedUrl) {
  console.error("Could not extract URL from MHTML file.");
  process.exit(1);
}

// Use the directory of the MHTML file with 'app' subdirectory as saveDir
const saveDir = path.join(path.dirname(mhtmlFilePath), 'App');

const tasks = [
  {
    url: extractedUrl,
    saveDir: saveDir,
  }
];

(async () => {
  await scrapeMultipleSearches(tasks);
})();

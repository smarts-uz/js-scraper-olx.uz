import { processUrlFiles } from './parseMHTMLs/parseMHTML.js';
import { Utils } from './ALL/Utils.js';
import { argv } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get parent path for current file
const currentFilePath = process.argv[1];
const currentDir = path.dirname(currentFilePath);

const runner = new Utils();

// Append .env to current path
const envpath = path.join(currentDir, ".env");

// === Load environment variables ===
dotenv.config({ path: envpath });

console.log(process.cwd(), "cwd");

// Example usage
async function main() {
  try {
    const mhtmlFilePath = argv[2];
    if (!mhtmlFilePath) {
      console.error('Please provide an MHTML file path as a command line argument');
      process.exit(1);
    }

    // Resolve the full path of the MHTML file
    const fullPath = path.resolve(mhtmlFilePath);

    // Get the directory containing the MHTML file
    const mhtmlDir = path.dirname(fullPath);

    // Check if the MHTML file is in a "Theory" folder
    const mhtmlDirName = path.basename(mhtmlDir);
    if (mhtmlDirName === '- Theory') {
      // For Theory folder: look for 'App' folder adjacent to (next to) the Theory folder
      const parentDir = path.dirname(mhtmlDir);
      const inputDir = path.join(parentDir, 'App');
      const outputDir = parentDir;
      console.log(`Processing Theory folder: input from ${inputDir}, output to ${outputDir}`);
      await processUrlFiles(inputDir, outputDir,false);
    } else {
      // Default behavior: set input directory to the 'App' folder next to the MHTML file
      const inputDir = path.join(mhtmlDir, 'App');
      const outputDir = mhtmlDir;
      console.log(`Processing regular folder: input from ${inputDir}, output to ${outputDir}`);
      await processUrlFiles(inputDir, outputDir,false);
    }

    console.log('All done!');
    await runner.showMessageBox(`All completed for ${fullPath}`, "Completed");
     // Wait for 2 seconds before exiting to ensure all operations are completed
     setTimeout(() => {
       process.exit(0);
     }, 2000);
    } catch (error) {
    console.error('Error:', error);
  }
}

main();

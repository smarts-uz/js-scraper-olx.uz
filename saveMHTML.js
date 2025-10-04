import { processUrlFiles } from './parseMHTMLs/parseMHTML.js';
import { argv } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    
    // Set input directory to the 'App' folder next to the MHTML file
    const inputDir = path.join(mhtmlDir, 'App');
    
    // Set output directory to the same folder where the MHTML file is located
    const outputDir = mhtmlDir;
   
    await processUrlFiles(inputDir, outputDir);

    console.log('All done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

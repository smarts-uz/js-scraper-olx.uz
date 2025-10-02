import { processUrlFiles } from './parseMHTML.js';
import { argv } from 'process';

// Example usage
async function main() {
  try {
    // Process .url files from input directory and save MHTML files to output directory
    const inputDir = argv[2];
    if (!inputDir) {
      console.error('Please provide an input directory as a command line argument');
      process.exit(1);
    }
    
    const outputDir = inputDir + '/../';
   
    await processUrlFiles(inputDir, outputDir);

    console.log('All done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

import { processUrlFiles } from './parseMHTMLs/parse.js';

// Example usage
async function main() {
  try {
    // Process .url files from input directory and save MHTML files to output directory
   
    await processUrlFiles("./- Theory/App","./- Theory" );

    console.log('All done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
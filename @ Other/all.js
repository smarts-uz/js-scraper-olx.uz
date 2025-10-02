import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function extractUrlFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const urlMatch = content.match(/URL=(.+)/);
    return urlMatch ? urlMatch[1].trim() : null;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

async function processUrlFile(filePath, saveDir) {
  const url = await extractUrlFromFile(filePath);
  if (!url) {
    console.warn(`⚠️ Could not extract URL from ${filePath}`);
    return false;
  }

  console.log(`\n🔄 Processing: ${path.basename(filePath)}`);
  console.log(`   URL: ${url}`);

  try {
    const { stdout, stderr } = await execAsync(`node one1.js "${url}" "${saveDir}"`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ Successfully processed: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

async function processAllUrls() {
  const mhtmlsDir = "mhtmls";
  const saveDir = "saved_mhtmls";
  
  // Ensure save directory exists
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
    console.log(`📁 Created directory: ${saveDir}`);
  }

  try {
    const files = fs.readdirSync(mhtmlsDir);
    const urlFiles = files.filter(file => file.endsWith('.url'));
    
    console.log(`📊 Found ${urlFiles.length} .url files to process`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < urlFiles.length; i++) {
      const file = urlFiles[i];
      const filePath = path.join(mhtmlsDir, file);
      
      console.log(`\n📄 [${i + 1}/${urlFiles.length}] Processing: ${file}`);
      
      const success = await processUrlFile(filePath, saveDir);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay between requests to avoid overwhelming the server
      if (i < urlFiles.length - 1) {
        console.log("⏳ Waiting 2 seconds before next request...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Processing complete!`);
    console.log(`✅ Successfully processed: ${successCount} files`);
    console.log(`❌ Failed to process: ${failCount} files`);
    
  } catch (error) {
    console.error("❌ Error reading mhtmls directory:", error.message);
  }
}

// Run the script
processAllUrls().catch(console.error);

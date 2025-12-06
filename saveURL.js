import { Puppe } from "./utils/Puppe.js";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { Dialogs } from "./utils/Dialogs.js";
import { Chromes } from "./utils/Chromes.js";
import { Files } from "./utils/Files.js";

// Get command line arguments
const args = process.argv.slice(2);
const mhtmlFilePath = args[0];

// Get parent path for current file
const currentFilePath = process.argv[1];
const currentDir = path.dirname(currentFilePath);

// Append .env to current path
const envpath = path.join(currentDir, ".env");

// === Load environment variables ===
dotenv.config({ path: envpath });



let url = Chromes.getUrlFromMht(mhtmlFilePath);

let saveDir = Files.saveDirByMhtml(mhtmlFilePath);


(async () => {
  try {
    const browser = await Puppe.runChrome(process.env.HeadlessURL === 'true');
  
   //  await Puppe.scrapeSearch(browser, url, saveDir);
    await Puppe.scrapeSearch(browser, url, saveDir, false);

    await browser.close();
    console.info("🎉 Все поиски обработаны!");

   await Dialogs.messageBoxAx(`All URLs downloaded for ${mhtmlFilePath}`, "Completed");
   process.exit(0);
  } catch (err) {
    console.error("❌ Error during scraping:", err);
  }
})();

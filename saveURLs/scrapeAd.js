import fs from "fs";
import path from "path";

/**
 * Scrapes an ad from a URL and saves it as a .url file
 */
export async function scrapeAd(url, saveDir, browser) {
  // Extract title from URL without loading the page
  const urlObj = new URL(url);
  // console.log("URL:", urlObj);
  
  let title = urlObj.pathname;  
  const urlFileContent = `[InternetShortcut]
URL=${url}`;

  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  const filePath = path.join(saveDir, `Olx.Uz ${safeName}.url`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  fs.writeFileSync(filePath, urlFileContent);
  console.log(`💾 Сохранён URL файл: ${filePath}`);
}
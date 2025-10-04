import fs from "fs";
import path from "path";

/**
 * Scrapes an ad from a URL and saves it as a .url file
 */
export async function scrapeAd(url, saveDir, browser) {
  // Extract title from URL without loading the page
  const urlObj = new URL(url);
  let title = urlObj.pathname.split('/').pop() || `olx_ad_${Date.now()}`;
  title = title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const urlFileContent = `[InternetShortcut]
URL=${url}
`;
  // Имя файла = title страницы
  let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
  if (!safeName) safeName = `olx_ad_${Date.now()}`;
  const filePath = path.join(saveDir, `${safeName}.url`);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  fs.writeFileSync(filePath, urlFileContent);
  console.log(`💾 Сохранён URL файл: ${filePath}`);
}
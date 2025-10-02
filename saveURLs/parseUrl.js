import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

async function scrapeAd(url, saveDir, browser) {
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

/**
 * Получает все ссылки на страницы пагинации
 */
async function getPaginationUrls(page) {
  try {
    // Wait for pagination elements to load
    await page.waitForSelector('ul.pagination-list', { timeout: 10000 }).catch(() => {});
    
    // Scroll to pagination area to ensure all elements are loaded
    await page.evaluate(() => {
      const paginationContainer = document.querySelector('ul.pagination-list');
      if (paginationContainer) {
        paginationContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
    
    // Add multiple delays and scroll attempts to ensure dynamic content loads
    await sleep(1000);
    
    // Try to click "next" button multiple times to load all pagination links
    let clicked = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (clicked && attempts < maxAttempts) {
      clicked = await page.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('ul.pagination-list li a'))
          .find(el => el.textContent.trim().toLowerCase() === 'next' || el.textContent.trim() === '»');
        
        if (nextButton && !nextButton.parentElement.classList.contains('active')) {
          nextButton.click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        await sleep(1500); // Wait for page to load
        attempts++;
      }
    }
    
    // Scroll back to top to ensure we can see all pagination
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await sleep(1000);
    
    // Get maximum page number from data-testid attributes
    const maxPageNumber = await page.evaluate(() => {
      let maxPage = 0;
      const pageElements = document.querySelectorAll('[data-testid^="pagination-link-"]');
      
      pageElements.forEach(el => {
        const testId = el.getAttribute('data-testid');
        if (testId) {
          const pageNumber = parseInt(testId.replace('pagination-link-', ''));
          if (!isNaN(pageNumber) && pageNumber > maxPage) {
            maxPage = pageNumber;
          }
        }
      });
      
      return maxPage;
    });
    
    // Generate pagination URLs based on page numbers
    const paginationUrls = [];
    if (maxPageNumber > 0) {
      const currentUrl = page.url();
      const urlObj = new URL(currentUrl);
      const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
      
      // Generate URLs for all pages from 2 to maxPageNumber
      for (let i = 2; i <= maxPageNumber; i++) {
        urlObj.searchParams.set('page', i.toString());
        paginationUrls.push(urlObj.toString());
      }
    }
    
    // Also try multiple approaches to get pagination URLs as fallback
    const fallbackUrls = await page.evaluate(() => {
      // Get all pagination links, not just from ul.pagination-list
      const elements = Array.from(document.querySelectorAll('ul.pagination-list a, .pager a'));
      return elements
        .map(el => {
          // Try href attribute first, then href property
          return el.getAttribute('href') || el.href;
        })
        .filter(url => url && !url.includes('javascript:') && !url.includes('#') && url.trim() !== '')
        .map(url => {
          // Make sure URLs are absolute
          if (url.startsWith('/')) {
            const baseUrl = window.location.origin;
            return baseUrl + url;
          }
          return url;
        });
    });
    
    // Also check for data-page attributes or other pagination patterns
    const additionalUrls = await page.evaluate(() => {
      const urls = [];
      const baseUrl = window.location.origin;
      
      // Look for data-page attributes
      const pageElements = document.querySelectorAll('[data-page]');
      pageElements.forEach(el => {
        const page = el.getAttribute('data-page');
        if (page && !isNaN(page)) {
          // Try to construct URL - this is heuristic-based
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('page', page);
          urls.push(currentUrl.toString());
        }
      });
      
      return urls;
    });
    
    // Combine all found URLs
    const allUrls = [...paginationUrls, ...fallbackUrls, ...additionalUrls];
    
    // Remove duplicates and current page
    const uniqueUrls = [...new Set(allUrls)].filter(url => {
      try {
        const currentUrl = new URL(window.location.href);
        const checkUrl = new URL(url);
        // Filter out current page
        return checkUrl.searchParams.get('page') !== currentUrl.searchParams.get('page') || 
               (checkUrl.searchParams.get('page') === null && currentUrl.searchParams.get('page') === null && url !== window.location.href);
      } catch {
        return true;
      }
    });
    
    return uniqueUrls;
  } catch (error) {
    console.warn("⚠️ Ошибка при получении пагинации:", error.message);
    return [];
  }
}

/**
 * Сохраняет все объявления со страницы поиска, включая пагинацию
 */
export async function scrapeSearch(searchUrl, saveDir, browser = null) {
  let localBrowser = browser;
  let adsCount = 0;

  if (!localBrowser) {
    localBrowser = await puppeteer.launch({
      headless: true,
      slowMo: 100,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  // Получаем все страницы пагинации
  const mainPage = await localBrowser.newPage();
  await mainPage.setViewport({ width: 1280, height: 900 });
  console.log(`📖 Загружаю главную страницу для получения пагинации: ${searchUrl}`);
  await mainPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  
  // Прокручиваем вниз для загрузки пагинации
  await autoScroll(mainPage);
  await sleep(2000); // Ждём загрузку элементов
  
  const paginationUrls = await getPaginationUrls(mainPage);
  await mainPage.close();
  
  console.log(`📑 Найдено ${paginationUrls.length} страниц пагинации`);
  
  // Если пагинация не найдена, обрабатываем только первую страницу
  let urlsToProcess = [searchUrl];
  if (paginationUrls.length > 0) {
    // Add original search URL and all pagination URLs
    urlsToProcess = [searchUrl, ...paginationUrls];
    // Remove duplicates
    urlsToProcess = [...new Set(urlsToProcess)];
  }
  
  console.log(`📄 Всего будет обработано ${urlsToProcess.length} страниц`);
  
  // Обрабатываем каждую страницу поиска
  for (const [index, url] of urlsToProcess.entries()) {
    console.log(`📄 Обрабатываю страницу ${index + 1}/${urlsToProcess.length}: ${url}`);
    
    const page = await localBrowser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await autoScroll(page);
    
    let adLinks = await page.$$eval(
      'a[href*="/obyavlenie/"], a[href*="/offer/"]',
      (els) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter(Boolean)
          .map((href) =>
            href.startsWith("http") ? href : "https://www.olx.uz" + href
          )
    );
    
    // Убираем дубликаты
    adLinks = [...new Set(adLinks)];
    console.log(`📌 Найдено ${adLinks.length} объявлений на этой странице.`);
    
    await page.close();
    
    // Обрабатываем каждое объявление
    for (const adUrl of adLinks) {
      adsCount++;
      await scrapeAd(adUrl, saveDir, localBrowser);
    }
    
    // Делаем паузу между страницами
    if (index < urlsToProcess.length - 1) {
      console.log("⏳ Пауза перед следующей страницей...");
      await sleep(3000);
    }
  }

  if (!browser) {
    await localBrowser.close();
  }

  console.log(`🎉 Сохранено ${adsCount} объявлений с поиска.`);
}

/**
 * Принимает массив поисков и сохраняет все объявления
 */
export async function scrapeMultipleSearches(tasks) {
 const browser = await puppeteer.launch({
    headless: true,
    slowMo: 100,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const { url, saveDir } of tasks) {
    await scrapeSearch(url, saveDir, browser);
  }

  await browser.close();
  console.log("🎉 Все поиски обработаны!");
}

// 🚀 CLI для одного поиска
if (process.argv.length >= 4) {
  const url = process.argv[2];
  const saveDir = process.argv[3];

  scrapeSearch(url, saveDir)
    .then(() => {
      console.log("🎉 Готово!");
    })
    .catch((err) => {
      console.error("❌ Ошибка:", err);
    });
}

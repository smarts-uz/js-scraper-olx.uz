
import puppeteer from "puppeteer";
import { Files } from "./Files.js";
import path from "path";
import fs from "fs";
import { Chromes } from "./Chromes.js";

export class Puppe {
  constructor(parameters) {

  }


  static sleep = (ms) => new Promise((res) => setTimeout(res, ms));



  /**
   * Saves all ads from a search page, including pagination
   */
  static async scrapeSearch(browser, searchUrl, saveDir, isUrl = true) {


    const paginationUrls = await Puppe.getPaginationUrls(browser);



    // Если пагинация не найдена, обрабатываем только первую страницу
    let urlsToProcess = [searchUrl];
    if (paginationUrls.length > 0) {
      // Add original search URL and all pagination URLs
      urlsToProcess = [searchUrl, ...paginationUrls];
      // Remove duplicates
      urlsToProcess = [...new Set(urlsToProcess)];
    }

    console.info(`📄 Всего будет обработано ${urlsToProcess.length} страниц`);

    // Обрабатываем каждую страницу поиска
    for (const [index, url] of urlsToProcess.entries()) {
      console.info(`📄 Обрабатываю страницу ${index + 1}/${urlsToProcess.length}: ${url}`);

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await Puppe.autoScroll(page);

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
      console.info(`📌 Найдено ${adLinks.length} объявлений на этой странице.`);

      await page.close();

      // Обрабатываем каждое объявление
      for (const adUrl of adLinks) {
        adsCount++;
        if (isUrl)
          await Puppe.scrapeUrl(browser, adUrl, saveDir);
        else
          await Puppe.scrapeMhtml(browser, adUrl, saveDir, false);

      }

      // Делаем паузу между страницами
      if (index < urlsToProcess.length - 1) {
        console.info("⏳ Пауза перед следующей страницей...");
        await Puppe.sleep(3000);
      }
    }

    if (!browser) {
      await browser.close();
    }

    console.info(`🎉 Сохранено ${adsCount} объявлений с поиска.`);
  }

  /**
   * Accepts an array of searches and saves all ads
   */
  static async runChrome(headless) {

    console.info(headless, 'headless');

    const browser = await puppeteer.launch({
      headless: headless,
      slowMo: 100,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    console.info("Browser instance created:", browser);
    console.info("Running Chrome with headless:", headless);

    return browser;

  }



  /**
   * Auto scroll static
   */

  static async autoScroll(page, distance = 400, setIntervalTime = 10) {
    await page.evaluate(
      async ({ distance, setIntervalTime }) => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, setIntervalTime);
        });
      },
      { distance, setIntervalTime } // <-- paramlar browserga uzatilyapti
    );
  }



  static async extractUserIdWithRegex(page, selector = 'a[data-testid="user-profile-link"]') {

    return page.$eval(selector, a => {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/list\/user\/([^\/]+)\/?/);
      return m ? decodeURIComponent(m[1]) : null;
    }).catch(() => null);

  }


  static async scrapeMhtml(browser, url, saveDir, isPhone = false) {

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.info(`➡️ Loading ad: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const userId = await Puppe.extractUserIdWithRegex(page);
    console.log(`User ID: ${userId}`);


    if (isPhone) {

      await Puppe.scrollAds(page);

      // ✅ Handle phone number display
      try {
        const phoneButtons = await page.$$('button[data-testid="show-phone"]');
        for (const btn of phoneButtons) {
          const visible = await btn.isVisible?.() || await btn.evaluate(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          if (visible) {
            console.info('📞 Found visible phone button, clicking...');
            await btn.click();
            await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
            console.info('✅ Phone number displayed!');
            phoneShown = true;
            break;
          }
        }
      } catch (err) {
        console.warn(`⚠️ Phone handling error: ${err.message}`);
      }

    }


    // Safe file naming
    let title = await page.title();
    let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
    if (!safeName) safeName = `ad_${Date.now()}`;

    const filePath = path.join(saveDir, `${safeName}.mhtml`);

    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

    let savedPath = null;


    try {
      console.info("🧩 Capturing MHTML snapshot...");
      const cdp = await page.createCDPSession();
      await cdp.send("Page.enable");

      // Wait a bit to let dynamic content settle
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
        fs.writeFileSync(filePath, data);
        console.info(`💾 Saved (MHTML): ${filePath}`);
        savedPath = filePath;
      } catch (mhtmlErr) {
        // More specific error handling for MHTML capture
        if (
          mhtmlErr.message &&
          mhtmlErr.message.includes("Protocol error (Page.captureSnapshot): Failed  to generate MHTML")
        ) {
          console.error(
            `❌ Failed to capture MHTML for ${url}: The page may contain resources or frames that prevent MHTML generation.`
          );
        } else {
          console.error(`⚠️ Failed to capture MHTML for ${url}: ${mhtmlErr.message}`);
        }
      }
    } catch (err) {
      console.error(`⚠️ Unexpected error during MHTML capture for ${url}: ${err.message}`);
    }

    await page.close();
    return savedPath
  }





  static async scrapeUrl(browser, url, saveDir) {
    // Check if URL already exists in any relevant directory
    if (Files.urlExistsInDirectories(url, saveDir)) {
      console.info(`⏭️  URL already exists, skipping: ${url}`);
      return;
    }

    // Extract title from URL without loading the page
    const urlObj = new URL(url);

    let title = urlObj.pathname;
    const urlFileContent = `[InternetShortcut]
URL=${url}`;

    let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
    const filePath = path.join(saveDir, `Olx.Uz ${safeName}.url`);

    // Check if file already exists in the current directory
    if (fs.existsSync(filePath)) {
      return;
    }

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    fs.writeFileSync(filePath, urlFileContent);
    console.info(`💾 Saved URL file: ${filePath}`);
  }

  static async scrollAds(page) {

    const Wait_Min = process.env.Wait_Min || 5;
    const Wait_Max = process.env.Wait_Max || 30;
    const Scroll_Count_Min = process.env.Scroll_Count_Min || 2;
    const Scroll_Count_Max = process.env.Scroll_Count_Max || 5;

    // Random waiting and scrolling to simulate human behavior
    const waitTime = Chromes.getRandomInt(parseInt(Wait_Min), parseInt(Wait_Max));
    const scrollCount = Chromes.getRandomInt(parseInt(Scroll_Count_Min), parseInt(Scroll_Count_Max));

    console.info(`⏳ Waiting for ${waitTime}s with ${scrollCount} random scrolls...`);

    const timePerScroll = waitTime / (scrollCount + 1);
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxScroll = pageHeight - viewportHeight;

    // Initial wait before first scroll
    await new Promise(resolve => setTimeout(resolve, timePerScroll * 1000));

    for (let i = 0; i < scrollCount; i++) {
      const scrollPosition = Chromes.getRandomInt(0, maxScroll);
      console.info(`🖱️ Scroll ${i + 1}/${scrollCount}: Scrolling to ${scrollPosition}px...`);
      await page.evaluate(pos => window.scrollTo(0, pos), scrollPosition);
      const scrollDelay = Chromes.getRandomFloat(0.5, 2.5);
      await new Promise(resolve => setTimeout(resolve, scrollDelay * 1000));
    }

    const finalScrollPosition = Chromes.getRandomInt(0, maxScroll);
    console.info(`🖱️ Final scroll to ${finalScrollPosition}px before checking phone...`);
    await page.evaluate(pos => window.scrollTo(0, pos), finalScrollPosition);


  }

  static async getPaginationUrls(searchUrl) {

    const browser = await Puppe.runChrome(process.env.Headless === 'true');

    // Получаем все страницы пагинации
    const mainPage = await browser.newPage();

    await mainPage.setViewport({ width: 1280, height: 900 });
    console.info(`📖 Загружаю главную страницу для получения пагинации: ${searchUrl}`);
    await mainPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Прокручиваем вниз для загрузки пагинации
    await Puppe.autoScroll(mainPage, 1000, 5);

    // Wait for pagination elements to load
    await mainPage.waitForSelector('ul.pagination-list', { timeout: 10000 }).catch(() => { });

    // Scroll to pagination area to ensure all elements are loaded
    await mainPage.evaluate(() => {
      const paginationContainer = document.querySelector('ul.pagination-list');
      if (paginationContainer) {
        paginationContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });


    // Try to click "next" button multiple times to load all pagination links
    let clicked = true;
    let attempts = 0;
    const maxAttempts = 200;

    while (clicked && attempts < maxAttempts) {
      clicked = await mainPage.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('ul.pagination-list li a'))
          .find(el => el.textContent.trim().toLowerCase() === 'next' || el.textContent.trim() === '»');

        if (nextButton && !nextButton.parentElement.classList.contains('active')) {
          nextButton.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        //   await Puppe.sleep(1500); // Wait for page to load
        attempts++;
      }
    }

    // Scroll back to top to ensure we can see all pagination
    await mainPage.evaluate(() => {
      window.scrollTo(0, 0);
    });
    //   await Puppe.sleep(1000);

    // Get maximum page number from data-testid attributes
    const maxPageNumber = await mainPage.evaluate(() => {
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
    // add serachurl to paginationUrls
    paginationUrls.push(searchUrl);

    if (maxPageNumber > 0) {
      const currentUrl = mainPage.url();
      const urlObj = new URL(currentUrl);

      // Generate URLs for all pages from 2 to maxPageNumber
      for (let i = 2; i <= maxPageNumber; i++) {
        urlObj.searchParams.set('page', i.toString());
        paginationUrls.push(urlObj.toString());
      }
    }

    // Also try multiple approaches to get pagination URLs as fallback
    const fallbackUrls = await mainPage.evaluate(() => {
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
    const additionalUrls = await mainPage.evaluate(() => {
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

    console.info("paginationUrls:", paginationUrls);
    console.info(`📑 Найдено ${paginationUrls.length} страниц пагинации`);

    await mainPage.close();
    await browser.close();
    return uniqueUrls;

  }

}



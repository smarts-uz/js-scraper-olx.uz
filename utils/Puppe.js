
import puppeteer from "puppeteer";
import { Files } from "./Files.js";
import path from "path";
import fs from "fs";
import { Chromes } from "./Chromes.js";
import { Dialogs } from "./Dialogs.js";

export class Puppe {
  constructor(parameters) {

  }


  static sleep = (ms) => new Promise((res) => setTimeout(res, ms));



  /**
   * Saves all ads from a search page, including pagination
   */
  static async scrapeSearch(page) {

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
    console.info(`adLinks`, adLinks);

    return adLinks

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

  static async autoScroll(page, distance = 300, setIntervalTime = 10) {
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



  static async extractUserIdWithRegex(page) {

    const selector = 'a[data-testid="user-profile-link"]'

    return page.$eval(selector, a => {
      const href = a.getAttribute('href') || '';
      console.info('href', href);

      let match = href.match(/\/list\/user\/([^\/]+)\/?/);
      match = match ? decodeURIComponent(match[1]) : null;
      console.info('match User', match);

      if (!match) {
        match = new URL(href).host;   // → "bitovayatexnikalg.olx.uz"
        console.info("match Host:", match);
      }

      return match;

    }).catch(() => null);

  }


  static async showPhone(page) {
    // await Puppe.scrollAds(page);

    // ✅ Handle phone number display\
    let phone;
    try {
      const phoneButtons = await page.$$('button[data-testid="show-phone"]');
      for (const btn of phoneButtons) {
        const visible = await btn.isVisible?.() || await btn.evaluate(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        if (visible) {
          console.info('📞 Found visible phone button, clicking...');
          await btn.click();
          await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
          phone = await page.$eval(
            'a[data-testid="contact-phone"]',
            el => el.getAttribute("href").replace("tel:", "")
          );
          console.info('✅ Phone number displayed!', phone);
          break;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Phone handling error: ${err.message}`);
    }

    return phone;

  }


  static async saveAsMhtml(page, filePath) {
    try {
      console.info("🧩 Capturing MHTML snapshot...");
      const cdp = await page.createCDPSession();
      await cdp.send("Page.enable");

      // Wait a bit to let dynamic content settle
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
        fs.writeFileSync(filePath, data);
        console.info(`💾 Saved (MHTML): ${filePath}`);
      } catch (mhtmlErr) {
        // More specific error handling for MHTML capture
        if (
          mhtmlErr.message &&
          mhtmlErr.message.includes("Protocol error (Page.captureSnapshot): Failed  to generate MHTML")
        ) {
          console.error(
            `❌ Failed to capture MHTML for ${page.url()}: The page may contain resources or frames that prevent MHTML generation.`
          );
        } else {
          console.error(`â ï¸ Failed to capture MHTML for ${page.url()}: ${mhtmlErr.message}`);
        }
      }
    } catch (err) {
      console.error(`⚠️ Unexpected error during MHTML capture for ${page.url()}: ${err.message}`);
    }
  }


  static async scrapeOlxMhtml(url, browser = null) {

    if (!browser)
      browser = await Puppe.runChrome(process.env.Headless === 'true');

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.info(`➡️ Loading Olx Post: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await Puppe.autoScroll(page, 1000, 5);
    console.info(`domcontentloaded`);

    const userId = await Puppe.extractUserIdWithRegex(page);
    console.log(`User ID: ${userId}`);

    if (!userId) {
      Dialogs.warningBox(
        `⚠️ Failed to extract user ID from ${url}. Please check the URL and try again.`
      );
      return;
    }

    const safeName = await Puppe.pageTitle(page);
    console.info(`Safe Name: ${safeName}`);

    const userIdPath = path.join(globalThis.saveDir, userId);
    console.info(`User ID Path: ${userIdPath}`);

    if (!fs.existsSync(userIdPath)) {
      const phone = await Puppe.showPhone(page);

      console.info(`Phone: ${phone}`);
      Files.saveInfoToFile(userIdPath, phone);
      Files.mkdirIfNotExists(userIdPath);

    }


    const filePathMhtml = path.join(userIdPath, `${safeName}.mhtml`);
    await Puppe.saveAsMhtml(page, filePathMhtml);

    await page.close();
  }


  static async saveAllPages(mhtmlFile, browser = null) {

    if (!browser)
      browser = await Puppe.runChrome(process.env.Headless === 'true');


    Chromes.initFolders(mhtmlFile);

    console.info(globalThis.mhtmlPageDirAllJson, 'mhtmlPageDirAllJson globalThis');

    // read this json. globalThis.mhtmlPageDirAllJson iterate through all pages and save them as mhtml files

    if (fs.existsSync(globalThis.mhtmlPageDirAllJson)) {

      const mhtmlPageDirAllJson = JSON.parse(fs.readFileSync(globalThis.mhtmlPageDirAllJson, 'utf8'));

      for (const pageUrl of mhtmlPageDirAllJson) {
        console.info(`➡️ Loading Olx Post: ${pageUrl}`);
        await Puppe.scrapeCatalogMhtml(pageUrl, browser);
      }
    }

  }


  static async scrapeCatalogMhtml(url, browser = null) {

    if (!browser)
      browser = await Puppe.runChrome(process.env.Headless === 'true');

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.info(`➡️ Loading Catalog: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await Puppe.autoScroll(page, 300, 10);
    console.info(`domcontentloaded`);

    const safeName = await Puppe.pageTitle(page);

    let adLinks = await Puppe.scrapeSearch(page)
    console.info(`adLinks`, adLinks)

    const filePathJson = path.join(globalThis.mhtmlDataDir, `${safeName}.json`);
    Files.writeJson(filePathJson, adLinks)

    const filePathMhtml = path.join(globalThis.mhtmlPageDir, `${safeName}.mhtml`);
    await Puppe.saveAsMhtml(page, filePathMhtml);

    await page.close();
  }



  static async pageTitle(page) {
    // Safe file naming
    let title = await page.title();
    let safeName = title.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 100);
    if (!safeName) safeName = `ad_${Date.now()}`;
    console.info(`💾 safeName: ${safeName}`);
    return safeName;
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

  static async getPaginationUrls(searchUrl, browser = null) {

    if (!browser)
      browser = await Puppe.runChrome(process.env.Headless === 'true');

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

    console.info(`📑 Найдено ${paginationUrls.length} страниц пагинации`);

    await mainPage.close();
    await browser.close();

    // save paginationUrls to file as json to 

    Files.writeJson(globalThis.mhtmlPageDirAllJson, uniqueUrls)

    return uniqueUrls;

  }

}



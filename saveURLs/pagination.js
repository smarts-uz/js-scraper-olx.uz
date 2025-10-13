import { sleep } from './utils.js';
import { Utils } from '../ALL/Utils.js';

const logger = new Utils().log;


export async function getPaginationUrls(page) {
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
    logger.warn("⚠️ Ошибка при получении пагинации:", error.message);
    return [];
  }
}
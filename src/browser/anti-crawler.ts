/**
 * Resonix Browser Anti-Crawler Simulation
 *
 * Simulates real user behavior to avoid detection by anti-bot systems
 * Includes random mouse movements, scroll patterns, and human-like interactions
 */

import type { Page } from "playwright-core";

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulate human-like mouse movement
 */
export async function simulateMouseMovement(page: Page): Promise<void> {
  // Get viewport size
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  // Generate random mouse path
  const steps = randomInt(5, 15);
  for (let i = 0; i < steps; i++) {
    const x = randomInt(0, viewport.width);
    const y = randomInt(0, viewport.height);

    await page.mouse.move(x, y, {
      steps: randomInt(5, 15),
    });
    await randomDelay(50, 150);

    // Randomly pause during movement
    if (Math.random() > 0.7) {
      await randomDelay(100, 300);
    }
  }
}

/**
 * Simulate human-like page scrolling
 */
export async function simulatePageScroll(page: Page): Promise<void> {
  const scrollSteps = randomInt(3, 8);

  for (let i = 0; i < scrollSteps; i++) {
    // Random scroll amount
    const scrollAmount = randomInt(100, 500);

    await page.mouse.wheel(0, scrollAmount);
    await randomDelay(200, 500);
  }

  // Randomly scroll back up a bit
  if (Math.random() > 0.5) {
    const scrollBack = randomInt(50, 200);
    await page.mouse.wheel(0, -scrollBack);
    await randomDelay(200, 300);
  }
}

/**
 * Simulate human-like typing with random delays
 */
export async function simulateHumanTyping(
  page: Page,
  selector: string,
  text: string,
): Promise<void> {
  await page.click(selector);

  for (const char of text) {
    await page.keyboard.type(char, {
      delay: randomInt(30, 100),
    });

    // Randomly pause during typing
    if (Math.random() > 0.8) {
      await randomDelay(200, 500);
    }
  }
}

/**
 * Simulate random clicks on the page
 */
export async function simulateRandomClicks(page: Page): Promise<void> {
  // Get viewport size
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const clickCount = randomInt(1, 3);
  for (let i = 0; i < clickCount; i++) {
    const x = randomInt(50, viewport.width - 50);
    const y = randomInt(50, viewport.height - 50);

    await page.mouse.move(x, y, {
      steps: randomInt(3, 8),
    });
    await randomDelay(100, 200);
    await page.mouse.click(x, y, {
      delay: randomInt(50, 150),
    });
    await randomDelay(300, 600);
  }
}

/**
 * Simulate human-like browsing behavior
 */
export async function simulateHumanBrowsing(page: Page): Promise<void> {
  // 1. Random mouse movements
  if (Math.random() > 0.3) {
    await simulateMouseMovement(page);
  }

  // 2. Random scrolling
  if (Math.random() > 0.2) {
    await simulatePageScroll(page);
  }

  // 3. Random clicks
  if (Math.random() > 0.5) {
    await simulateRandomClicks(page);
  }

  // 4. Random pause
  await randomDelay(500, 2000);
}

/**
 * Generate random user agent string
 */
export function generateRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.47",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.47",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Generate random headers to simulate different browsers
 */
export function generateRandomHeaders(): Record<string, string> {
  const userAgent = generateRandomUserAgent();

  return {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  };
}

/**
 * Apply anti-crawler settings to page
 */
export async function applyAntiCrawlerSettings(page: Page): Promise<void> {
  // Set random user agent
  await page.setExtraHTTPHeaders({
    "User-Agent": generateRandomUserAgent(),
  });

  // Set viewport to common desktop size
  await page.setViewportSize({
    width: randomInt(1366, 1920),
    height: randomInt(768, 1080),
  });

  // Disable webdriver detection
  await page.evaluate(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Override Chrome-specific properties
    if (navigator.userAgent.includes("Chrome")) {
      Object.defineProperty(window, "chrome", {
        get: () => ({
          app: {
            isInstalled: false,
          },
          webstore: {
            onInstallStageChanged: {},
            onDownloadProgress: {},
          },
          runtime: {
            PlatformOs: {},
          },
        }),
      });
    }

    // Override plugins length
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3],
    });

    // Override mimeTypes length
    Object.defineProperty(navigator, "mimeTypes", {
      get: () => [1, 2, 3],
    });
  });
}

/**
 * Playwright test: Connections Arabic font scaling + overflow check.
 * Iterates all font-size settings × viewport widths and verifies:
 *   1. Arabic tiles render with a minimum readable font size.
 *   2. No horizontal overflow at any combination.
 *
 * Run: npx playwright test tests/connections-arabic.spec.mjs
 *       (from /root/.openclaw/workspace/quraniq-source)
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:8765/';
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'screenshots', 'connections-arabic');

const FONT_SIZE_SETTINGS = ['0', '1', '2'];
const VIEWPORTS = [
  { width: 390, height: 844, label: 'mobile-390' },
  { width: 768, height: 1024, label: 'tablet-768' },
  { width: 1280, height: 800, label: 'desktop-1280' },
];

/** Minimum font-size in px for .conn-tile-ar at each viewport */
const MIN_ARABIC_FONT_PX = {
  'mobile-390': 16,
  'tablet-768': 18,
  'desktop-1280': 20,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

for (const fontSize of FONT_SIZE_SETTINGS) {
  for (const vp of VIEWPORTS) {
    const label = `font-size=${fontSize} × ${vp.label}`;

    test(`[${label}] Arabic tile has readable font size and no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Set global font-size preference
      await page.evaluate((fs) => {
        document.documentElement.setAttribute('data-font-size', fs);
      }, fontSize);

      // Wait for Connections grid to appear
      await page.waitForSelector('.connections-grid', { timeout: 10000 });

      // Reveal at least one theme by clicking tiles (guess 4 to form a group)
      // Try clicking 4 revealed (non-hidden) tiles
      const tiles = page.locator('.connections-grid .conn-tile:not(.conn-tile-hidden)');
      const count = await tiles.count();

      if (count >= 4) {
        for (let i = 0; i < 4; i++) {
          await tiles.nth(i).click();
        }
        // Wait for theme reveal (modal or row)
        await page.waitForTimeout(1500);
      }

      // Check .conn-tile-ar font size
      const arabicTiles = page.locator('.conn-tile-ar');
      const tileCount = await arabicTiles.count();

      let allGood = true;
      let smallestFont = Infinity;
      for (let i = 0; i < tileCount; i++) {
        const fontSize = await arabicTiles.nth(i).evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });
        if (fontSize < smallestFont) smallestFont = fontSize;
        const minExpected = MIN_ARABIC_FONT_PX[vp.label];
        if (fontSize < minExpected) {
          allGood = false;
          console.error(`[${label}] Tile ${i} font-size ${fontSize}px < min ${minExpected}px`);
        }
      }

      if (tileCount > 0) {
        expect(allGood, `Smallest Arabic tile font-size: ${smallestFont}px`).toBe(true);
      }

      // Check: no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      const noOverflow = scrollWidth <= innerWidth;

      if (!noOverflow) {
        const screenshotPath = path.join(SCREENSHOT_DIR, `overflow-${label.replace(/[\s=×]/g, '-')}.png`);
        ensureDir(SCREENSHOT_DIR);
        await page.screenshot({ path: screenshotPath });
        console.error(`[${label}] OVERFLOW: scrollWidth=${scrollWidth} > innerWidth=${innerWidth}. Screenshot: ${screenshotPath}`);
      }

      expect(noOverflow, `scrollWidth=${scrollWidth} must not exceed innerWidth=${innerWidth}`).toBe(true);

      // Take a screenshot for visual record
      const safeName = label.replace(/[\s=×]/g, '-');
      const ssPath = path.join(SCREENSHOT_DIR, `${safeName}.png`);
      ensureDir(SCREENSHOT_DIR);
      await page.screenshot({ path: ssPath, fullPage: false });
      console.log(`[${label}] Screenshot: ${ssPath} | smallest tile font: ${smallestFont}px | overflow: ${!noOverflow}`);
    });
  }
}

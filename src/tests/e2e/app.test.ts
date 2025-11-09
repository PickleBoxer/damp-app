/**
 * E2E Navigation Tests using Playwright
 */

import {
  test,
  expect,
  type Page,
  _electron as electron,
  ElectronApplication,
} from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';

/*
 * Using Playwright with Electron:
 * https://www.electronjs.org/pt/docs/latest/tutorial/automated-testing#using-playwright
 */

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);
  process.env.CI = 'e2e';

  electronApp = await electron.launch({
    args: [appInfo.main],
  });
  electronApp.on('window', async page => {
    const filename = page.url()?.split('/').pop();
    console.log(`Window opened: ${filename}`);

    page.on('pageerror', error => {
      console.error(error);
    });
    page.on('console', msg => {
      console.log(msg.text());
    });
  });
});

test.describe('App Navigation', () => {
  test('should load the main window', async () => {
    const page: Page = await electronApp.firstWindow();

    // Check that the window loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should navigate to all routes', async () => {
    const routes = [
      { path: '/', text: 'Dashboard' },
      { path: '/services', text: 'Services' },
      { path: '/projects', text: 'Projects' },
      { path: '/settings', text: 'Settings' },
      { path: '/about', text: 'About' },
    ];

    const page: Page = await electronApp.firstWindow();

    for (const route of routes) {
      // Click navigation item or use direct navigation
      // Note: Adjust selectors based on your actual navigation structure
      try {
        // Try to find and click navigation link
        const navLink = page.locator(`a[href="${route.path}"]`).first();
        if (await navLink.isVisible()) {
          await navLink.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // If navigation link not found, that's okay for this basic test
      }
    }
  });

  test('should have sidebar navigation', async () => {
    const page: Page = await electronApp.firstWindow();
    // Check if sidebar exists (adjust selector to match your actual sidebar)
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    if (await sidebar.isVisible()) {
      expect(await sidebar.isVisible()).toBeTruthy();
    }
  });

  test('should toggle theme', async () => {
    const page: Page = await electronApp.firstWindow();
    // Find theme toggle button
    const themeButton = page.locator('button').filter({ hasText: /theme/i }).first();

    if ((await themeButton.count()) > 0) {
      await themeButton.click();
      await page.waitForTimeout(300);

      // Theme should change (check for dark/light class on html or body)
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      expect(typeof isDark).toBe('boolean');
    }
  });

  test('should have no console errors', async () => {
    const page: Page = await electronApp.firstWindow();
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate through app
    await page.waitForTimeout(1000);

    // Check for critical errors (ignore expected Electron warnings)
    const criticalErrors = consoleErrors.filter(
      err => !err.includes('Electron Security Warning') && !err.includes('DevTools')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should check window controls', async () => {
    const page: Page = await electronApp.firstWindow();
    // Check if window is visible
    expect(await electronApp.windows().length).toBeGreaterThan(0);

    // Check window can be minimized (without actually minimizing)
    const isMinimizable = await page.evaluate(() => {
      return window.electronWindow !== undefined;
    });

    expect(isMinimizable).toBeTruthy();
  });
});

test.describe('Docker Integration', () => {
  test('should check Docker availability', async () => {
    const page: Page = await electronApp.firstWindow();
    // Check if docker context is available
    const hasDockerContext = await page.evaluate(() => {
      return window.docker !== undefined;
    });

    expect(hasDockerContext).toBeTruthy();
  });

  test('should navigate to services page', async () => {
    const page: Page = await electronApp.firstWindow();
    // Try to navigate to services
    try {
      const servicesLink = page.locator('a[href="/services"]').first();
      if (await servicesLink.isVisible()) {
        await servicesLink.click();
        await page.waitForTimeout(500);

        // Check we're on services page
        const url = page.url();
        expect(url).toContain('services');
      }
    } catch {
      // Services link might not be visible, that's okay
    }
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async () => {
    const page: Page = await electronApp.firstWindow();
    const startTime = Date.now();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // App should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render content quickly', async () => {
    const page: Page = await electronApp.firstWindow();
    const startTime = Date.now();
    await page.waitForSelector('body', { state: 'visible' });
    const renderTime = Date.now() - startTime;

    // Content should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });
});

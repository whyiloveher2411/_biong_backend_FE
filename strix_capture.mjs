import pkg from '/private/tmp/strix-playwright/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs/promises';
import path from 'path';

const outDir = path.resolve('strix_assets');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

page.setDefaultTimeout(60000);
await page.goto('https://github.com/usestrix/strix', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);
await page.screenshot({ path: path.join(outDir, '01-github-fullpage.png'), fullPage: true });

const sections = [
  ['02-readme-top.png', 'main h1'],
  ['03-quickstart.png', 'text=Installation & First Scan'],
  ['04-features.png', 'text=Agentic Pentesting Tools'],
  ['05-usage-examples.png', 'text=Usage Examples'],
];

for (const [file, selector] of sections) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, file), fullPage: false });
}

await page.goto('https://github.com/usestrix/strix', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);
await page.mouse.move(1140, 320, { steps: 10 });
await page.waitForTimeout(700);
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, 220);
  await page.waitForTimeout(420);
}
await page.waitForTimeout(900);
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, -160);
  await page.waitForTimeout(380);
}

await context.close();
await browser.close();

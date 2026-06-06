import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function typeIntoReactInput(page, selector, text) {
  await page.waitForSelector(selector);
  await page.click(selector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      el.setSelectionRange(0, el.value.length);
    }
  }, selector);
  await page.keyboard.press('Backspace');
  await page.type(selector, text);
}

async function run() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\nidhi\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  ];

  let chromePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      chromePath = p;
      break;
    }
  }

  if (!chromePath) {
    console.error('Chrome executable not found on standard paths!');
    process.exit(1);
  }

  console.log('Using Chrome executable at:', chromePath);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('BROWSER REQUEST FAILED:', req.url(), req.failure().errorText));

  const artifactDir = 'C:\\Users\\nidhi\\.gemini\\antigravity\\brain\\e0026542-4ee5-497b-8871-678bdbaf9d05';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  try {
    // 1. Login
    console.log('Navigating to Login page...');
    await page.goto('http://localhost:5173/#/login', { waitUntil: 'networkidle2' });
    await page.type('input[placeholder="Enter username"]', 'admin');
    await page.type('input[placeholder="Enter password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    // 2. Go to Billing page
    console.log('Navigating to Billing page...');
    await page.goto('http://localhost:5173/#/billing', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Fill customer details
    console.log('Entering customer details...');
    await typeIntoReactInput(page, 'input[placeholder="Search name/phone or enter new..."]', 'Ganga Simple Test');
    await typeIntoReactInput(page, 'input[placeholder="10-digit phone"]', '9955550233');

    // Click optional details and add village
    console.log('Toggling location details...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes('+ Add Location details'));
      if (target) {
        target.click();
      } else {
        throw new Error('Toggle location details button not found');
      }
    });
    await new Promise(r => setTimeout(r, 500));
    await typeIntoReactInput(page, 'input[placeholder="Village Name"]', 'Bidupur');

    // Search and select medicine
    console.log('Searching for Calpol...');
    await typeIntoReactInput(page, 'input[placeholder="Search inventory for drug name, brand..."]', 'Calpol');
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot of search results
    await page.screenshot({ path: path.join(artifactDir, 'debug_calpol_search_simplified.png') });

    // Click the first result in the dropdown
    console.log('Selecting medicine from dropdown...');
    await page.click('div.medicine-dropdown div.cursor-pointer');
    await new Promise(r => setTimeout(r, 1000));

    // Click checkout
    console.log('Submitting POS checkout...');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot of checkout invoice success
    await page.screenshot({ path: path.join(artifactDir, 'invoice_success.png') });
    console.log('Invoice success screenshot saved.');

    // 3. Go to Customers page to verify auto-registration
    console.log('Navigating to Customers page to check auto-registration...');
    await page.goto('http://localhost:5173/#/customers', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Search for the new customer
    console.log('Searching for the registered customer...');
    await page.type('input[placeholder="Search name, phone, village..."]', 'Ganga Simple Test');
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot Customers page
    await page.screenshot({ path: path.join(artifactDir, 'customers_auto_registered.png') });
    console.log('Customers auto-registered list screenshot saved.');

  } catch (err) {
    console.error('Error occurred during check:', err);
  } finally {
    await browser.close();
  }
}

run();

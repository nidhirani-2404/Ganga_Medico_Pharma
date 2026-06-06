import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function typeIntoReactInput(page, selector, text) {
  console.log(`[typeIntoReactInput] Setting value of ${selector} to "${text}"`);
  await page.waitForSelector(selector);
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      // Clean value using React tracker bypass
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, selector, text);
  
  const currentVal = await page.evaluate(sel => document.querySelector(sel).value, selector);
  console.log(`[typeIntoReactInput] Verified value is: "${currentVal}"`);
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
    // 1. Login as Billing Agent
    console.log('Navigating to Login page...');
    await page.goto('http://localhost:5173/#/login', { waitUntil: 'networkidle2' });
    await page.type('input[placeholder="Enter username"]', 'billing');
    await page.type('input[placeholder="Enter password"]', 'billing123');
    await page.click('button[type="submit"]');
    
    // Wait for page transition and mounting to stabilize
    await new Promise(r => setTimeout(r, 2000));

    // 2. Verify current URL is /billing (billing role redirects here)
    const currentUrl = page.url();
    console.log('Successfully logged in. Current URL:', currentUrl);
    if (!currentUrl.includes('/billing')) {
      console.error('ERROR: Billing agent was not redirected to /billing upon login!');
    }

    // 3. Take screenshot of the simplified billing POS page
    await page.screenshot({ path: path.join(artifactDir, 'billing_simplified_pos.png') });
    console.log('Simplified billing POS screenshot saved.');

    // 4. Navigate to catalog and back to billing to force a clean hash transition
    console.log('Navigating cleanly to billing POS via route transition...');
    await page.goto('http://localhost:5173/#/catalog', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));
    await page.goto('http://localhost:5173/#/billing', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="Search name/phone or enter new..."]');
    await new Promise(r => setTimeout(r, 1000));

    // 5. Build POS Bill for customer in the simplified UI
    console.log('Filling in simplified Customer Billing Profile...');
    await typeIntoReactInput(page, 'input[placeholder="Search name/phone or enter new..."]', 'Ganga Billing Role Test');
    await typeIntoReactInput(page, 'input[placeholder="10-digit phone"]', '6200952854');

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

    // Search and select medicine (Calpol)
    console.log('Searching Calpol in POS...');
    await typeIntoReactInput(page, 'input[placeholder="Search inventory for drug name, brand..."]', 'Calpol');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(artifactDir, 'debug_calpol_search.png') });

    console.log('Selecting medicine from autocomplete dropdown...');
    await page.evaluate(() => {
      const el = document.querySelector('div.medicine-dropdown div.cursor-pointer') || document.querySelector('.medicine-dropdown div');
      if (el) {
        el.click();
      } else {
        throw new Error('Medicine dropdown item not found in DOM');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Submit checkout
    console.log('Submitting billing checkout...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) {
        console.log('Checkout button found. Disabled state:', btn.disabled);
        btn.click();
      } else {
        throw new Error('Checkout button not found');
      }
    });
    await new Promise(r => setTimeout(r, 3000));

    // Screenshot checkout invoice success
    await page.screenshot({ path: path.join(artifactDir, 'billing_role_invoice_success.png') });
    console.log('Billing checkout completed. Invoice screenshot saved.');

    // 6. Try navigating to /dashboard and verify it redirects back to /billing
    console.log('Testing routing restriction - attempting to access /dashboard...');
    // Close the invoice modal if open so we can proceed
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button.invoice-close-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close') || b.textContent.includes('Cancel'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Change hash client-side to /dashboard
    await page.evaluate(() => {
      window.location.hash = '#/dashboard';
    });
    
    // Wait for client-side redirect back to /billing
    await page.waitForFunction(() => window.location.hash.includes('/billing'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1500));
    
    const redirectUrl = page.url();
    console.log('Current URL after accessing /dashboard:', redirectUrl);
    if (redirectUrl.includes('/dashboard')) {
      console.error('ERROR: Billing agent was able to access /dashboard!');
    } else {
      console.log('Access restricted successfully! Redirected back.');
    }

  } catch (err) {
    console.error('Error occurred during check:', err);
  } finally {
    await browser.close();
  }
}

run();

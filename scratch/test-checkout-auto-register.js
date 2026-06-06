import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

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
    executablePath: chromePath,
    headless: true,
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

    // 2. Go to Customers page to check auto-registration (from the previous test run)
    console.log('Navigating to Customers page to check auto-registration...');
    await page.goto('http://localhost:5173/#/customers', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Search for the new customer
    await page.type('input[placeholder="Search name, phone, village..."]', 'Ganga Customer Test');
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot Customers page
    await page.screenshot({ path: path.join(artifactDir, 'customers_auto_registered.png') });
    console.log('Customers auto-registered screenshot saved.');

  } catch (err) {
    console.error('Error occurred during check:', err);
  } finally {
    await browser.close();
  }
}

run();

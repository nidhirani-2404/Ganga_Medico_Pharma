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

  // Listen to browser console and page errors
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('BROWSER REQUEST FAILED:', req.url(), req.failure().errorText));

  const artifactDir = 'C:\\Users\\nidhi\\.gemini\\antigravity\\brain\\e0026542-4ee5-497b-8871-678bdbaf9d05';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  try {
    // Go to Login page
    console.log('Navigating to Login page...');
    await page.goto('http://localhost:5173/#/login', { waitUntil: 'networkidle2' });

    // Enter login credentials
    console.log('Typing login details...');
    await page.type('input[placeholder="Enter username"]', 'admin');
    await page.type('input[placeholder="Enter password"]', 'admin123');

    // Click Submit
    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for page load
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to customers page
    console.log('Navigating to Customers page...');
    await page.goto('http://localhost:5173/#/customers', { waitUntil: 'networkidle2' });
    
    // Wait for data load
    await new Promise(r => setTimeout(r, 3000));
    
    // Screenshot customers page
    await page.screenshot({ path: path.join(artifactDir, 'customers_debug.png') });
    console.log('Customers debug screenshot saved.');

  } catch (err) {
    console.error('Error occurred during check:', err);
  } finally {
    await browser.close();
  }
}

run();

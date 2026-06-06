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

  const artifactDir = 'C:\\Users\\nidhi\\.gemini\\antigravity\\brain\\e0026542-4ee5-497b-8871-678bdbaf9d05';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  try {
    console.log('Navigating to Catalog page...');
    await page.goto('http://localhost:5173/#/catalog', { waitUntil: 'networkidle2' });
    
    // Screenshot catalog
    await page.screenshot({ path: path.join(artifactDir, 'catalog_view.png') });
    console.log('Catalog screenshot saved.');

    // Click Login
    console.log('Navigating to Login page...');
    await page.goto('http://localhost:5173/#/login', { waitUntil: 'networkidle2' });

    // Enter login credentials
    console.log('Typing login details...');
    await page.type('input[placeholder="Enter username"]', 'admin');
    await page.type('input[placeholder="Enter password"]', 'admin123');

    // Click Submit
    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    // Wait 3 seconds and take a diagnostic screenshot in case of failure
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(artifactDir, 'login_result_diagnostic.png') });
    console.log('Diagnostic login screenshot saved.');

    // Wait for Dashboard to load
    console.log('Waiting for Dashboard page...');
    await page.waitForSelector('main', { timeout: 10000 });
    // wait for transitions/charts
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot Dashboard
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_view.png') });
    console.log('Dashboard screenshot saved.');

  } catch (err) {
    console.error('Error occurred during check:', err);
  } finally {
    await browser.close();
  }
}

run();

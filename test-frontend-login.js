const puppeteer = require('puppeteer');

async function testFrontendLogin() {
  let browser;
  try {
    console.log('🔍 Testing Frontend Login and Sidebar...\n');

    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('1. Opening login page...');
    await page.goto('http://localhost:3011/login');
    await page.waitForSelector('input[name="email"]');

    console.log('2. Filling login form...');
    await page.type('input[name="email"]', 'ghodeabhijeet18@gmail.com');
    await page.type('input[name="password"]', 'ShreeSwamiSamarth@28');

    console.log('3. Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log('4. Current URL:', page.url());
    
    if (page.url().includes('/dashboard')) {
      console.log('✅ Login successful - redirected to dashboard');
      
      // Check if sidebar has menu items
      console.log('5. Checking sidebar navigation...');
      await page.waitForSelector('nav', { timeout: 5000 });
      
      const navItems = await page.$$eval('nav a, nav button', elements => 
        elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      );
      
      console.log('Sidebar navigation items:', navItems);
      
      if (navItems.length > 0) {
        console.log('✅ Sidebar has navigation items');
      } else {
        console.log('❌ Sidebar is empty');
      }
      
      // Navigate to debug page
      console.log('6. Navigating to debug page...');
      await page.goto('http://localhost:3011/debug');
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const debugTitle = await page.$eval('h1', el => el.textContent);
      console.log('Debug page title:', debugTitle);
      
      // Wait a bit to see the debug info
      await page.waitForTimeout(2000);
      
    } else {
      console.log('❌ Login failed - not redirected to dashboard');
    }

    console.log('\n✅ Test completed! Check the browser window for results.');
    console.log('Press Ctrl+C to close the browser and exit.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  testFrontendLogin();
} catch (error) {
  console.log('❌ Puppeteer not available. Please install it with: npm install puppeteer');
  console.log('Alternative: Open http://localhost:3011 manually and test login');
}
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Tab 1: Player 1
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  
  // Tab 2: Player 2
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  console.log("Navigating tabs...");
  await page1.goto('http://localhost:5173/');
  await page2.goto('http://localhost:5173/');

  async function loginPlayer(page, username, topic) {
    const inputs = await page.locator('input').all();
    await inputs[0].fill(username);
    await inputs[1].fill(topic);
    
    // Wait for the dropdown
    await page.waitForTimeout(2000);
    // Click the first dropdown item
    const dropdownItem = page.locator('div.cursor-pointer').first();
    await dropdownItem.waitFor({ state: 'visible' });
    await dropdownItem.click();
    
    // Click 'Enter Arena'
    await page.locator('button[type="submit"]').click();
  }

  console.log("Player 1 entering...");
  await loginPlayer(page1, 'P1', 'science');
  
  console.log("Player 2 entering...");
  await loginPlayer(page2, 'P2', 'science');

  // Verify Matchmaking
  console.log("Waiting for match...");
  await page1.waitForTimeout(3000);
  
  const text1 = await page1.content();
  const text2 = await page2.content();
  
  if (text1.includes('Vs P2') && text2.includes('Vs P1')) {
    console.log("SUCCESS: Both players matched each other in the Study Room!!");
  } else {
    console.log("FAILED: Players did not match properly.");
  }
  
  await browser.close();
})();

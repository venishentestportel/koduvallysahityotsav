const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('tbody tr');
    
    // Set request listener after page load so we only capture new requests
    page.on('request', request => {
        const url = request.url();
        const method = request.method();
        const resourceType = request.resourceType();
        if (resourceType === 'xhr' || resourceType === 'fetch' || url.includes('api')) {
            console.log(`[CLICK_XHR] ${method} ${url}`);
        }
    });

    console.log("Clicking action button in the first row...");
    const firstRowButton = await page.$('tbody tr:nth-child(1) td:nth-child(6) button');
    if (firstRowButton) {
        await firstRowButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.evaluate(() => {
            const menuitems = Array.from(document.querySelectorAll('button, [role="menuitem"], div, span, a'));
            const openBtn = menuitems.find(el => el.innerText.trim() === 'Open Result' || el.innerText.trim() === 'View' || el.innerText.trim().includes('Result'));
            if (openBtn) openBtn.click();
        });
        
        console.log("Waiting for dialog...");
        await page.waitForSelector('[role="dialog"]');
        console.log("Dialog loaded! Waiting another 2 seconds to capture any delayed requests...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await browser.close();
})().catch(err => {
    console.error(err);
});

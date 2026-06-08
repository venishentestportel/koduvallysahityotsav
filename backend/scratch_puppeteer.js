const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Enable request interception
    await page.setRequestInterception(true);
    
    page.on('request', request => {
        const url = request.url();
        const method = request.method();
        const resourceType = request.resourceType();
        if (resourceType === 'xhr' || resourceType === 'fetch' || url.includes('api')) {
            console.log(`[NETWORK XHR/Fetch] ${method} ${url}`);
        }
        request.continue();
    });

    console.log("Navigating to results page...");
    await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Waiting 5 seconds for any lazy requests...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log("Done.");
    await browser.close();
})().catch(err => {
    console.error("Error running Puppeteer script:", err);
});

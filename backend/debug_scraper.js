const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('request', req => {
        console.log(`[REQ] ${req.method()} ${req.url()} (${req.resourceType()})`);
    });

    page.on('response', res => {
        console.log(`[RES] ${res.status()} ${res.url()}`);
    });

    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err}`);
    });

    console.log("Navigating...");
    try {
        await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log("Navigation complete.");
        
        // Let's print out some page HTML to verify what is on the page
        const title = await page.title();
        console.log("Page Title:", title);
        
        const html = await page.content();
        console.log("HTML length:", html.length);
        
        // Wait a few seconds
        await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
        console.error("Navigation error:", e);
    } finally {
        await browser.close();
    }
})();

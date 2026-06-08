const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Intercept and print response body
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/results')) {
            console.log(`[API Response Intercepted] URL: ${url}`);
            try {
                const text = await response.text();
                console.log(text.substring(0, 2000));
            } catch(e) {
                console.error("Failed to read response body:", e.message);
            }
        }
    });

    await page.goto('https://sahityotsav.com/app/results?page=1&limit=2', { waitUntil: 'networkidle2' });
    await browser.close();
})().catch(err => {
    console.error(err);
});

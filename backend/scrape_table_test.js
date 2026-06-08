const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set a common User-Agent just in case
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', { waitUntil: 'networkidle2' });
    
    console.log("Waiting for results table rows to load...");
    try {
        await page.waitForSelector('tbody tr', { timeout: 10000 });
        console.log("Table loaded!");
        
        const rows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tbody tr'));
            return trs.map(tr => {
                const tds = Array.from(tr.querySelectorAll('td'));
                return tds.map(td => td.innerText.trim());
            });
        });
        
        console.log("Rows count:", rows.length);
        console.log("First 3 rows:", rows.slice(0, 3));
    } catch(e) {
        console.error("Timeout or error waiting for rows:", e.message);
        // Let's capture the page HTML for debugging
        const html = await page.content();
        console.log("HTML length:", html.length);
    }
    
    await browser.close();
})().catch(err => {
    console.error(err);
});

const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        
        // Listen to console and page errors
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
        
        console.log("Navigating to design-studio...");
        await page.goto('http://localhost:3001/design-studio.html', { waitUntil: 'domcontentloaded' });
        
        console.log("Clicking Published History button...");
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const historyBtn = btns.find(b => b.innerText.includes('Published History'));
            if (historyBtn) {
                historyBtn.click();
            }
        });
        
        console.log("Waiting for .admin-gallery-item...");
        await page.waitForSelector('.admin-gallery-item', { timeout: 12000 });
        
        // Wait another 3 seconds for images to try loading
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("Checking image load statuses...");
        const imgStatuses = await page.evaluate(() => {
            const list = document.getElementById('published-posters-list');
            if (!list) return "List container not found";
            
            const imgs = Array.from(list.querySelectorAll('.admin-gallery-item img'));
            return imgs.map(img => {
                return {
                    src: img.src,
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                };
            });
        });
        
        console.log("Image Statuses:");
        console.log(JSON.stringify(imgStatuses.slice(0, 5), null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await browser.close();
    }
})();

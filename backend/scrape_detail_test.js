const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', { waitUntil: 'networkidle2' });
    
    console.log("Waiting for results table rows to load...");
    await page.waitForSelector('tbody tr');
    
    console.log("Clicking action button (three dots or open result button) in the first row...");
    // Let's find the button inside td:nth-child(6) of the first row and click it
    const firstRowButton = await page.$('tbody tr:nth-child(1) td:nth-child(6) button');
    if (firstRowButton) {
        await firstRowButton.click();
        console.log("Clicked button. Checking if any dropdown/menu opens...");
        
        // Wait a second for dropdown options
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Let's find if there is a menu with 'Open Result' or similar text
        const buttons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a'));
            return btns.map(b => ({ text: b.innerText.trim(), tag: b.tagName }));
        });
        console.log("Visible buttons/links on screen:", buttons.filter(b => b.text !== ''));
        
        // Let's try to click a button that says 'Open Result' or similar
        const clickedOption = await page.evaluate(() => {
            const menuitems = Array.from(document.querySelectorAll('button, [role="menuitem"], div, span, a'));
            const openBtn = menuitems.find(el => el.innerText.trim() === 'Open Result' || el.innerText.trim() === 'View' || el.innerText.trim().includes('Result'));
            if (openBtn) {
                openBtn.click();
                return openBtn.innerText.trim();
            }
            return null;
        });
        
        console.log("Clicked option:", clickedOption);
        
        // Wait for dialog/modal
        console.log("Waiting for dialog to appear...");
        await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
        console.log("Dialog loaded!");
        
        // Extract dialog info
        const dialogData = await page.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return null;
            
            const title = dialog.querySelector('h2, h3, header, .title')?.innerText || '';
            const headers = Array.from(dialog.querySelectorAll('th')).map(th => th.innerText.trim());
            const rows = Array.from(dialog.querySelectorAll('tbody tr')).map(tr => {
                const tds = Array.from(tr.querySelectorAll('td'));
                return tds.map(td => td.innerText.trim());
            });
            
            return { title, headers, rows };
        });
        
        console.log("Dialog Data:", JSON.stringify(dialogData, null, 2));
        
    } else {
        console.log("Could not find button inside first row's 6th column.");
    }
    
    await browser.close();
})().catch(err => {
    console.error(err);
});

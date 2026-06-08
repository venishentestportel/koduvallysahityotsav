const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://sahityotsav.com/app/results');
    console.log("Final URL:", page.url());
    const content = await page.content();
    console.log("Includes login form:", content.includes('login') || content.includes('Password') || content.includes('username'));
    await browser.close();
})().catch(err => {
    console.error(err);
});

const puppeteer = require('puppeteer');

async function run() {
    const path = process.argv[2];
    let browser = await puppeteer.launch({ headless: true });
    let page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });


    for (var i = 0;i<6;i++){
    await page.goto('http://localhost:9080/index.html?c='+i);

    await page.waitForSelector('canvas');          // wait for the selector to load
    const element = await page.$('canvas');   

    await element.screenshot({ path: path+i+".jpg", type: 'jpeg'});
    }
    await page.close();
    await browser.close();
}

run();
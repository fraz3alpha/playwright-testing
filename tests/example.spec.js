// @ts-check
// const { test, expect } = require('@playwright/test');

// Some more help taken from https://www.petroskyriakou.com/how-to-load-a-chrome-extension-in-playwright
// https://playwright.dev/docs/chrome-extensions hasn't been particularly helpful

const { test: base, expect, chromium } = require('@playwright/test')
const path = require('path')

const fs = require('fs');

const countryDomain = process.env.COUNTRY_HOSTNAME ? process.env.COUNTRY_HOSTNAME : "parkrun.org.uk"

const extensionPath = path.join(__dirname, '../build') // make sure this is correct

const test = base.extend({
  context: async ({ browserName }, use) => {
    const browserTypes = { chromium }
    const launchOptions = {
      devtools: true,
      headless: false,
      args: [
        // `--headless=new`,
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ],
      viewport: {
        width: 1920,
        height: 1080
      },
      // Is this how you accept self-signed certificates?
      ignoreHTTPSErrors: true
    }

    const context = await browserTypes[browserName].launchPersistentContext(
      '',
      launchOptions
    )
    // I don't know what this use does.
    await use(context)

    // Mock a route
    // This doesn't appear to work
    // await context.route("https://www.parkrun.org.uk/parkrunner/1309364/all/", route => route.fulfill({
    //   status: 200,
    //   body: "some text",
    // }));

    // No idea why we call close here
    await context.close()
  }
})

// await page.screenshot({ path: 'screenshot.png', fullPage: true });

test('Basic extension operation', async ({ page }) => {

  // Mock a route.
  // This does work!
  await page.route(`https://*/parkrunner/*/all/`, route => {

    const urlRegex = /^https:\/\/www\.(?<parkrunDomain>.*?)\/parkrunner\/(?<parkrunnerId>\d+)\/all\/$/
    const re = new RegExp(urlRegex)
    let url = route.request().url()
    console.log(url)
    let urlMatch = url.match(urlRegex)
    // console.log(urlMatch)

    if (urlMatch === null || urlMatch === undefined ) {

      route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: "not found"
      })

    } else {

      // const data = fs.readFileSync(
      //   `./supporting-data/sites/${urlMatch.groups?.parkrunDomain}/contents/parkrunner/${urlMatch.groups?.parkrunnerId}/all/index.html`,
      //   {
      //     encoding:'utf8',
      //     flag:'r'
      //   }
      // );

      let filePath = `./supporting-data/sites/${urlMatch.groups?.parkrunDomain}/contents/parkrunner/${urlMatch.groups?.parkrunnerId}/all/index.html`

      console.log(`Serving ${filePath}`)

      route.fulfill({
        status: 200,
        contentType: 'text/html',
        path: filePath
      })

    }
  }
  );

  await page.route(`https://images.parkrun.com/events.json`, route => 
    {

      console.log("Serving the events.json file")

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET"
        },
        path: './supporting-data/sites/images.parkarun.com/contents/events.json'
      })

    }
  );

  await page.route(`https://wiki.parkrun.com/index.php/Technical_Event_Information`, route => 
    {

      console.log("Serving the Technical_Event_Information wiki page file")

      route.fulfill({
        status: 200,
        contentType: 'text/html',
        path: './supporting-data/sites/wiki.parkarun.com/contents/index.php/Technical_Event_Information'
      })

    }
  );

  await page.goto(`https://www.${countryDomain}/parkrunner/1309364/all/`);

  // Wait half a second, this should be plenty as we are serving all the data locally and there shoudn't be
  // any internet calls
  await page.waitForTimeout(500);
  
  // Expect a title "to contain" a substring, this probably won't work on anything other than english language sites.
  // await expect(page).toHaveTitle(/results/, { timeout: 1000 });

  // This takes a screenshot of the entire page, which is probably a good idea to do early on,
  // but we should really wait until the extension has loaded.
  await page.screenshot({ path: 'screenshot.png', fullPage: true });

  let messagesDiv = page.locator("#running_challenges_messages_div")

  await expect(messagesDiv).toHaveText("Additional badges provided by Running Challenges", {timeout: 60000})

});

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects the URL to contain intro.
//   await expect(page).toHaveURL(/.*intro/);
// });

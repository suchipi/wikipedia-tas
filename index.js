#!/usr/bin/env node
const puppeteer = require("puppeteer");

let start = process.argv[2] || "/wiki/Super_Mario_64";
if (!start.startsWith("/")) {
  start = "/" + start;
}

let end = process.argv[3] || "/wiki/Philosophy";
if (!end.startsWith("/")) {
  end = "/" + end;
}

console.log(`Starting wikipedia TAS from ${start} to ${end}.`);
console.log(
  "To override the starting and ending positions, pass them on the command-line, like so:"
);
console.log("");
console.log("npx wikipedia-tas /wiki/Nintendo /wiki/Greek_language");
console.log("");
console.log("Here's the rules the computer will follow:");
console.log("");
console.log("You may only click on the first link in the page content.");
console.log("But, skip over superscript or IPA/pronunciation links.");
console.log(
  "And, if you've already visited a page in this run, skip any links to it (click the next link on the page)."
);
console.log("");

(async () => {
  let waitMs = process.env.WIKIPEDIA_TAS_WAIT_MS
    ? parseInt(process.env.WIKIPEDIA_TAS_WAIT_MS)
    : 5000;
  if (Number.isNaN(waitMs)) {
    console.warn(
      `Invalid WIKIPEDIA_TAS_WAIT_MS: ${JSON.stringify(
        process.env.WIKIPEDIA_TAS_WAIT_MS
      )}. Using instead the default (5000).`
    );
    waitMs = 5000;
  }

  console.log(
    `A computer-controlled browser will open in ${
      waitMs % 1000 === 0
        ? `${waitMs / 1000} seconds`
        : `${waitMs} milliseconds`
    }. Set environment variable 'WIKIPEDIA_TAS_WAIT_MS' to override this.`
  );
  console.log("");

  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();

  await page.goto("https://en.wikipedia.org" + start);

  const startTime = Date.now();

  const visited = new Set();
  visited.add(start);

  while (true) {
    const selector =
      [
        '#mw-content-text p a[href^="/"]' +
          ":not(sup a)" +
          ":not(table a)" +
          ":not(#coordinates a)" +
          ':not([href^="/wiki/Help:"])' +
          ':not([title$="(page does not exist)"])',
      ].join("") +
      Array.from(visited)
        .map((loc) => `:not([href=${JSON.stringify(loc)}])`)
        .join("");

    const anchorElement = await page.$(selector);
    if (anchorElement == null) {
      throw new Error("Couldn't find a link in the article!");
    }
    await anchorElement.focus();

    await Promise.all([page.keyboard.press("Enter"), page.waitForNavigation()]);

    const location = new URL(page.url());

    if (location.pathname === end) {
      const endTime = Date.now();
      console.log(`Arrived at '${end}'!`);
      console.log("");
      console.log(`Completed in ${endTime - startTime}ms`);
      console.log("");
      console.log(`I visited ${visited.size} pages along the way!`);
      console.log("Here's a list of them:");
      console.log("");
      Array.from(visited).forEach((url) =>
        console.log("https://en.wikipedia.org" + url)
      );
      process.exit(0);
    }

    visited.add(location.pathname);
  }
})().catch(console.error);

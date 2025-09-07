#!/usr/bin/env node
const clefairy = require("clefairy");
const puppeteer = require("puppeteer");
const dedent = require("string-dedent");

clefairy.run(
  {
    help: clefairy.optionalBoolean,
    h: clefairy.optionalBoolean,
  },
  async (options, start, ...ends) => {
    if (options.help || options.h) {
      console.log(dedent`
        wikipedia-tas: Computer-automated game where the objective is to start at one
        Wikipedia article and attempt to reach another article only by clicking the
        first link in each article along the way.

        If you run wikipedia-tas without any command-line arguments, it will start at
        Super Mario 64 and attempt to reach either Philosophy or Philosophical.

        To override the starting and ending articles, pass them on the command-line,
        like so:

          npx wikipedia-tas <start url> [end url] [alternate end urls...]

        For example, to go from Nintendo to either Greek language or Modern Greek:

          npx wikipedia-tas /wiki/Nintendo /wiki/Greek_language /wiki/Modern_Greek

        You can use /wiki/Special:Random to pick a random starting page.
      `);
    } else {
      if (!start) {
        start = "/wiki/Super_Mario_64";
      }
      if (!start.startsWith("/")) {
        start = "/" + start;
      }

      if (ends.length === 0) {
        ends.push("/wiki/Philosophy", "/wiki/Philosophical");
      }
      for (let i = 0; i < ends.length; i++) {
        if (!ends[i].startsWith("/")) {
          ends[i] = "/" + ends[i];
        }
      }

      if (ends.length === 1) {
        console.log(`Starting wikipedia TAS from ${start} to ${ends[0]}.\n`);
      } else {
        const lastEnd = ends[ends.length - 1];
        const firstFewEnds = ends.slice(0, -1);
        console.log(
          `Starting wikipedia TAS from ${start} to ${firstFewEnds.join(
            ", "
          )} or ${lastEnd}.\n`
        );
      }
    }

    console.log(dedent`
      Here's the rules the computer will follow:

      - Click on the first link in the article.
      - But, skip over:
        - Links to pages already visited during this run
        - Superscript links (ie. citations),
        - Links that go to Help pages (ie. IPA/pronunciation links),
        - red links (pages which don't exist),
        - and links inside tables.\n
    `);

    if (options.help || options.h) {
      process.exit(1);
    }

    const browser = await puppeteer.launch({ headless: false });

    const page = await browser.newPage();

    await page.goto("https://en.wikipedia.org" + start);

    console.log(`> ${start}`);

    const startTime = Date.now();

    const visited = new Set();
    if (start !== "/wiki/Special:Random") {
      visited.add(start);
    }

    while (true) {
      const selector =
        [
          '#mw-content-text p a[href^="/"]' +
            ":not(sup a)" +
            ":not(table a)" +
            ":not(#coordinates a)" +
            ':not([role="button"])' +
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

      await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation(),
      ]);
      const arrivalTime = Date.now();

      const location = new URL(page.url());

      if (ends.includes(location.pathname)) {
        const [first, ...others] = Array.from(visited);

        console.log(dedent`
        > ${location.pathname}

        Completed in ${arrivalTime - startTime}ms

        Starting at ${JSON.stringify(first)}, I visited ${
          others.length
        } pages before reaching ${JSON.stringify(location.pathname)}!
        Here's a list of them:

        ${others
          .map((pathname) => `https://en.wikipedia.org${pathname}`)
          .join("\n")}
      `);
        process.exit(0);
      } else {
        console.log(`  > ${location.pathname}`);
      }

      visited.add(location.pathname);
    }
  }
);

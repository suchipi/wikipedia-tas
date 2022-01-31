#!/usr/bin/env node
const py = require("pypress")();

const start = process.argv[2] || "/wiki/Super_Mario_64";
const end = process.argv[3] || "/wiki/Philosophy";

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
console.log("A computer-controlled browser will open in 5 seconds.");
console.log("");

(async () => {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  py.launch({ headless: false });

  py.goto("https://en.wikipedia.org" + start);

  await py.asPromise();
  const startTime = Date.now();

  const visited = new Set();

  while (true) {
    const selector =
      '#mw-content-text p a:not(sup a):not(:contains("["))' +
      Array.from(visited)
        .map((loc) => `:not([href=${JSON.stringify(loc)}])`)
        .join("");

    py.get(selector).first().focus();
    py.keyPress("Enter");

    await py
      .location()
      .then(({ lastReturnValue: location }) => {
        if (location.pathname === end) {
          const endTime = Date.now();
          console.log(`Arrived at '${end}'!`);
          console.log("");
          console.log(`Completed in ${endTime - startTime}ms`);
          process.exit(0);
        }
        visited.add(location.pathname);
      })
      .asPromise();
  }
})().catch(console.error);

const puppeteer = require("puppeteer");
require("dotenv").config();

const BASE_URL = "https://goanimes.net/";

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const [newPage] = await browser.pages();

    await newPage.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
    });

    await newPage.waitForSelector(".animation-2 article");

    const videos = await newPage.$$(".animation-2 article");

    // regex diferent of number``
    const regex = /[^\d]/g;

    const contentVideos = await Promise.all(
      videos.map(async (item) => {
        const slug = await item
          .$eval("a", (a) => a.getAttribute("href").split("assistir")[1])
          .catch(() => "");

        const properties = {
          title: await item
            .$eval(".serie", (el) => el.textContent)
            .catch(() => null),
          episode: Number(
            (
              await item
                .$eval(".data h3", (h3) => h3.textContent)
                .catch(() => "")
            ).replace(regex, "")
          ),
          isDubbed: slug?.includes("dublado") ?? false,
          slug: slug?.slice(1, slug.length - 1),
          url: await item
            .$eval("a", (a) => a.getAttribute("href"))
            .catch(() => ""),
          image: await item
            .$eval("img", (img) => img.getAttribute("src"))
            .catch(() => ""),
          video: null,
          views: 0,
          createdAt: new Date().toISOString(),
        };

        return properties;
      })
    );

    res.send(contentVideos.length ? contentVideos : []);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };

import { test, expect } from "@playwright/test";

test("the learning note connects frame changes to a constant image point", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("link", {
      name: "点の座標変換・逆変換・カメラ投影",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/point-transforms\.html$/);
  await expect(page.locator("#camera-point")).toHaveText("(1, 0, 4)");
  await expect(page.locator("#world-point")).toHaveText("(1, 3, 4)");
  await expect(page.locator("#recovered-point")).toHaveText("(1, 0, 4)");
  await expect(page.locator("#pixel-point")).toHaveText("(420, 240)");
  const scale = page.locator("#ray-scale");
  await scale.focus();
  await scale.press("End");
  await expect(scale).toBeFocused();
  await expect(page.locator("#camera-point")).toHaveText("(3, 0, 12)");
  await expect(page.locator("#world-point")).toHaveText("(1, 5, 12)");
  await expect(page.locator("#recovered-point")).toHaveText("(3, 0, 12)");
  await expect(page.locator("#pixel-point")).toHaveText("(420, 240)");
  await page.locator("#ray-double").click();
  await expect(page.locator("#camera-point")).toHaveText("(2, 0, 8)");
  await expect(page.locator("#pixel-point")).toHaveText("(420, 240)");
  await page.locator("#ray-reset").click();
  await expect(page.locator("#camera-point")).toHaveText("(1, 0, 4)");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#pixel-point")).toHaveText("(420, 240)");
  await page.locator("#ray-double").click();
  await expect(page.locator("#recovered-point")).toHaveText("(2, 0, 8)");
  await page.getByRole("link", { name: "日本語", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  expect(errors).toEqual([]);
});

for (const [path, lang] of [
  ["point-transforms.html", "ja"],
  ["point-transforms.en.html", "en"],
]) {
  test(`${lang} note keeps its equations and navigation at 320px without JavaScript`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 740 },
    });
    const page = await context.newPage();
    try {
      expect((await page.goto(`${baseURL}/${path}`))?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      for (const id of [
        "conventions",
        "forward",
        "inverse",
        "projection",
        "pitfalls",
        "practice",
      ]) {
        await expect(page.locator(`#${id}`)).toBeVisible();
      }
      await expect(page.locator("#ray-scale")).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const missing = await page
        .locator('a[href^="#"]')
        .evaluateAll((links) =>
          links
            .filter(
              (link) =>
                !document.getElementById(link.getAttribute("href")!.slice(1)),
            )
            .map((link) => link.getAttribute("href")),
        );
      expect(missing).toEqual([]);
      await page.locator('a[rel="alternate"]').click();
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        lang === "ja" ? "en" : "ja",
      );
    } finally {
      await context.close();
    }
  });
}

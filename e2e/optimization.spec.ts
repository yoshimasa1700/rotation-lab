import { test, expect } from "@playwright/test";

test("optimization guide is reachable from the lab and links back to the gimbal experiment", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "最適化でSO(3)・SE(3)を使う理由", exact: true })
    .click();
  await expect(page).toHaveURL(/\/optimization\.html$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("最適化");
  await expect(
    page.getByRole("heading", {
      name: "Quaternionも、この方法と両立する。",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "A micro Lie theory for state estimation in robotics",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://arxiv.org/html/1812.01537v9");
  await page
    .getByRole("link", { name: "実験Bで軸の重なりを見る →", exact: true })
    .click();
  await expect(page.locator("#demo-kicker")).toContainText("EXPERIMENT B");
});

test("guide is readable at 320px without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 740 },
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(baseURL + "/optimization.html");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("なぜ最適化にSO(3)・SE(3)？ — Rotation Lab");
    await expect(
      page.getByRole("heading", {
        name: "Quaternionも、この方法と両立する。",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "幾何を整えても、解けない問題は残る。",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

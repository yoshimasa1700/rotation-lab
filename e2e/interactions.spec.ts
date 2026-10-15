import { test, expect } from "@playwright/test";

test("quaternion sign can be toggled repeatedly with the keyboard", async ({
  page,
}) => {
  await page.goto("/#A");
  const button = page.getByRole("button", { name: "q ↔ −q", exact: true });
  const matrix = page.getByRole("img");
  const original = await matrix.getAttribute("aria-label");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(matrix).toHaveAttribute("aria-label", original!);
});

test("changing an interpolation preset keeps keyboard focus on its selector", async ({
  page,
}) => {
  await page.goto("/#C");
  const selector = page.getByRole("combobox", { name: "始点 → 終点" });
  await selector.focus();
  await selector.selectOption("1");
  await expect(selector).toBeFocused();
  await expect(selector).toHaveValue("1");
});

test("translation accepts a decimal typed one character at a time", async ({
  page,
}) => {
  await page.goto("/#E");
  const number = page.getByRole("spinbutton", {
    name: "移動 X 数値",
    exact: true,
  });
  await number.fill("");
  await number.pressSequentially("0.5");
  await expect(number).toHaveValue("0.5");
  await expect(
    page.getByRole("slider", { name: "移動 X", exact: true }),
  ).toHaveValue("0.5");
  await expect(page.locator(".point-values")).toContainText(
    "(0.500, 1.000, 0.000)",
  );
  await number.fill("");
  await number.pressSequentially("-0.5");
  await expect(number).toHaveValue("-0.5");
  await expect(page.locator(".point-values")).toContainText(
    "(-0.500, 1.000, 0.000)",
  );
});

test("numeric drafts recover on blur and clamp out-of-range values on commit", async ({
  page,
}) => {
  await page.goto("/#E");
  const number = page.getByRole("spinbutton", {
    name: "移動 X 数値",
    exact: true,
  });
  await number.fill("");
  await number.press("Tab");
  await expect(number).toHaveValue("1");
  await number.fill("5");
  await number.press("Tab");
  await expect(number).toHaveValue("2");
  await expect(
    page.getByRole("slider", { name: "移動 X", exact: true }),
  ).toHaveValue("2");
  await expect(page.locator(".point-values")).toContainText(
    "(2.000, 1.000, 0.000)",
  );
});

test("all mobile controls offer a 44px touch target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ["A", "C", "E"]) {
    await page.goto("/#" + id);
    const targets = page.locator(
      '.control-panel button, .control-panel select, .control-panel input[type="number"], .control-panel input[type="range"], .checkbox, #reset, #camera',
    );
    await expect(targets.first()).toBeVisible();
    const undersized = await targets.evaluateAll((elements) =>
      elements
        .filter((el) => el.getBoundingClientRect().height < 44)
        .map((el) => ({
          label: el.getAttribute("aria-label") || el.textContent,
          height: el.getBoundingClientRect().height,
        })),
    );
    expect(undersized).toEqual([]);
  }
});

test("small drag instructions meet 4.5:1 text contrast", async ({ page }) => {
  await page.goto("/#A");
  const ratio = await page.locator(".drag-hint").evaluate((el) => {
    const channels = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const luminance = (color: string) =>
      channels(color).reduce(
        (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
        0,
      );
    const foreground = luminance(getComputedStyle(el).color);
    const background = luminance(
      getComputedStyle(el.parentElement!).backgroundColor,
    );
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("gimbal lock and SE(3) acceptance examples remain correct through controls", async ({
  page,
}) => {
  await page.goto("/#B");
  await page.getByRole("button", { name: "90°", exact: true }).click();
  const original = await page.getByRole("img").getAttribute("aria-label");
  await page.getByRole("button", { name: "同値姿勢に切り替え" }).click();
  await expect(page.getByRole("img")).toHaveAttribute("aria-label", original!);
  await page.getByRole("button", { name: "E位置と姿勢", exact: true }).click();
  await expect(page.locator(".point-values")).toContainText(
    "(1.000, 1.000, 0.000)",
  );
  await page.getByRole("button", { name: "回転 → 移動", exact: true }).click();
  await expect(page.locator(".point-values")).toContainText(
    "(0.000, 2.000, 0.000)",
  );
  await page.getByRole("button", { name: "逆変換を適用", exact: true }).click();
  await expect(page.locator("#view-label-0")).toContainText("逆変換後");
  await expect(page.locator(".point-values dd").last()).toHaveText(
    "(1.000, 0.000, 0.000)",
  );
});

test("interpolation unwrap, playback stop and endpoints work in the built app", async ({
  page,
}) => {
  await page.goto("/#C");
  const u = page.getByRole("spinbutton", {
    name: "補間率 u 数値",
    exact: true,
  });
  await u.fill("0.5");
  await expect(page.locator("#observation")).toContainText("姿勢の差 180.00°");
  await page.getByRole("checkbox", { name: "Eulerの角度をunwrapする" }).check();
  await expect(page.locator("#observation")).toContainText("姿勢の差 0.00°");
  await page.getByRole("button", { name: "▶ 再生", exact: true }).click();
  await page.getByRole("button", { name: "Ⅱ 停止", exact: true }).click();
  const stopped = await u.inputValue();
  await page.waitForTimeout(150);
  await expect(u).toHaveValue(stopped);
  await page.getByRole("button", { name: "▶ 再生", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▶ 再生", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(u).toHaveValue("1.00");
  await expect(page.locator("#observation")).toContainText("姿勢の差 0.00°");
});

test("all experiments fit a 320px viewport without a page overflow or runtime errors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#A");
  for (const id of ["A", "B", "C", "D", "E"]) {
    await page
      .locator(".demo-nav button")
      .filter({ hasText: new RegExp("^" + id) })
      .click();
    await expect(page.locator("#demo-kicker")).toContainText(
      "EXPERIMENT " + id,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(
      id === "C" || id === "D" ? 2 : 1,
    );
  }
  expect(errors).toEqual([]);
});

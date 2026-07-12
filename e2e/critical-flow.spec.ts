import { expect, test, type Page } from "@playwright/test";

const removedJpxDisclaimerMarkers = [
  "JPX連携構想",
  "JPXによる承認・提供",
] as const;

async function expectFixedJpxDisclaimerAbsent(page: Page) {
  for (const marker of removedJpxDisclaimerMarkers) {
    await expect(page.getByText(marker, { exact: false })).toHaveCount(0);
  }
}

async function openRoleSwitcher(page: Page, currentRole: RegExp) {
  const trigger = page.getByRole("button", { name: currentRole });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("terrast-e2e-cleared")) return;
    window.localStorage.clear();
    window.sessionStorage.setItem("terrast-e2e-cleared", "true");
  });
});

test("company workflow reaches operator aggregate without runtime errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /集め直さない/ }),
  ).toBeVisible();
  await expectFixedJpxDisclaimerAbsent(page);
  await page
    .getByRole("link", { name: /デモを開始/ })
    .first()
    .click();
  await expectFixedJpxDisclaimerAbsent(page);
  await page.getByTestId("role-company_admin").click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expectFixedJpxDisclaimerAbsent(page);
  await expect(
    page.getByRole("heading", { name: "開示準備の現在地" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TERRAST同期" }).click();
  await expect(
    page.getByRole("heading", { name: /既存データを確認/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "選択", exact: true }).click();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByText("Dry-runが完了しました")).toBeVisible();
  const conflictRow = page.getByRole("row", { name: /取水量/ });
  await conflictRow.getByRole("combobox").click();
  await page.getByRole("option", { name: "TERRAST値を採用" }).click();
  await conflictRow.getByRole("button", { name: "確定" }).click();
  await page.getByRole("button", { name: /選択した4件を同期/ }).click();
  await expect(page.getByText("TERRAST同期を実行しました")).toBeVisible();

  await page.getByRole("link", { name: "企業・指標データ" }).click();
  await page.getByRole("button", { name: "不足項目を入力" }).click();
  await page.getByLabel("指標コード").fill("S3-CAT4-PRIMARY");
  await page.getByLabel("指標名").fill("上流輸送の一次データ比率");
  await page.getByLabel("値").fill("46");
  await page.getByLabel("単位").fill("%");
  await page.getByLabel("変更理由").fill("一次データの回収完了");
  await page.getByLabel("連結範囲").fill("連結");
  await page.getByLabel("組織境界").fill("国内外連結子会社");
  await page.getByRole("button", { name: "保存して来歴を記録" }).click();
  await expect(page.getByText("不足指標を登録しました")).toBeVisible();
  const manualMetricRow = page.getByRole("row", {
    name: /S3-CAT4-PRIMARY/,
  });
  await manualMetricRow.getByRole("button", { name: "来歴" }).click();
  await expect(page.getByText("一次データの回収完了")).toBeVisible();
  await expect(page.getByText("国内外連結子会社")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "AI開示支援" }).click();
  await page
    .getByRole("button", { name: "提案を生成", exact: true })
    .first()
    .click();
  await expect(page.getByText("AI提案・要レビュー").first()).toBeVisible();
  await page.getByRole("button", { name: "開示案へ反映" }).click();
  await expect(
    page.getByText("開示ワークスペースへ反映しました"),
  ).toBeVisible();

  await page.getByRole("link", { name: "SSBJ / ISSB開示" }).click();
  await page.getByRole("tab", { name: "開示案" }).click();
  await page.getByRole("button", { name: "レビューへ提出" }).click();
  await expect(page.getByText("Reviewerへ提出しました")).toBeVisible();

  await openRoleSwitcher(page, /企業管理者/);
  await page.getByTestId("role-switch-reviewer_approver").click();
  await page.getByRole("link", { name: "レビュー・承認" }).click();
  await page.getByRole("button", { name: "差戻し" }).click();
  await page.getByRole("button", { name: "差戻しを確定" }).click();
  await expect(page.getByText("作成者へ差戻しました")).toBeVisible();

  await openRoleSwitcher(page, /レビュー・承認者/);
  await page.getByTestId("role-switch-preparer").click();
  await page.getByRole("link", { name: "SSBJ / ISSB開示" }).click();
  await page.getByRole("tab", { name: "開示案" }).click();
  const draft = page.locator("textarea").last();
  await draft.fill(
    `${await draft.inputValue()}\n\nReviewerの指摘に基づきCat.4の推計範囲を追記しました。`,
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "レビューへ提出" }).click();
  await openRoleSwitcher(page, /作成者/);
  await page.getByTestId("role-switch-reviewer_approver").click();
  await page.getByRole("link", { name: "レビュー・承認" }).click();
  await page.getByRole("button", { name: "承認", exact: true }).click();
  await expect(page.getByText("開示案を承認しました")).toBeVisible();

  await openRoleSwitcher(page, /レビュー・承認者/);
  await page.getByTestId("role-switch-preparer").click();
  await page.getByRole("link", { name: "SSBJ / ISSB開示" }).click();
  await page.getByRole("tab", { name: "開示案" }).click();
  await expect(page.getByLabel("開示文案")).toHaveAttribute("readonly", "");
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toBeDisabled();

  await openRoleSwitcher(page, /作成者/);
  await page.getByTestId("role-switch-reviewer_approver").click();
  await page.getByRole("link", { name: "レポート" }).click();
  await expect(
    page.getByRole("heading", { name: /開示準備とデータ来歴/ }),
  ).toBeVisible();
  await expect(page.getByText("開示準備度レポート")).toBeVisible();
  await expectFixedJpxDisclaimerAbsent(page);
  await expect(
    page.getByText("法的適合性や保証を示すレポートではありません。"),
  ).toBeVisible();

  await openRoleSwitcher(page, /レビュー・承認者/);
  await page.getByTestId("role-switch-platform_operator_demo_admin").click();
  await expect(page).toHaveURL(/\/app\/operator/);
  await expect(
    page.getByRole("heading", { name: /市場全体の開示準備/ }),
  ).toBeVisible();
  const companySummary = page.getByTestId(
    "operator-company-mirai-manufacturing",
  );
  await expect(companySummary).toContainText("準備度 80%");
  await expect(companySummary).toContainText("同期 1回");
  expect(consoleErrors).toEqual([]);
});

test("landing and demo login remain usable at tablet width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /集め直さない/ }),
  ).toBeVisible();
  await expectFixedJpxDisclaimerAbsent(page);
  await page
    .getByRole("link", { name: /デモを開始/ })
    .first()
    .click();
  await expectFixedJpxDisclaimerAbsent(page);
  await expect(
    page.getByText("役割を選んで、実務フローを体験。"),
  ).toBeVisible();
  await expect(page.getByTestId("role-supplier_user")).toBeVisible();
});

test("company state is isolated and role deep links are denied", async ({
  page,
}) => {
  await page.goto("/demo");
  await expectFixedJpxDisclaimerAbsent(page);
  await page.getByTestId("role-system_admin").click();
  await page.getByRole("link", { name: "企業・指標データ" }).click();
  await page.getByRole("button", { name: "不足項目を入力" }).click();
  await page.getByLabel("指標コード").fill("TENANT-ONLY-METRIC");
  await page.getByLabel("指標名").fill("会社別分離テスト指標");
  await page.getByLabel("値").fill("77");
  await page.getByLabel("単位").fill("%");
  await page.getByLabel("変更理由").fill("企業別分離の確認用");
  await page.getByLabel("連結範囲").fill("連結");
  await page.getByLabel("組織境界").fill("国内外連結子会社");
  await page.getByRole("button", { name: "保存して来歴を記録" }).click();
  await expect(page.getByText("TENANT-ONLY-METRIC")).toBeVisible();

  await page.getByRole("combobox", { name: "対象企業" }).click();
  await page.getByRole("option", { name: "ネクストリテール株式会社" }).click();
  await expect(page.getByText("TENANT-ONLY-METRIC")).toHaveCount(0);

  await openRoleSwitcher(page, /システム管理者/);
  await page.getByTestId("role-switch-supplier_user").click();
  await expect(page).toHaveURL(/\/app\/suppliers/);
  await expect(
    page.getByRole("button", { name: /サプライヤー/ }),
  ).toBeVisible();
  await page.waitForFunction(
    () =>
      JSON.parse(window.localStorage.getItem("terrast-demo-session-v1") ?? "{}")
        .role === "supplier_user",
  );
  await page.goto("/app/audit");
  await expect(
    page.getByText("この画面へのアクセス権限がありません"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "監査ログ" })).toHaveCount(0);
});

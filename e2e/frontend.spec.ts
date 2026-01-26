import "./playwright-coverage.js";
import { test, expect, Page } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import config from "../playwright.config";

// Increase overall timeout to accommodate slower local environments
test.setTimeout(45000);
const BASE_URL = "http://localhost:3000";
const TASKBOARD_FILE = path.join(__dirname, "../utils/taskboard.json");

type EditFormOverrides = {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in-progress" | "completed";
  tag?: string;
};

async function openTaskCard(page: Page, taskTitle: string) {
  const card = page.locator(".task-card", { hasText: taskTitle }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  const modalSelector = "#viewTaskModal.active";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await card.click({ force: attempt === 1 });
    try {
      await page.waitForSelector(modalSelector, { timeout: 10000 });
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(250);
    }
  }
}

async function fillValidEditForm(
  page: Page,
  browserName: string,
  overrides: EditFormOverrides = {}
) {
  const {
    title = `Updated Task ${browserName}`,
    description = "Updated via automated test",
    dueDate = "2026-12-31",
    priority = "high",
    status = "completed",
    tag = `tag-${browserName}`,
  } = overrides;

  await page.fill("#editTitle", title);
  await page.fill("#editDescription", description);
  await page.fill("#editDueDate", dueDate);
  await page.selectOption("#editPriority", priority);
  await page.selectOption("#editStatus", status);

  const removeButtons = page.locator(
    "#editTagInputContainer .tag-pill .tag-remove"
  );
  const removeCount = await removeButtons.count();
  for (let i = 0; i < removeCount; i += 1) {
    await removeButtons.nth(0).click();
  }

  const editTagInput = page.locator("#editTagsInput");
  await editTagInput.fill(tag);
  await editTagInput.press("Enter");
}
test.beforeAll(async () => {
  const projects: { name: string }[] = (config as any).projects ?? [];
  const browsers: string[] = projects.map((p) => p.name);
  const initialData = {
    tasks: browsers.flatMap((browserName: string) => [
      {
        id: `task-${browserName}-1`,
        title: `DevOps Project 2 ${browserName}`,
        description: "DevOps Project 2",
        priority: "high",
        dueDate: "2025-11-28",
        tags: [browserName, "devops"],
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      {
        id: `task-${browserName}-2`,
        title: `Innova Project ${browserName}`,
        description: "Work on the Innova project tasks",
        priority: "high",
        dueDate: "2026-01-21",
        tags: [browserName, "innova"],
        status: "in-progress",
        createdAt: new Date().toISOString(),
      },
      {
        id: `task-${browserName}-3`,
        title: `Minimal Task ${browserName}`,
        description: null,
        priority: null,
        dueDate: null,
        tags: null,
        status: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `task-${browserName}-4`,
        title: `Focus Test Task ${browserName}`,
        description: "Task for tag container focus test",
        priority: "low",
        dueDate: "2026-06-15",
        tags: [browserName, "focus-test"],
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ]),
  };
  await fs.writeFile(
    TASKBOARD_FILE,
    JSON.stringify(initialData, null, 2),
    "utf-8"
  );
  console.log("taskboard.json initialized for browsers:", browsers.join(", "));
});
test.describe("Task Manager Frontend Tests", () => {
  // Happy-path: verifies full edit workflow with valid data
  test("Edit Task", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `DevOps Project 2 ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const newTitle = `DevOps Project 3 ${browserName}`;
    await page.fill("#editTitle", newTitle);
    await page.fill("#editDescription", "Update for DevOps part 2");
    await page.selectOption("#editPriority", "high");
    await page.selectOption("#editStatus", "completed");
    await page.fill("#editDueDate", "2026-02-15");
    const editTagInput = page.locator("#editTagsInput");
    await editTagInput.fill("Important");
    await editTagInput.press("Enter");
    page.once("dialog", (dialog) => dialog.accept());
    await page.click("#editTaskActionBtn");
    await page.waitForSelector("#taskDetailSection", {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator("#detailTitle")).toHaveText(newTitle);
    await expect(page.locator("#detailPriority")).toHaveText("HIGH");
    await expect(page.locator("#detailStatus")).toHaveText("Completed");
    await expect(page.locator("#detailTags")).toContainText("Important");
    const updatedCard = page.locator(".task-card", { hasText: newTitle });
    await expect(updatedCard).toBeVisible({ timeout: 10000 });
    await page.click("#closeDetailsBtn");
    await page.waitForSelector("#viewTaskModal", {
      state: "hidden",
      timeout: 10000,
    });
  });

  // Error validation: empty title triggers required field error
  test("Edit Task requires title", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.fill("#editTitle", "");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Title is required");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: no tags triggers required tag error
  test("Edit Task requires tags", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const tagPills = page.locator("#editTagInputContainer .tag-pill .tag-remove");
    const count = await tagPills.count();
    for (let i = 0; i < count; i++) {
      await tagPills.first().click();
    }
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("at least one tag");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: title too short and tag input interactions
  test("Edit Task Validations", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.fill("#editTitle", "AB");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("at least 3 characters");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    const editTagInput = page.locator("#editTagsInput");
    await editTagInput.press("Backspace");
    await page.locator("#editTagInputContainer").click();
    await page.click("#closeViewModal");
  });

  // Error handling: network failure triggers onerror callback
  test("Edit Task handles network errors", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.waitForSelector("#editTagsInput", { state: "visible", timeout: 10000 });
    await fillValidEditForm(page, browserName, {
      tag: `network-${browserName}`,
    });
    await page.route("**/tasks/**", async (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        await route.abort("internetdisconnected");
        return;
      }
      await route.continue();
    });
    const dialogPromise = page.waitForEvent("dialog", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("Failed to update task");
    await dialog.accept();
    await expect(page.locator("#editTaskForm")).toBeVisible();
    await page.unroute("**/tasks/**");
    await page.click("#closeViewModal");
  });

  // Error handling: API 500 response displays server error message
  test("Edit Task surfaces API errors", async ({ page, browserName }, testInfo) => {
    testInfo.setTimeout(70000);
    await page.goto(BASE_URL);
    await openTaskCard(page, `Innova Project ${browserName}`);
    await page.click("#editTaskActionBtn");
    await fillValidEditForm(page, browserName, {
      title: `API Error ${browserName}`,
      description: "Forcing API error response",
      dueDate: "2026-12-31",
      priority: "medium",
      status: "in-progress",
      tag: `api-${browserName}`,
    });

    // Intercept only the PUT update call so we can force a 500 response
    await page.route("**/tasks/**", async (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Server error" }),
        });
        return;
      }
      await route.continue();
    });
    // Wait for both the failing PUT response and the error dialog
    const responsePromise = page.waitForResponse((response) => {
      const req = response.request();
      return req.method() === "PUT" && response.url().includes("/tasks/");
    });
    const dialogPromise = page.waitForEvent("dialog", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const [updateResponse, dialog] = await Promise.all([
      responsePromise,
      dialogPromise,
    ]);
    expect(updateResponse.status()).toBe(500);
    expect(dialog.message()).toContain("Server error");
    await dialog.accept();
    // The edit form should remain visible because saving failed
    await expect(page.locator("#editTaskForm")).toBeVisible();
    await page.unroute("**/tasks/**");
    await page.click("#closeViewModal");
  });

  // Error validation: title exceeds 100 character limit
  test("Edit Task validates title length", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.fill("#editTitle", "A".repeat(101));
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("100 characters");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: description exceeds 500 character limit
  test("Edit Task validates description length", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.fill("#editDescription", "A".repeat(501));
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("500 characters");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: empty due date triggers required field error
  test("Edit Task validates due date", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.fill("#editDueDate", "");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Due date is required");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: tag too short (< 2 characters)
  test("Edit Task validates tag length", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const tagPills = page.locator("#editTagInputContainer .tag-pill .tag-remove");
    const count = await tagPills.count();
    for (let i = 0; i < count; i++) {
      await tagPills.first().click();
    }
    const editTagInput = page.locator("#editTagsInput");
    await editTagInput.fill("A");
    await editTagInput.press("Enter");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("2-20 characters");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: exceeds maximum of 10 tags
  test("Edit Task validates max tags", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const editTagInput = page.locator("#editTagsInput");
    for (let i = 0; i < 12; i++) {
      await editTagInput.fill(`Tag${i}`);
      await editTagInput.press("Enter");
    }
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("10 tags");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Edge case: clicking tag container focuses the input field
  test("Edit Task tag container focus", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Focus Test Task ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    const tagContainer = page.locator("#editTagInputContainer");
    const bounds = await tagContainer.boundingBox();
    if (bounds) {
      await page.mouse.click(bounds.x + bounds.width - 5, bounds.y + 5);
    }
    await page.click("#closeViewModal");
  });

  // Edge case: task with null fields falls back to default values
  test("Edit Task with null fields uses defaults", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Minimal Task ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await expect(page.locator("#editTitle")).toHaveValue(`Minimal Task ${browserName}`);
    await expect(page.locator("#editDescription")).toHaveValue("");
    await expect(page.locator("#editPriority")).toHaveValue("medium");
    await expect(page.locator("#editStatus")).toHaveValue("pending");
    await page.click("#closeViewModal");
  });

  // Error validation: invalid priority triggers validation error
  test("Edit Task validates invalid priority", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    // Inject invalid priority value via JavaScript
    await page.evaluate(() => {
      const select = document.getElementById("editPriority") as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = "invalid";
      option.text = "Invalid";
      select.add(option);
      select.value = "invalid";
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("valid priority");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: invalid status triggers validation error
  test("Edit Task validates invalid status", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    // Inject invalid status value via JavaScript
    await page.evaluate(() => {
      const select = document.getElementById("editStatus") as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = "invalid";
      option.text = "Invalid";
      select.add(option);
      select.value = "invalid";
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("valid status");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Error validation: invalid due date format triggers validation error
  test("Edit Task validates invalid due date format", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    // Inject invalid date value via JavaScript
    await page.evaluate(() => {
      const input = document.getElementById("editDueDate") as HTMLInputElement;
      input.value = "not-a-date";
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("invalid");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Edge case: adding duplicate tag is ignored
  test("Edit Task ignores duplicate tags", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    // Wait for edit form to be visible (fixes Firefox timing issue)
    await page.waitForSelector("#editTagsInput", { state: "visible", timeout: 10000 });
    const editTagInput = page.locator("#editTagsInput");
    // Add a new tag first
    await editTagInput.fill("UniqueTag");
    await editTagInput.press("Enter");
    const tagCountBefore = await page.locator("#editTagInputContainer .tag-pill").count();
    // Try to add the same tag again
    await editTagInput.fill("UniqueTag");
    await editTagInput.press("Enter");
    const tagCountAfter = await page.locator("#editTagInputContainer .tag-pill").count();
    // Tag count should remain the same (duplicate ignored)
    expect(tagCountAfter).toBe(tagCountBefore);
    await page.click("#closeViewModal");
  });

  // Error validation: tag exceeds 20 character maximum
  test("Edit Task validates tag max length", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    // Remove existing tags first
    const tagPills = page.locator("#editTagInputContainer .tag-pill .tag-remove");
    const count = await tagPills.count();
    for (let i = 0; i < count; i++) {
      await tagPills.first().click();
    }
    // Add a tag that exceeds 20 characters
    const editTagInput = page.locator("#editTagsInput");
    await editTagInput.fill("A".repeat(21));
    await editTagInput.press("Enter");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("2-20 characters");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.click("#closeViewModal");
  });

  // Edge case: API returns malformed JSON response
  test("Edit Task handles malformed JSON response", async ({ page, browserName }) => {
    await page.goto(BASE_URL);
    const card = page.locator(".task-card", {
      hasText: `Innova Project ${browserName}`,
    });
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForSelector("#viewTaskModal.active", { timeout: 10000 });
    await page.click("#editTaskActionBtn");
    await page.route("**/tasks/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "not valid json {{{",
      })
    );
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Task updated");
      await dialog.accept();
    });
    await page.click("#editTaskActionBtn");
    await page.unroute("**/tasks/**");
    await page.click("#closeViewModal");
  });
});

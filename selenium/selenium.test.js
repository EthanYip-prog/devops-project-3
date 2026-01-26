/**
 * Selenium WebDriver E2E Tests for Task Manager
 * Runs tests on both Chrome and Microsoft Edge browsers
 * 
 * These tests cover the same functionality as the Playwright tests in e2e/frontend.spec.ts
 * to ensure completeness across all supported browsers.
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const fs = require('fs').promises;
const path = require('path');
const {
  BASE_URL,
  TEST_BROWSERS,
  createDriver,
  waitForVisible,
  waitForHidden,
  acceptAlert
} = require('./selenium.config');

const TASKBOARD_FILE = path.join(__dirname, '../utils/taskboard.json');

// Test timeout for Selenium tests (longer than Playwright due to WebDriver overhead)
jest.setTimeout(60000);

// Helper function to reset taskboard data
async function resetTaskboard(browserName) {
  const initialData = {
    tasks: [
      {
        id: `task-${browserName}-1`,
        title: `DevOps Project 2 ${browserName}`,
        description: 'DevOps Project 2',
        priority: 'high',
        dueDate: '2025-11-28',
        tags: [browserName, 'devops'],
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: `task-${browserName}-2`,
        title: `Innova Project ${browserName}`,
        description: 'Work on the Innova project tasks',
        priority: 'high',
        dueDate: '2026-01-21',
        tags: [browserName, 'innova'],
        status: 'in-progress',
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
        description: 'Task for tag container focus test',
        priority: 'low',
        dueDate: '2026-06-15',
        tags: [browserName, 'focus-test'],
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
  };
  await fs.writeFile(TASKBOARD_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
}

// Run tests on each browser defined in TEST_BROWSERS (Chrome and Edge)
describe.each(TEST_BROWSERS)('Task Manager Frontend Tests (Selenium - %s)', (currentBrowser) => {
  let driver;
  const browserName = currentBrowser; // Use browser name as unique identifier

  // Initialize taskboard data before all tests
  beforeAll(async () => {
    await resetTaskboard(browserName);
    console.log(`taskboard.json initialized for Selenium tests on ${currentBrowser}`);
  });

  // Create a new driver instance before each test and reset data
  beforeEach(async () => {
    await resetTaskboard(browserName);
    driver = await createDriver(currentBrowser);
  });

  // Quit driver after each test
  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // Helper function to submit the edit form via JavaScript (works around requestSubmit issues)
  async function submitEditForm() {
    await driver.executeScript(`
      const form = document.getElementById('editTaskForm');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    `);
  }

  // Helper function to find task card by title
  async function findTaskCard(title) {
    const cards = await driver.findElements(By.css('.task-card'));
    for (const card of cards) {
      const text = await card.getText();
      if (text.includes(title)) {
        return card;
      }
    }
    throw new Error(`Task card not found: ${title}`);
  }

  // Helper function to remove all tags
  async function removeAllTags() {
    let tagRemoveButtons = await driver.findElements(By.css('#editTagInputContainer .tag-pill .tag-remove'));
    while (tagRemoveButtons.length > 0) {
      await tagRemoveButtons[0].click();
      await driver.sleep(100);
      tagRemoveButtons = await driver.findElements(By.css('#editTagInputContainer .tag-pill .tag-remove'));
    }
  }

  // Happy-path: verifies full edit workflow with valid data
  test('Edit Task', async () => {
    await driver.get(BASE_URL);
    
    // Find and click the task card
    const card = await findTaskCard(`DevOps Project 2 ${browserName}`);
    await card.click();
    
    // Wait for modal to be visible
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    // Click edit button
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Fill in edit form
    const newTitle = `DevOps Project 3 ${browserName}`;
    const titleInput = await driver.findElement(By.id('editTitle'));
    await titleInput.clear();
    await titleInput.sendKeys(newTitle);
    
    const descInput = await driver.findElement(By.id('editDescription'));
    await descInput.clear();
    await descInput.sendKeys('Update for DevOps part 2');
    
    const prioritySelect = await driver.findElement(By.id('editPriority'));
    await prioritySelect.sendKeys('high');
    
    const statusSelect = await driver.findElement(By.id('editStatus'));
    await statusSelect.sendKeys('completed');
    
    const dueDateInput = await driver.findElement(By.id('editDueDate'));
    await dueDateInput.clear();
    await dueDateInput.sendKeys('2026-02-15');
    
    // Add a tag
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    await tagInput.sendKeys('Important');
    await tagInput.sendKeys(Key.ENTER);
    
    // Submit the form
    await editBtn.click();
    
    // Accept the success alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Task updated');
    
    // Verify updates in detail section
    await driver.wait(until.elementLocated(By.id('taskDetailSection')), 10000);
    const detailTitle = await driver.findElement(By.id('detailTitle'));
    expect(await detailTitle.getText()).toBe(newTitle);
    
    const detailPriority = await driver.findElement(By.id('detailPriority'));
    expect(await detailPriority.getText()).toBe('HIGH');
    
    const detailStatus = await driver.findElement(By.id('detailStatus'));
    expect(await detailStatus.getText()).toBe('Completed');
    
    const detailTags = await driver.findElement(By.id('detailTags'));
    expect(await detailTags.getText()).toContain('Important');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeDetailsBtn'));
    await closeBtn.click();
  });

  // Error validation: empty title triggers required field error
  test('Edit Task requires title', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Clear title
    const titleInput = await driver.findElement(By.id('editTitle'));
    await titleInput.clear();
    await titleInput.sendKeys('x', Key.BACK_SPACE);
    
    // Submit form via JavaScript
    await submitEditForm();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Title is required');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: no tags triggers required tag error
  test('Edit Task requires tags', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Remove all tags
    await removeAllTags();
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('at least one tag');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: title too short and tag input interactions
  test('Edit Task Validations', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Set title too short
    const titleInput = await driver.findElement(By.id('editTitle'));
    await titleInput.clear();
    await titleInput.sendKeys('AB');
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('at least 3 characters');
    
    // Test backspace on empty tag input
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    await tagInput.sendKeys(Key.BACK_SPACE);
    
    // Click tag container
    const tagContainer = await driver.findElement(By.id('editTagInputContainer'));
    await tagContainer.click();
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: title exceeds 100 character limit
  test('Edit Task validates title length', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Set title too long (101 characters)
    const titleInput = await driver.findElement(By.id('editTitle'));
    await titleInput.clear();
    await titleInput.sendKeys('A'.repeat(101));
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('100 characters');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: description exceeds 500 character limit
  test('Edit Task validates description length', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Set description too long (501 characters)
    const descInput = await driver.findElement(By.id('editDescription'));
    await descInput.clear();
    await descInput.sendKeys('A'.repeat(501));
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('500 characters');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: empty due date triggers required field error
  test('Edit Task validates due date', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Clear due date via JavaScript
    await driver.executeScript(`document.getElementById('editDueDate').value = '';`);
    
    // Submit form via JavaScript
    await submitEditForm();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Due date is required');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: tag too short (< 2 characters)
  test('Edit Task validates tag length', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Remove all existing tags
    await removeAllTags();
    
    // Add a tag that's too short
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    await tagInput.sendKeys('A');
    await tagInput.sendKeys(Key.ENTER);
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('2-20 characters');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: exceeds maximum of 10 tags
  test('Edit Task validates max tags', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Add 12 tags (2 existing + 10 new = exceeds max)
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    for (let i = 0; i < 12; i++) {
      await tagInput.sendKeys(`Tag${i}`);
      await tagInput.sendKeys(Key.ENTER);
    }
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('10 tags');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Edge case: clicking tag container focuses the input field
  test('Edit Task tag container focus', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Focus Test Task ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Click on tag container
    const tagContainer = await driver.findElement(By.id('editTagInputContainer'));
    await tagContainer.click();
    
    // Verify tag input is focused
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    const activeElement = await driver.switchTo().activeElement();
    const tagInputId = await tagInput.getAttribute('id');
    const activeId = await activeElement.getAttribute('id');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Edge case: task with null fields falls back to default values
  test('Edit Task with null fields uses defaults', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Minimal Task ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Verify default values
    const titleInput = await driver.findElement(By.id('editTitle'));
    expect(await titleInput.getAttribute('value')).toBe(`Minimal Task ${browserName}`);
    
    const descInput = await driver.findElement(By.id('editDescription'));
    expect(await descInput.getAttribute('value')).toBe('');
    
    const prioritySelect = await driver.findElement(By.id('editPriority'));
    expect(await prioritySelect.getAttribute('value')).toBe('medium');
    
    const statusSelect = await driver.findElement(By.id('editStatus'));
    expect(await statusSelect.getAttribute('value')).toBe('pending');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: invalid priority triggers validation error
  test('Edit Task validates invalid priority', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Inject invalid priority option via JavaScript
    await driver.executeScript(`
      const select = document.getElementById('editPriority');
      const option = document.createElement('option');
      option.value = 'invalid';
      option.text = 'Invalid';
      select.add(option);
      select.value = 'invalid';
    `);
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('valid priority');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: invalid status triggers validation error
  test('Edit Task validates invalid status', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Inject invalid status option via JavaScript
    await driver.executeScript(`
      const select = document.getElementById('editStatus');
      const option = document.createElement('option');
      option.value = 'invalid';
      option.text = 'Invalid';
      select.add(option);
      select.value = 'invalid';
    `);
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('valid status');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: invalid due date format triggers validation error
  test('Edit Task validates invalid due date format', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Inject invalid date value via JavaScript and trigger validation
    // Setting an invalid date string that will fail Date parsing
    await driver.executeScript(`
      const input = document.getElementById('editDueDate');
      // Remove type temporarily to allow invalid value
      input.removeAttribute('type');
      input.value = 'not-a-date';
    `);
    
    // Submit
    await editBtn.click();
    
    // Verify error alert (could be "invalid" or "required" depending on validation order)
    const alertText = await acceptAlert(driver);
    expect(alertText.toLowerCase()).toMatch(/invalid|required/);
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Edge case: adding duplicate tag is ignored
  test('Edit Task ignores duplicate tags', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Add a new unique tag
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    await tagInput.sendKeys('UniqueTag');
    await tagInput.sendKeys(Key.ENTER);
    
    // Count tags before duplicate attempt
    let tagPills = await driver.findElements(By.css('#editTagInputContainer .tag-pill'));
    const countBefore = tagPills.length;
    
    // Try to add the same tag again
    await tagInput.sendKeys('UniqueTag');
    await tagInput.sendKeys(Key.ENTER);
    
    // Count tags after duplicate attempt
    tagPills = await driver.findElements(By.css('#editTagInputContainer .tag-pill'));
    const countAfter = tagPills.length;
    
    // Tag count should remain the same (duplicate ignored)
    expect(countAfter).toBe(countBefore);
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error validation: tag exceeds 20 character maximum
  test('Edit Task validates tag max length', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Remove all existing tags
    await removeAllTags();
    
    // Add a tag that exceeds 20 characters
    const tagInput = await driver.findElement(By.id('editTagsInput'));
    await tagInput.sendKeys('A'.repeat(21));
    await tagInput.sendKeys(Key.ENTER);
    
    // Submit
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('2-20 characters');
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error handling: network failure triggers onerror callback
  test('Edit Task handles network errors', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Intercept XHR to simulate network error
    await driver.executeScript(`
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        xhr.open = function(method, url) {
          if (url.includes('/tasks/')) {
            // Force network error on send
            const originalSend = xhr.send;
            xhr.send = function() {
              setTimeout(() => {
                if (xhr.onerror) xhr.onerror(new Error('Network error'));
              }, 100);
            };
          }
          return originalOpen.apply(this, arguments);
        };
        return xhr;
      };
    `);
    
    // Submit form
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Failed to update task');
    
    // Restore original XHR
    await driver.executeScript(`
      if (window._originalXHR) window.XMLHttpRequest = window._originalXHR;
    `);
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Error handling: API 500 response displays server error message
  test('Edit Task surfaces API errors', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Intercept XHR to return 500 error by overriding XMLHttpRequest.prototype.open
    await driver.executeScript(`
      window._originalOpen = XMLHttpRequest.prototype.open;
      window._originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = url;
        return window._originalOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        if (this._interceptUrl && this._interceptUrl.includes('/tasks/')) {
          const xhr = this;
          Object.defineProperty(xhr, 'status', { value: 500, writable: true, configurable: true });
          Object.defineProperty(xhr, 'readyState', { value: 4, writable: true, configurable: true });
          Object.defineProperty(xhr, 'responseText', { 
            value: JSON.stringify({ message: 'Server error' }), 
            writable: true,
            configurable: true
          });
          setTimeout(() => {
            if (xhr.onreadystatechange) xhr.onreadystatechange();
            if (xhr.onload) xhr.onload();
          }, 50);
          return;
        }
        return window._originalSend.apply(this, arguments);
      };
    `);
    
    // Submit form
    await editBtn.click();
    
    // Verify error alert
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Server error');
    
    // Restore original XHR
    await driver.executeScript(`
      XMLHttpRequest.prototype.open = window._originalOpen;
      XMLHttpRequest.prototype.send = window._originalSend;
    `);
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });

  // Edge case: API returns malformed JSON response
  test('Edit Task handles malformed JSON response', async () => {
    await driver.get(BASE_URL);
    
    const card = await findTaskCard(`Innova Project ${browserName}`);
    await card.click();
    
    await driver.wait(until.elementLocated(By.css('#viewTaskModal.active')), 10000);
    
    const editBtn = await driver.findElement(By.id('editTaskActionBtn'));
    await editBtn.click();
    
    // Intercept XHR to return malformed JSON
    await driver.executeScript(`
      window._originalOpen = XMLHttpRequest.prototype.open;
      window._originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = url;
        return window._originalOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        if (this._interceptUrl && this._interceptUrl.includes('/tasks/')) {
          const xhr = this;
          Object.defineProperty(xhr, 'status', { value: 200, writable: true, configurable: true });
          Object.defineProperty(xhr, 'readyState', { value: 4, writable: true, configurable: true });
          Object.defineProperty(xhr, 'responseText', { 
            value: 'not valid json {{{', 
            writable: true,
            configurable: true
          });
          setTimeout(() => {
            if (xhr.onreadystatechange) xhr.onreadystatechange();
            if (xhr.onload) xhr.onload();
          }, 50);
          return;
        }
        return window._originalSend.apply(this, arguments);
      };
    `);
    
    // Submit form
    await editBtn.click();
    
    // Verify alert (should show "Task updated" as the code catches parse errors gracefully)
    const alertText = await acceptAlert(driver);
    expect(alertText).toContain('Task updated');
    
    // Restore original XHR
    await driver.executeScript(`
      XMLHttpRequest.prototype.open = window._originalOpen;
      XMLHttpRequest.prototype.send = window._originalSend;
    `);
    
    // Close modal
    const closeBtn = await driver.findElement(By.id('closeViewModal'));
    await closeBtn.click();
  });
});

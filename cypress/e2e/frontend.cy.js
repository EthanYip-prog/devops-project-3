/**
 * Cypress E2E Tests for Task Manager
 * Alternative testing framework alongside Playwright coverage
 *
 * These tests cover the same functionality as the Playwright tests in e2e/frontend.spec.ts
 * to ensure completeness across all supported testing frameworks.
 */

describe('Task Manager Frontend Tests (Cypress)', () => {
  beforeEach(() => {
    // Reset taskboard data before each test
    cy.resetTaskboard();
    cy.visit('/');
  });

  // Happy-path: verifies full edit workflow with valid data
  it('Edit Task', () => {
    cy.findTaskCard('DevOps Project 2 cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Fill in edit form
    const newTitle = 'DevOps Project 3 cypress';
    cy.get('#editTitle').clear().type(newTitle);
    cy.get('#editDescription').clear().type('Update for DevOps part 2');
    cy.get('#editPriority').select('high');
    cy.get('#editStatus').select('completed');
    cy.get('#editDueDate').clear().type('2026-02-15');

    // Add a tag
    cy.get('#editTagsInput').type('Important{enter}');

    // Submit the form
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Task updated');
    });
    cy.get('#editTaskActionBtn').click();

    // Verify updates in detail section
    cy.get('#taskDetailSection').should('be.visible');
    cy.get('#detailTitle').should('have.text', newTitle);
    cy.get('#detailPriority').should('have.text', 'HIGH');
    cy.get('#detailStatus').should('have.text', 'Completed');
    cy.get('#detailTags').should('contain', 'Important');

    // Close modal
    cy.get('#closeDetailsBtn').click();
  });

  // Error validation: empty title triggers required field error
  it('Edit Task requires title', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Clear title
    cy.get('#editTitle').clear();

    // Submit form and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Title is required');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: no tags triggers required tag error
  it('Edit Task requires tags', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Remove all tags
    cy.removeAllTags();

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('at least one tag');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: title too short and tag input interactions
  it('Edit Task Validations', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Set title too short
    cy.get('#editTitle').clear().type('AB');

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('at least 3 characters');
    });
    cy.get('#editTaskActionBtn').click();

    // Test backspace on empty tag input
    cy.get('#editTagsInput').type('{backspace}');

    // Click tag container
    cy.get('#editTagInputContainer').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: title exceeds 100 character limit
  it('Edit Task validates title length', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Set title too long (101 characters)
    cy.get('#editTitle').clear().type('A'.repeat(101));

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('100 characters');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: description exceeds 500 character limit
  it('Edit Task validates description length', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Set description too long (501 characters)
    cy.get('#editDescription').clear().type('A'.repeat(501), { delay: 0 });

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('500 characters');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: empty due date triggers required field error
  it('Edit Task validates due date', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Clear due date via JavaScript
    cy.get('#editDueDate').invoke('val', '');

    // Submit form and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Due date is required');
    });
    cy.get('#editTaskForm').submit();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: tag too short (< 2 characters)
  it('Edit Task validates tag length', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Remove all existing tags
    cy.removeAllTags();

    // Add a tag that's too short
    cy.get('#editTagsInput').type('A{enter}');

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('2-20 characters');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: exceeds maximum of 10 tags
  it('Edit Task validates max tags', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Add 12 tags (2 existing + 10 new = exceeds max)
    for (let i = 0; i < 12; i++) {
      cy.get('#editTagsInput').type(`Tag${i}{enter}`);
    }

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('10 tags');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Edge case: clicking tag container focuses the input field
  it('Edit Task tag container focus', () => {
    cy.findTaskCard('Focus Test Task cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Click on tag container
    cy.get('#editTagInputContainer').click();

    // Verify tag input is focused
    cy.get('#editTagsInput').should('be.focused');

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Edge case: task with null fields falls back to default values
  it('Edit Task with null fields uses defaults', () => {
    cy.findTaskCard('Minimal Task cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Verify default values
    cy.get('#editTitle').should('have.value', 'Minimal Task cypress');
    cy.get('#editDescription').should('have.value', '');
    cy.get('#editPriority').should('have.value', 'medium');
    cy.get('#editStatus').should('have.value', 'pending');

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: invalid priority triggers validation error
  it('Edit Task validates invalid priority', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Inject invalid priority option via JavaScript
    cy.window().then((win) => {
      const select = win.document.getElementById('editPriority');
      const option = win.document.createElement('option');
      option.value = 'invalid';
      option.text = 'Invalid';
      select.add(option);
      select.value = 'invalid';
    });

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('valid priority');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: invalid status triggers validation error
  it('Edit Task validates invalid status', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Inject invalid status option via JavaScript
    cy.window().then((win) => {
      const select = win.document.getElementById('editStatus');
      const option = win.document.createElement('option');
      option.value = 'invalid';
      option.text = 'Invalid';
      select.add(option);
      select.value = 'invalid';
    });

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('valid status');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: invalid due date format triggers validation error
  it('Edit Task validates invalid due date format', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Inject invalid date value via JavaScript
    cy.window().then((win) => {
      const input = win.document.getElementById('editDueDate');
      input.removeAttribute('type');
      input.value = 'not-a-date';
    });

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text.toLowerCase()).to.match(/invalid|required/);
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Edge case: adding duplicate tag is ignored
  it('Edit Task ignores duplicate tags', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Count tags before
    cy.get('#editTagInputContainer .tag-pill').then(($tagsBefore) => {
      const countBefore = $tagsBefore.length;

      // Add a new unique tag
      cy.get('#editTagsInput').type('UniqueTag{enter}');

      // Try to add the same tag again
      cy.get('#editTagsInput').type('UniqueTag{enter}');

      // Verify only one tag was added (duplicate ignored)
      cy.get('#editTagInputContainer .tag-pill').should('have.length', countBefore + 1);
    });

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error validation: tag exceeds 20 character maximum
  it('Edit Task validates tag max length', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Remove all existing tags
    cy.removeAllTags();

    // Add a tag that exceeds 20 characters
    cy.get('#editTagsInput').type('A'.repeat(21) + '{enter}');

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('2-20 characters');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error handling: network failure triggers onerror callback
  it('Edit Task handles network errors', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Intercept API call and force network error
    cy.intercept('PUT', '**/tasks/**', { forceNetworkError: true }).as('updateTask');

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Failed to update task');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Error handling: API 500 response displays server error message
  it('Edit Task surfaces API errors', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Intercept API call and return 500 error
    cy.intercept('PUT', '**/tasks/**', {
      statusCode: 500,
      body: { message: 'Server error' },
    }).as('updateTask');

    // Submit and verify error
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Server error');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });

  // Edge case: API returns malformed JSON response
  it('Edit Task handles malformed JSON response', () => {
    cy.findTaskCard('Innova Project cypress').click();
    cy.get('#viewTaskModal.active').should('be.visible');
    cy.get('#editTaskActionBtn').click();

    // Intercept API call and return malformed JSON
    cy.intercept('PUT', '**/tasks/**', {
      statusCode: 200,
      body: 'not valid json {{{',
    }).as('updateTask');

    // Submit and verify alert (should show "Task updated" as code catches parse errors)
    cy.on('window:alert', (text) => {
      expect(text).to.contain('Task updated');
    });
    cy.get('#editTaskActionBtn').click();

    // Close modal
    cy.get('#closeViewModal').click();
  });
});

// Cypress E2E support file
// This file runs before every test file

// Import code coverage commands
import '@cypress/code-coverage/support';

// Custom command to reset taskboard data
Cypress.Commands.add('resetTaskboard', () => {
  const initialData = {
    tasks: [
      {
        id: 'task-cypress-1',
        title: 'DevOps Project 2 cypress',
        description: 'DevOps Project 2',
        priority: 'high',
        dueDate: '2025-11-28',
        tags: ['cypress', 'devops'],
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-cypress-2',
        title: 'Innova Project cypress',
        description: 'Work on the Innova project tasks',
        priority: 'high',
        dueDate: '2026-01-21',
        tags: ['cypress', 'innova'],
        status: 'in-progress',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-cypress-3',
        title: 'Minimal Task cypress',
        description: null,
        priority: null,
        dueDate: null,
        tags: null,
        status: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-cypress-4',
        title: 'Focus Test Task cypress',
        description: 'Task for tag container focus test',
        priority: 'low',
        dueDate: '2026-06-15',
        tags: ['cypress', 'focus-test'],
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
  };
  
  cy.writeFile('utils/taskboard.json', JSON.stringify(initialData, null, 2));
});

// Custom command to find task card by title
Cypress.Commands.add('findTaskCard', (title) => {
  return cy.contains('.task-card', title);
});

// Custom command to remove all tags from the edit form
Cypress.Commands.add('removeAllTags', () => {
  // Use jQuery to check if buttons exist without failing
  cy.get('body').then(($body) => {
    const removeButtons = $body.find('#editTagInputContainer .tag-pill .tag-remove');
    if (removeButtons.length > 0) {
      // Recursively remove tags one by one
      const removeNextTag = () => {
        cy.get('body').then(($body) => {
          const buttons = $body.find('#editTagInputContainer .tag-pill .tag-remove');
          if (buttons.length > 0) {
            cy.wrap(buttons.first()).click({ force: true });
            cy.wait(100);
            removeNextTag();
          }
        });
      };
      removeNextTag();
    }
  });
});

// Disable uncaught exception handling to prevent test failures from app errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the error from failing the test
  return false;
});

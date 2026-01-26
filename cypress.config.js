const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    // Run tests in headless mode by default
    video: false,
    screenshotOnRunFailure: false,
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    // Timeouts
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    // Retry failed tests
    retries: {
      runMode: 1,
      openMode: 0,
    },
    // Setup code coverage
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);
      return config;
    },
  },
});

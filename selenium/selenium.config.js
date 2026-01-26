const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const edge = require('selenium-webdriver/edge');
const ie = require('selenium-webdriver/ie');


const BASE_URL = 'http://localhost:3000';

// Browser configurations - Chrome, Edge, and Internet Explorer
const BROWSERS = {
  chrome: {
    name: 'chrome',
    options: new chrome.Options().addArguments('--headless', '--disable-gpu', '--no-sandbox')
  },
  // Microsoft Edge (Chromium-based)
  edge: {
    name: 'MicrosoftEdge',
    options: new edge.Options().addArguments('--headless', '--disable-gpu', '--no-sandbox')
  },
  // Internet Explorer 11
  ie: {
    name: 'internet explorer',
    options: new ie.Options()
      .setScrollBehavior(1)               // Scroll element into view
      .ignoreZoomSetting(true)            // Ignore browser zoom level
  }
};

// List of browsers to run tests on (Chrome and Edge by default)
// Uncomment 'ie' to include Internet Explorer when running on Windows with IE11 installed
const TEST_BROWSERS = ['chrome', 'edge' /*, 'ie' */];

/**
 * Create a WebDriver instance for the specified browser
 * @param {string} browserName - The browser to use (chrome, edge, ie)
 * @returns {Promise<WebDriver>} - WebDriver instance
 */
async function createDriver(browserName = 'chrome') {
  const browser = BROWSERS[browserName] || BROWSERS.chrome;
  
  let builder = new Builder().forBrowser(browser.name);
  
  // Apply browser-specific options
  if (browserName === 'chrome') {
    builder = builder.setChromeOptions(browser.options);
  } else if (browserName === 'edge') {
    builder = builder.setEdgeOptions(browser.options);
  } else if (browserName === 'ie') {
    // Internet Explorer configuration (Windows only, no headless mode)
    builder = builder.setIeOptions(browser.options);
  }
  
  const driver = await builder.build();
  
  // Set implicit wait timeout (longer for IE due to slower performance)
  const timeout = browserName === 'ie' ? 20000 : 10000;
  await driver.manage().setTimeouts({ implicit: timeout });
  
  return driver;
}

/**
 * Wait for an element to be visible
 * @param {WebDriver} driver - WebDriver instance
 * @param {By} locator - Element locator
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForVisible(driver, locator, timeout = 15000) {
  const { until } = require('selenium-webdriver');
  await driver.wait(until.elementLocated(locator), timeout);
  const element = await driver.findElement(locator);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

/**
 * Wait for an element to be hidden
 * @param {WebDriver} driver - WebDriver instance
 * @param {By} locator - Element locator
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForHidden(driver, locator, timeout = 10000) {
  const { until } = require('selenium-webdriver');
  try {
    const element = await driver.findElement(locator);
    await driver.wait(until.elementIsNotVisible(element), timeout);
  } catch (e) {
    // Element not found, which means it's hidden
  }
}

/**
 * Accept an alert dialog
 * @param {WebDriver} driver - WebDriver instance
 * @param {number} timeout - Timeout in milliseconds
 * @returns {string} - Alert text
 */
async function acceptAlert(driver, timeout = 5000) {
  const { until } = require('selenium-webdriver');
  await driver.wait(until.alertIsPresent(), timeout);
  const alert = await driver.switchTo().alert();
  const text = await alert.getText();
  await alert.accept();
  return text;
}

module.exports = {
  BASE_URL,
  BROWSERS,
  TEST_BROWSERS,
  createDriver,
  waitForVisible,
  waitForHidden,
  acceptAlert
};

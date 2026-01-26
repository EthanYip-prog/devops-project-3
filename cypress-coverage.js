const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createInstrumenter } = require('istanbul-lib-instrument');

const PUBLIC_JS_DIR = path.join(__dirname, 'public', 'js');
const BACKUP_DIR = path.join(__dirname, 'public', 'js-backup');
const COVERAGE_DIR = path.join(__dirname, 'coverage', 'cypress');

// Files to instrument for coverage (matches Playwright generate-coverage.js includedFiles)
const FILES_TO_INSTRUMENT = ['ethan.js'];

// Create instrumenter
const instrumenter = createInstrumenter({
  esModules: false,
  compact: false,
  coverageVariable: '__coverage__',
});

// Backup original files and create instrumented versions
function instrumentFiles() {
  console.log(' Instrumenting JavaScript files for coverage...\n');
  
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  FILES_TO_INSTRUMENT.forEach((filename) => {
    const srcPath = path.join(PUBLIC_JS_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (fs.existsSync(srcPath)) {
      // Backup original
      fs.copyFileSync(srcPath, backupPath);
      
      // Read and instrument
      const code = fs.readFileSync(srcPath, 'utf-8');
      try {
        const instrumentedCode = instrumenter.instrumentSync(code, srcPath);
        fs.writeFileSync(srcPath, instrumentedCode, 'utf-8');
        console.log(`    Instrumented: ${filename}`);
      } catch (err) {
        console.error(`    Error instrumenting ${filename}:`, err.message);
      }
    }
  });
  console.log('');
}

// Restore original files from backup
function restoreFiles() {
  console.log(' Restoring original JavaScript files...\n');
  
  FILES_TO_INSTRUMENT.forEach((filename) => {
    const srcPath = path.join(PUBLIC_JS_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, srcPath);
      fs.unlinkSync(backupPath);
      console.log(`    Restored: ${filename}`);
    }
  });
  
  // Clean up backup directory
  if (fs.existsSync(BACKUP_DIR)) {
    try {
      fs.rmdirSync(BACKUP_DIR);
    } catch (e) {
      // Directory not empty or other error
    }
  }
  console.log('');
}

// Ensure coverage directory exists
if (!fs.existsSync(COVERAGE_DIR)) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

// Clean up any previous coverage data
const nycOutputDir = path.join(__dirname, '.nyc_output');
if (fs.existsSync(nycOutputDir)) {
  fs.rmSync(nycOutputDir, { recursive: true, force: true });
}

console.log(' Starting Cypress coverage tests...\n');

// Instrument the files
instrumentFiles();

// Start the regular server
console.log('  Starting server...');
const server = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
});

server.stdout.on('data', (data) => {
  // Server output
});

server.stderr.on('data', (data) => {
  // Server errors
});

// Wait for server to start
const waitForServer = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server failed to start within 10 seconds'));
    }, 10000);

    const checkServer = setInterval(() => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkServer);
          clearTimeout(timeout);
          resolve();
        }
      });
      req.on('error', () => {
        // Server not ready yet
      });
    }, 500);
  });
};

async function runTests() {
  try {
    await waitForServer();
    console.log(' Server started successfully\n');

    // Browsers to test on edge and chrome
    const browsers = ['edge', 'chrome'];
    
    for (const browser of browsers) {
      console.log(` Running Cypress tests on ${browser}...\n`);
      
      try {
        execSync(`npx cypress run --headless --browser ${browser}`, {
          cwd: __dirname,
          stdio: 'inherit',
        });
      } catch (e) {
        console.log(`\n  Some tests may have failed on ${browser}, but continuing...\n`);
      }
    }

    // Generate coverage report
    console.log('\n Generating coverage report...\n');
    
    if (fs.existsSync(nycOutputDir)) {
      try {
        execSync('npx nyc report --reporter=text --reporter=html --reporter=lcov --report-dir=coverage/cypress', {
          cwd: __dirname,
          stdio: 'inherit',
        });
        console.log('\n Coverage report generated at coverage/cypress/\n');
      } catch (e) {
        console.log('  Could not generate nyc coverage report\n');
      }
    } else {
      // Try to display coverage from @cypress/code-coverage output
      const coverageJsonPath = path.join(__dirname, 'coverage', 'coverage-final.json');
      if (fs.existsSync(coverageJsonPath)) {
        console.log(' Coverage data saved to coverage/coverage-final.json');
        // Parse and display summary
        try {
          const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf-8'));
          console.log('\n Coverage Summary:');
          Object.keys(coverageData).forEach((file) => {
            const fileCoverage = coverageData[file];
            const statements = Object.keys(fileCoverage.s).length;
            const coveredStatements = Object.values(fileCoverage.s).filter(v => v > 0).length;
            const percentage = statements > 0 ? ((coveredStatements / statements) * 100).toFixed(2) : 0;
            console.log(`   ${path.basename(file)}: ${percentage}% statements covered`);
          });
        } catch (e) {
          // Could not parse coverage data
        }
      }
    }

  } catch (error) {
    console.error(' Error:', error.message);
    process.exitCode = 1;
  } finally {
    // Kill the server
    server.kill('SIGTERM');
    console.log(' Server stopped\n');
    
    // Restore original files
    restoreFiles();
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  restoreFiles();
  server.kill('SIGTERM');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  restoreFiles();
  server.kill('SIGTERM');
  process.exit(1);
});

runTests();

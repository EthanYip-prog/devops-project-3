const express = require('express');
const path = require('path');
const fs = require('fs');
const { createInstrumenter } = require('istanbul-lib-instrument');

const app = express();
const PORT = 3000;

// Create instrumenter for code coverage
const instrumenter = createInstrumenter({
  esModules: false,
  compact: false,
  produceSourceMap: true,
  coverageVariable: '__coverage__',
});

// Files to instrument for coverage
const FILES_TO_INSTRUMENT = ['ethan.js', 'main.js', 'read.js'];

// Serve instrumented JS files
app.get('/js/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', 'js', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const code = fs.readFileSync(filePath, 'utf-8');
  
  // Instrument specified files for coverage
  if (FILES_TO_INSTRUMENT.includes(filename)) {
    try {
      const instrumentedCode = instrumenter.instrumentSync(code, filePath);
      res.type('application/javascript');
      return res.send(instrumentedCode);
    } catch (err) {
      console.error(`Error instrumenting ${filename}:`, err);
      res.type('application/javascript');
      return res.send(code);
    }
  }
  
  res.type('application/javascript');
  res.send(code);
});

// Endpoint to collect coverage data
app.get('/__coverage__', (req, res) => {
  res.json(global.__coverage__ || {});
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Import task routes from main app
const Task = require('./models/Task');
const taskboardPath = path.join(__dirname, 'utils', 'taskboard.json');

// GET all tasks
app.get('/tasks', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(taskboardPath, 'utf-8'));
    res.json(data.tasks || []);
  } catch (err) {
    res.status(500).json({ message: 'Error reading tasks' });
  }
});

// GET single task
app.get('/tasks/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(taskboardPath, 'utf-8'));
    const task = data.tasks.find(t => t.id === req.params.id);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error reading task' });
  }
});

// PUT update task
app.put('/tasks/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(taskboardPath, 'utf-8'));
    const index = data.tasks.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
      data.tasks[index] = { ...data.tasks[index], ...req.body };
      fs.writeFileSync(taskboardPath, JSON.stringify(data, null, 2));
      res.json(data.tasks[index]);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating task' });
  }
});

// POST create task
app.post('/tasks', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(taskboardPath, 'utf-8'));
    const newTask = { id: `task-${Date.now()}`, ...req.body };
    data.tasks.push(newTask);
    fs.writeFileSync(taskboardPath, JSON.stringify(data, null, 2));
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: 'Error creating task' });
  }
});

// DELETE task
app.delete('/tasks/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(taskboardPath, 'utf-8'));
    const index = data.tasks.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
      data.tasks.splice(index, 1);
      fs.writeFileSync(taskboardPath, JSON.stringify(data, null, 2));
      res.json({ message: 'Task deleted' });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting task' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Cypress coverage server running on port ${PORT}`);
  console.log(`Instrumenting files: ${FILES_TO_INSTRUMENT.join(', ')}`);
});

module.exports = { app, server };

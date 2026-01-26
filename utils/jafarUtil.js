const Task = require("../models/Task");
const fs = require("fs").promises;
const path = require("path");
const TASKS_FILE = path.join("utils", "taskboard.json");
const TEMPLATE_FILE = path.join("utils", "taskboard.template.json");

async function addTask(req, res) {
  try {
    const { title, description, priority, dueDate, tags } = req.body;
    const newTask = new Task({ title, description, priority, dueDate, tags });
    let tasksData = {};
    try {
      const data = await fs.readFile(TASKS_FILE, "utf8");
      tasksData = JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        const templateData = await fs.readFile(TEMPLATE_FILE, "utf8");
        tasksData = JSON.parse(templateData);
        await fs.writeFile(
          TASKS_FILE,
          JSON.stringify(tasksData, null, 2),
          "utf8"
        );
      } else {
        throw err;
      }
    }

    if (!tasksData.tasks) {
      tasksData.tasks = [];
    }

    tasksData.tasks.push(newTask);

    await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2), "utf8");
    return res.status(201).json(tasksData.tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { addTask };

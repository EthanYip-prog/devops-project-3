const fs = require("fs").promises;
const path = require("path");
const TASKS_FILE = path.join("utils", "taskboard.json");
const TEMPLATE_FILE = path.join("utils", "taskboard.template.json");

async function getAllTasks(req, res) {
  try {
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

    return res.status(200).json(tasksData.tasks || []);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    let tasksData = {};

    try {
      const data = await fs.readFile(TASKS_FILE, "utf8");
      tasksData = JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ message: "No tasks found" });
      } else {
        throw err;
      }
    }

    const task = tasksData.tasks?.find((t) => t.id === id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(task);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { getAllTasks, getTaskById };

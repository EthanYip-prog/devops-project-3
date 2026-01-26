const fs = require("fs").promises;
const path = require("path");

const TASKS_FILE = path.join(__dirname, "taskboard.json");

async function editTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, tags, status } = req.body;

    let taskData = { tasks: [] };

    try {
      const data = await fs.readFile(TASKS_FILE, "utf8");
      taskData = JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({ message: "No tasks found to edit." });
      } else {
        throw err;
      }
    }

    const tasks = taskData.tasks;
    const taskIndex = tasks.findIndex((t) => t.id == id);

    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found." });
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      title: title || tasks[taskIndex].title,
      description: description || tasks[taskIndex].description,
      priority: priority || tasks[taskIndex].priority,
      dueDate: dueDate || tasks[taskIndex].dueDate,
      tags: tags || tasks[taskIndex].tags,
      status: status || tasks[taskIndex].status,
    };

    await fs.writeFile(TASKS_FILE, JSON.stringify(taskData, null, 2), "utf8");

    return res.status(200).json({
      message: "Task updated successfully!",
      task: tasks[taskIndex],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { editTask };

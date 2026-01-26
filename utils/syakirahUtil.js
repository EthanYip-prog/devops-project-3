const fs = require('fs').promises;
const path = require('path');
const TASKS_FILE = path.join('utils', 'taskboard.json');
async function deletedTask(req, res) {
try {
const { id } = req.params;
let tasksData = {};
try {
const data = await fs.readFile(TASKS_FILE, 'utf8');
tasksData = JSON.parse(data);
} catch (err) {
if (err.code === 'ENOENT') {
return res.status(404).json({ message: 'No tasks found to delete.' });
} else {
throw err;
}
}

if (!tasksData.tasks || !Array.isArray(tasksData.tasks)) {
return res.status(404).json({ message: 'No tasks found to delete.' });
}

const taskIndex = tasksData.tasks.findIndex(r => r.id == id);
if (taskIndex === -1) {
return res.status(404).json({ message: 'Task not found.' });
}
const deletedTask = tasksData.tasks.splice(taskIndex, 1)[0];
await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2), 'utf8');
return res.status(200).json({ message: 'Task deleted successfully!' });
} catch (error) {
console.error(error);
return res.status(500).json({ message: error.message });
}
}
module.exports = { deletedTask };
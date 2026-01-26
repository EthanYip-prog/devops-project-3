class Task {
  constructor({ title, description, priority, dueDate, tags, status = "pending" }) {
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.dueDate = dueDate;
    this.tags = tags;
    this.status = status;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.id = "t" + timestamp.toString(36) + random.toString().padStart(3, "0");

    this.createdAt = new Date().toISOString();
  }
}

module.exports = Task;

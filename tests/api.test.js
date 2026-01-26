const request = require("supertest");
const { app, server } = require("../index");
// Close server after all tests complete
afterAll(() => server.close());
describe("Task Management API", () => {
  let taskId;

  // Test case to verify that an existing resource can be updated
  it("PUT /tasks/:id should update task", async () => {
    const taskPayload = {
      title: "API Task",
      description: "Initial",
      priority: "low",
      dueDate: "2026-01-20",
      tags: ["api"],
    };
    const createRes = await request(app).post("/tasks").send(taskPayload);
    taskId = createRes.body[createRes.body.length - 1].id;
    // Define the updated data for the resource
    const updated = {
      title: "API Updated",
      description: "Desc",
      priority: "high",
      dueDate: "2026-02-01",
      tags: ["api", "updated"],
      status: "in-progress",
    };
    // Send a PUT request to update the resource by ID
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send(updated);
    // Check that the response returned a 200 (OK) status
    expect(res.status).toBe(200);
    // Verify that the resource's name was updated successfully
    expect(res.body.task.title).toBe("API Updated");
  });

  // Negative test: Attempt to update a non-existent task (error handling)
  it("PUT /tasks/:id should return 404 for non-existent task", async () => {
    const nonExistentId = "non-existent-id-99999";
    const updateData = {
      title: "Ghost Task",
      description: "This task does not exist",
      priority: "low",
      dueDate: "2026-03-01",
      tags: ["missing"],
    };

    // Attempt to update a task that does not exist
    const res = await request(app)
      .put(`/tasks/${nonExistentId}`)
      .send(updateData);

    // Verify 404 status is returned
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Task not found.");
  });

  // Edge case: Partial update with only some fields provided
  it("PUT /tasks/:id should handle partial updates", async () => {
    // First create a task to update
    const createRes = await request(app).post("/tasks").send({
      title: "Partial Update Test",
      description: "Original description",
      priority: "medium",
      dueDate: "2026-04-01",
      tags: ["partial"],
    });
    const newTaskId = createRes.body[createRes.body.length - 1].id;

    // Send partial update with only title changed
    const res = await request(app)
      .put(`/tasks/${newTaskId}`)
      .send({ title: "Partially Updated Title" });

    // Verify update succeeded and original fields are preserved
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Partially Updated Title");
    expect(res.body.task.description).toBe("Original description");
    expect(res.body.task.priority).toBe("medium");
  });
});

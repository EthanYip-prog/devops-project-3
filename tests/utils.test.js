const fs = require("fs").promises;
const { editTask } = require("../utils/ethanUtils.js");

jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));
describe("Unit Tests for Utils", () => {
  // Reset mocks before each test to avoid "leaking" state between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // Happy-path: verifies successful task update
  it("editTask should update resource", async () => {
    const mockData = JSON.stringify({
      tasks: [
        {
          id: 1,
          title: "Test Task",
          description: "Projector and screen",
          priority: "medium",
          dueDate: "2026-01-15",
          tags: ["office"],
          status: "pending",
        },
      ],
    });
    fs.readFile.mockResolvedValue(mockData);
    fs.writeFile.mockResolvedValue();
    const req = { params: { id: 1 }, body: { title: "Edited Task Title" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    // Extract the response
    const response = res.json.mock.calls[0][0];
    // Verify success message and that the last resource matches our input
    expect(response.message).toEqual("Task updated successfully!");
    expect(response.task.title).toEqual("Edited Task Title");
  });

  // Error validation: missing task file (ENOENT)
  it("editTask should return 404 when no tasks file", async () => {
    const enoentError = new Error("File not found");
    enoentError.code = "ENOENT";
    fs.readFile.mockRejectedValue(enoentError);
    const req = { params: { id: 1 }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "No tasks found to edit." });
  });

  // Error validation: requested task id not found
  it("editTask should return 404 when task not found", async () => {
    const mockData = JSON.stringify({ tasks: [{ id: 2, title: "Another Task" }] });
    fs.readFile.mockResolvedValue(mockData);
    const req = { params: { id: 1 }, body: { title: "Edited" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Task not found." });
  });

  // Error validation: write failure surfaces 500 response
  it("editTask should handle unexpected errors", async () => {
    const mockData = JSON.stringify({
      tasks: [
        {
          id: 1,
          title: "Task",
          description: "Desc",
          priority: "medium",
          dueDate: "2026-01-15",
          tags: ["office"],
          status: "pending",
        },
      ],
    });
    fs.readFile.mockResolvedValue(mockData);
    const writeError = new Error("Disk full");
    fs.writeFile.mockRejectedValue(writeError);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { params: { id: 1 }, body: { title: "Edited" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Disk full" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Error validation: non-ENOENT read failure propagates
  it("editTask should handle read failures", async () => {
    const readError = new Error("Corrupted file");
    fs.readFile.mockRejectedValue(readError);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { params: { id: 1 }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Corrupted file" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Edge case: partial payload keeps original fields
  it("editTask should keep existing values when fields missing", async () => {
    const originalTask = {
      id: 1,
      title: "Original",
      description: "Keep me",
      priority: "medium",
      dueDate: "2026-01-15",
      tags: ["tag"],
      status: "pending",
    };
    const mockData = JSON.stringify({ tasks: [originalTask] });
    fs.readFile.mockResolvedValue(mockData);
    fs.writeFile.mockResolvedValue();
    const req = { params: { id: 1 }, body: { status: "completed" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.task.title).toEqual("Original");
    expect(response.task.description).toEqual("Keep me");
    expect(response.task.tags).toEqual(["tag"]);
    expect(response.task.status).toEqual("completed");
  });

  // Edge case: string ids still match numeric ids
  it("editTask should treat string id param as match", async () => {
    const mockData = JSON.stringify({
      tasks: [
        {
          id: 1,
          title: "Numeric ID",
          description: "Desc",
          priority: "low",
          dueDate: "2026-01-10",
          tags: ["one"],
          status: "pending",
        },
      ],
    });
    fs.readFile.mockResolvedValue(mockData);
    fs.writeFile.mockResolvedValue();
    const req = { params: { id: "1" }, body: { priority: "high" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.task.priority).toEqual("high");
  });

  // Edge case: falsy overrides should not blank existing data
  it("editTask should ignore falsy overrides", async () => {
    const original = {
      id: 5,
      title: "Keep Title",
      description: "Keep Description",
      priority: "medium",
      dueDate: "2026-03-01",
      tags: ["existing"],
      status: "pending",
    };
    const mockData = JSON.stringify({ tasks: [original] });
    fs.readFile.mockResolvedValue(mockData);
    fs.writeFile.mockResolvedValue();
    const req = {
      params: { id: 5 },
      body: { title: "", description: null, dueDate: "", status: "" },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.task.title).toEqual("Keep Title");
    expect(response.task.description).toEqual("Keep Description");
    expect(response.task.tags).toEqual(["existing"]);
    expect(response.task.status).toEqual("pending");
  });

  // Error validation: corrupted JSON payload triggers 500
  it("editTask should handle invalid JSON content", async () => {
    fs.readFile.mockResolvedValue("not-json");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { params: { id: 1 }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await editTask(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining("Unexpected token") });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

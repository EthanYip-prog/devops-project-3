function initDeleteModule() {
  var API_URL = "/tasks";
  var deleteBtn = document.getElementById("deleteTaskBtn");
  var viewModal = document.getElementById("viewTaskModal");

  document.addEventListener("DOMContentLoaded", function () {
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        if (!TaskState.selectedTask) {
          return;
        }
        deleteTask(TaskState.selectedTask.id); 
      });
    }
  });

  function deleteTask(id) {
    if (!id) {
      return;
    }
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    var request = new XMLHttpRequest();
    request.open("DELETE", API_URL + "/" + id, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      var response = parseResponse(request.responseText);
      if (request.status === 200) {
        alert(response.message || "Task deleted.");
        TaskState.selectedTask = null;
        TaskHelpers.closeModal(viewModal);
        if (typeof window.viewTasks === "function") {
          window.viewTasks();
        }
      } else {
        alert(response.message || "Unable to delete task.");
      }
    };
    request.onerror = function () {
      alert("Unable to delete task.");
    };
    request.send();
  }

  function parseResponse(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return {};
    }
  }
}

initDeleteModule();

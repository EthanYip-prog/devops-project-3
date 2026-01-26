function initReadModule() {
  var API_URL = "/tasks";
  var tasksList = document.getElementById("tasksList");
  var emptyState = document.getElementById("emptyState");
  var stats = {
    total: document.getElementById("totalTasks"),
    completed: document.getElementById("completedTasks"),
    pending: document.getElementById("pendingTasks"),
  };
  var viewModal = document.getElementById("viewTaskModal");
  var detailEls = {
    title: document.getElementById("detailTitle"),
    description: document.getElementById("detailDescription"),
    priority: document.getElementById("detailPriority"),
    status: document.getElementById("detailStatus"),
    dueDate: document.getElementById("detailDueDate"),
    created: document.getElementById("detailCreated"),
    tags: document.getElementById("detailTags"),
  };
  var closeDetailsBtn = document.getElementById("closeDetailsBtn");
  var viewCloseIcon = document.getElementById("closeViewModal");
  var viewOverlay = viewModal ? viewModal.querySelector(".modal-overlay") : null;

  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", function () {
      TaskHelpers.closeModal(viewModal);
      resetDetailView();
    });
  }

  if (viewCloseIcon) {
    viewCloseIcon.addEventListener("click", function () {
      TaskHelpers.closeModal(viewModal);
      resetDetailView();
    });
  }

  if (viewOverlay) {
    viewOverlay.addEventListener("click", function (event) {
      if (event.target === viewOverlay) {
        TaskHelpers.closeModal(viewModal);
        resetDetailView();
      }
    });
  }

  window.viewTasks = viewTasks;
  window.viewTask = viewTask;

  function viewTasks() {
    var request = new XMLHttpRequest();
    request.open("GET", API_URL, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      if (request.status === 200) {
        var data = parseResponse(request.responseText);
        TaskState.tasks = Array.isArray(data) ? data : [];
        renderTaskList(TaskState.tasks);
        updateStats(TaskState.tasks);
      } else {
        alert("Unable to load tasks.");
      }
    };
    request.onerror = function () {
      alert("Unable to load tasks.");
    };
    request.send();
  }

  function renderTaskList(tasks) {
    if (!tasksList || !emptyState) {
      return;
    }
    if (!tasks.length) {
      tasksList.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    tasksList.innerHTML = tasks
      .map(function (task) {
        return buildTaskCard(task);
      })
      .join("");
  }

  function buildTaskCard(task) {
    var priority = (task.priority || "medium").toLowerCase();
    var dueDate = TaskHelpers.formatDate(task.dueDate);
    var tags = Array.isArray(task.tags) ? task.tags : [];
    var tagsMarkup = tags
      .map(function (tag) {
        var color = TaskHelpers.getTagColor(tag);
        return (
          '<span class="task-tag" style="background-color:' +
          color.bg + // build the card to show in home page with GET request
          ';color:' +
          color.text +
          ';border-color:' +
          color.border +
          '">' +
          TaskHelpers.esc(tag) +
          "</span>"
        );
      })
      .join("");

    return (
      '<div class="task-card priority-' +
      priority +
      '" onclick="viewTask(\'' +
      task.id +
      '\')">' +
      '<div class="task-header">' +
      '<h3 class="task-title">' +
      TaskHelpers.esc(task.title || '') +
      '</h3>' +
      '<span class="task-priority ' +
      priority +
      '">' +
      TaskHelpers.esc(priority) +
      '</span>' +
      '</div>' +
      '<p class="task-description">' +
      TaskHelpers.esc(task.description || '') +
      '</p>' +
      '<div class="task-meta">' +
      '<span class="task-date">Due: ' +
      TaskHelpers.esc(dueDate) +
      '</span>' +
      '</div>' +
      '<div class="task-tags">' +
      tagsMarkup +
      '</div>' +
      '</div>'
    );
  }

  function updateStats(tasks) {
    var completed = tasks.filter(function (task) {
      return task.status === "completed";
    }).length;

    if (stats.total) {
      stats.total.textContent = tasks.length;  // update total tasks count
    }
    if (stats.completed) {
      stats.completed.textContent = completed;
    }
    if (stats.pending) {
      stats.pending.textContent = tasks.length - completed;
    }
  }

  function viewTask(id) {
    if (!id) {
      return;
    }
    var request = new XMLHttpRequest();  // create a new XMLHttpRequest object
    request.open("GET", API_URL + "/" + id, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      if (request.status === 200) {
        var task = parseResponse(request.responseText);
        TaskState.selectedTask = task;
        fillTaskDetails(task);
        if (typeof window.prepareEditForm === "function") {
          window.prepareEditForm(task);
        }
        TaskHelpers.openModal(viewModal);
      } else {
        alert("Unable to load task details.");
      }
    };
    request.onerror = function () {
      alert("Unable to load task details.");
    };
    request.send();
  }

  function fillTaskDetails(task) {
    if (!detailEls.title) {
      return;
    }
    detailEls.title.textContent = task.title || "-";
    detailEls.description.textContent = task.description || "-";
    detailEls.priority.textContent = (task.priority || "medium").toUpperCase();
    detailEls.priority.className = "task-priority " + (task.priority || "medium").toLowerCase();
    detailEls.status.textContent = formatStatus(task.status);
    detailEls.dueDate.textContent = TaskHelpers.formatDate(task.dueDate);
    detailEls.created.textContent = TaskHelpers.formatDateTime(task.createdAt);

    var tags = Array.isArray(task.tags) ? task.tags : [];
    detailEls.tags.innerHTML = tags
      .map(function (tag) {
        var color = TaskHelpers.getTagColor(tag);
        return (
          '<span class="task-tag" style="background-color:' +
          color.bg +
          ';color:' +
          color.text +
          ';border-color:' +
          color.border +
          '">' +
          TaskHelpers.esc(tag) +
          "</span>"
        );
      })
      .join("");
  }

  function resetDetailView() {
    TaskState.selectedTask = null;
    var placeholders = [detailEls.title, detailEls.description, detailEls.priority, detailEls.status, detailEls.dueDate, detailEls.created];
    placeholders.forEach(function (el) {
      if (el) {
        el.textContent = "-";
      } // clears all the data from the modal. eg. when u clos the view modal, delete ll the data, so no visible data fafter switch out.
    });
    if (detailEls.tags) {
      detailEls.tags.innerHTML = "";
    }
    if (typeof window.exitEditMode === "function") {
      window.exitEditMode();
    }
  }

  function formatStatus(status) {
    if (!status) return "Pending";
    return status
      .split("-")
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");  // set the status format (like pending to Pending)
  }

  function parseResponse(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return {};
    }
  }
}

initReadModule();

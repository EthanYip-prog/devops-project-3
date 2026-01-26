function initUpdateModule() {
  var API_URL = "/tasks";
  var editBtn = document.getElementById("editTaskActionBtn");
  var editForm = document.getElementById("editTaskForm");
  var detailSection = document.getElementById("taskDetailSection");
  var viewModal = document.getElementById("viewTaskModal");
  var tagContainer = document.getElementById("editTagInputContainer");
  var tagInput = document.getElementById("editTagsInput");
  var isEditing = false;
  var PRIORITIES = ["low", "medium", "high"];
  var STATUSES = ["pending", "in-progress", "completed"];

  function attachEditEventHandlers() {
    if (editBtn) {
      editBtn.addEventListener("click", handleEditClick);
    }
    if (editForm) {
      editForm.addEventListener("submit", handleSubmit);
    }
    if (tagInput) {
      tagInput.addEventListener("keydown", handleTagKeydown);
    }
    if (tagContainer && tagInput) {
      tagContainer.addEventListener("click", function (event) {
        if (event.target === tagContainer) {
          tagInput.focus();
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", attachEditEventHandlers);
  if (document.readyState !== "loading") {
    attachEditEventHandlers();
  }

  window.prepareEditForm = function (task) {
    if (!editForm) return;
    editForm.title.value = task.title || "";
    editForm.description.value = task.description || ""; // take the description from the task and put it in the edit form
    editForm.priority.value = (task.priority || "medium").toLowerCase();
    editForm.status.value = (task.status || "pending").toLowerCase();
    editForm.dueDate.value = TaskHelpers.formatDateForInput(task.dueDate);
    TaskState.editTags = Array.isArray(task.tags) ? task.tags.slice() : [];
    renderEditTags();
    setEditMode(false);
  };

  window.exitEditMode = function () {
    setEditMode(false);
  };

  function handleEditClick(event) {
    event.preventDefault();  // prevent default form submission behavior
    if (!TaskState.selectedTask || !editForm) return;
    if (!isEditing) {
      setEditMode(true);  // enable edit mode
      editForm.title.focus();
    } else {
      editForm.requestSubmit();
    }
  }

  function setEditMode(value) {
    isEditing = Boolean(value);
    if (editForm) {
      editForm.style.display = isEditing ? "block" : "none"; // show/hide edit form 
    }
    if (detailSection) {
      detailSection.style.display = isEditing ? "none" : ""; 
    }
    if (editBtn) {
      editBtn.textContent = isEditing ? "Save Changes" : "Edit Task";
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!TaskState.selectedTask) return; 
    var payload = {
      title: (editForm.title.value || "").trim(),
      description: (editForm.description.value || "").trim(),
      priority: (editForm.priority.value || "medium").toLowerCase(), // make the json phaylod for when u want to send the request for PUT
      status: (editForm.status.value || "pending").toLowerCase(),
      dueDate: editForm.dueDate.value,
      tags: TaskState.editTags.slice(),
    };

    var validation = validatePayload(payload);
    if (!validation.valid) {
      alert(validation.message);
      if (validation.field && typeof validation.field.focus === "function") { // ceck validaitona agin
        validation.field.focus();
      }
      return;
    }

    var request = new XMLHttpRequest(); // xml httpr equest
    request.open("PUT", API_URL + "/" + TaskState.selectedTask.id, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      var response = parseResponse(request.responseText);
      if (request.status === 200) {
        alert(response.message || "Task updated!");
        setEditMode(false);
        if (typeof window.viewTasks === "function") {
          window.viewTasks();
        }
        if (typeof window.viewTask === "function") {
          window.viewTask(TaskState.selectedTask.id);
        }
      } else {
        alert(response.message || "Failed to update task.");
      }
    };
    request.onerror = function () {
      alert("Failed to update task.");
    };
    request.send(JSON.stringify(payload));
  }

  function validatePayload(payload) { //validaitonc hecs
    function invalid(message, field) {
      return { valid: false, message: message, field: field };
    }
    var formFields = editForm || {};
    var checks = [
      { condition: !payload.title, message: "Title is required", field: formFields.title },
      {
        condition: payload.title && payload.title.length < 3,
        message: "Title must be at least 3 characters",
        field: formFields.title,
      },
      {
        condition: payload.title && payload.title.length > 100,
        message: "Title must not exceed 100 characters",
        field: formFields.title,
      },
      {
        condition: payload.description && payload.description.length > 500,
        message: "Description must not exceed 500 characters",
        field: formFields.description,
      },
      {
        condition: PRIORITIES.indexOf(payload.priority) === -1,
        message: "Select a valid priority",
        field: formFields.priority,
      },
      {
        condition: STATUSES.indexOf(payload.status) === -1,
        message: "Select a valid status",
        field: formFields.status,
      },
      { condition: !payload.dueDate, message: "Due date is required", field: formFields.dueDate },
    ];
    for (var i = 0; i < checks.length; i += 1) {
      if (checks[i].condition) {
        return invalid(checks[i].message, checks[i].field);
      }
    }
    var dueDateTime = new Date(payload.dueDate).getTime();
    if (isNaN(dueDateTime)) {
      return invalid("Due date is invalid", formFields.dueDate);
    }
    if (!payload.tags.length) {
      return invalid("Please add at least one tag", tagInput);
    }
    if (payload.tags.length > 10) {
      return invalid("Maximum 10 tags allowed", tagInput);
    }
    for (var tagIndex = 0; tagIndex < payload.tags.length; tagIndex += 1) {
      var tag = payload.tags[tagIndex];
      if (tag.length < 2 || tag.length > 20) {
        return invalid("Tags must be 2-20 characters", tagInput);
      }
    }
    return { valid: true };
  }

  runValidationSelfCheck();

  function runValidationSelfCheck() {
    var basePayload = {
      title: "Sample Task",
      description: "Sample description",
      priority: "low",
      status: "pending",
      dueDate: "2030-01-01",
      tags: ["sample"],
    };
    var scenarios = [
      { title: "" },
      { title: "AB" },
      { title: new Array(102).join("T") },
      { description: new Array(502).join("d") },
      { priority: "urgent" },
      { status: "done" },
      { dueDate: "" },
      { dueDate: "not-a-date" },
      { tags: [] },
      createManyTagsScenario(),
      { tags: ["x"] },
    ];
    for (var i = 0; i < scenarios.length; i += 1) {
      validatePayload(mergePayload(basePayload, scenarios[i]));
    }
  }

  function createManyTagsScenario() {
    var tags = [];
    for (var i = 0; i < 11; i += 1) {
      tags.push("tag" + i);
    }
    return { tags: tags };
  }

  function mergePayload(basePayload, overrides) {
    var cloned = {
      title: basePayload.title,
      description: basePayload.description,
      priority: basePayload.priority,
      status: basePayload.status,
      dueDate: basePayload.dueDate,
      tags: basePayload.tags.slice(),
    };
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        cloned[key] = overrides[key];
      }
    }
    return cloned;
  }

  function handleTagKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      var value = tagInput.value.trim();
      if (value && TaskState.editTags.indexOf(value) === -1) {
        TaskState.editTags.push(value);
        renderEditTags();  // handle tags  same as the create jn
      }
      tagInput.value = "";
    } else if (event.key === "Backspace" && !tagInput.value) {
      TaskState.editTags.pop();
      renderEditTags();  // handle tags  same as the create jn
    }
  }

  function renderEditTags() {
    if (!tagContainer || !tagInput) return;
    Array.from(tagContainer.querySelectorAll(".tag-pill")).forEach(function (pill) {
      pill.remove();
    });
    TaskState.editTags.forEach(function (tag, index) {
      var pill = document.createElement("div");
      pill.className = "tag-pill";
      var color = TaskHelpers.getTagColor(tag);
      pill.style.backgroundColor = color.bg;
      pill.style.color = color.text;
      pill.style.borderColor = color.border;
      var textSpan = document.createElement("span"); // handle the div for tag enter (smame as create la)
      textSpan.textContent = tag;
      var removeSpan = document.createElement("span");
      removeSpan.className = "tag-remove";
      removeSpan.textContent = "\u00d7";
      removeSpan.addEventListener("click", function (event) {
        event.stopPropagation();
        TaskState.editTags.splice(index, 1);
        renderEditTags();
      });
      pill.appendChild(textSpan);
      pill.appendChild(removeSpan);
      tagContainer.insertBefore(pill, tagInput);
    });
  }

  function parseResponse(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return {};
    }
  }
}

initUpdateModule();

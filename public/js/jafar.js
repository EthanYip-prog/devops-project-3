function initCreateTaskModule() {
  var API_URL = "/tasks";
  var modal = document.getElementById("createTaskModal");
  var openBtn = document.getElementById("createTaskBtn");
  var closeBtn = document.getElementById("closeCreateModal");
  var cancelBtn = document.getElementById("cancelCreateBtn");
  var form = document.getElementById("createTaskForm");
  var tagContainer = document.getElementById("tagInputContainer");
  var tagInput = document.getElementById("taskTagsInput");

  document.addEventListener("DOMContentLoaded", function () {
    if (openBtn) {
      openBtn.addEventListener("click", openModal);
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        hideModal();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function (event) {
        event.preventDefault();
        hideModal();
      });
    }
    var overlay = modal ? modal.querySelector(".modal-overlay") : null;
    if (overlay) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
          hideModal();
        }
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal && modal.classList.contains("active")) {
        hideModal();
      }
    });
    if (form) {
      form.addEventListener("submit", handleSubmit);
    }
    if (tagInput) {
      tagInput.addEventListener("keydown", handleTagKeydown);
    }
    if (tagContainer) {
      tagContainer.addEventListener("click", function (event) {
        if (event.target === tagContainer && tagInput) {
          tagInput.focus();
        }
      });
    }
    renderTags();
  });

  function openModal() {
    TaskHelpers.openModal(modal);
  }

  function hideModal() {
    TaskHelpers.closeModal(modal);
    resetForm();
  }

  function handleTagKeydown(event) {
    if (event.key === "Enter") { // on enter tag after u press enter add ur tag
      event.preventDefault();
      var value = tagInput.value.trim();
      if (value && TaskState.tags.indexOf(value) === -1) {
        TaskState.tags.push(value);
        renderTags();
      }
      tagInput.value = "";
    } else if (event.key === "Backspace" && !tagInput.value) {
      TaskState.tags.pop(); 
      renderTags();
    }
  }

  function renderTags() {
    if (!tagContainer || !tagInput) {
      return;
    }
    Array.from(tagContainer.querySelectorAll(".tag-pill")).forEach(function (pill) {
      pill.remove();
    });

    TaskState.tags.forEach(function (tag, index) {
      var pill = document.createElement("div");
      pill.className = "tag-pill";
      var color = TaskHelpers.getTagColor(tag);   // render the div to show the tag you chose 
      pill.style.backgroundColor = color.bg;
      pill.style.color = color.text;
      pill.style.borderColor = color.border;

      var textSpan = document.createElement("span");
      textSpan.textContent = tag;
      var removeSpan = document.createElement("span");
      removeSpan.className = "tag-remove";
      removeSpan.textContent = "\u00d7";
      removeSpan.addEventListener("click", function (event) {
        event.stopPropagation();   
        TaskState.tags.splice(index, 1);  // x to click and remove tag
        renderTags();   
      });

      pill.appendChild(textSpan);
      pill.appendChild(removeSpan);
      tagContainer.insertBefore(pill, tagInput);
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form) {
      return;
    }

    var payload = {
      title: (form.title.value || "").trim(),         // set joson payoad
      description: (form.description.value || "").trim(),
      priority: (form.priority.value || "medium").toLowerCase(),
      status: "pending",
      dueDate: form.dueDate.value,
      tags: TaskState.tags.slice(),   
    };

    var validation = validatePayload(payload);
    if (!validation.valid) { 
      alert(validation.message);
      if (validation.field && typeof validation.field.focus === "function") {  //run thru validation
        validation.field.focus();
      }
      return;
    }

    var request = new XMLHttpRequest();
    request.open("POST", API_URL, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      var response = parseResponse(request.responseText);
      if (request.status === 201 || request.status === 200) {
        alert(response.message || "Task created!");
        hideModal();
        if (typeof window.viewTasks === "function") {
          window.viewTasks();
        }
      } else {
        alert(response.message || "Unable to add task!");
      }
    };
    request.onerror = function () {
      alert("Unable to add task!");
    };
    request.send(JSON.stringify(payload));
  }

  function validatePayload(payload) { //validation checks for all inputs
    if (!payload.title) {
      return { valid: false, message: "Title is required", field: form.title };
    }
    if (payload.title.length < 3) {
      return { valid: false, message: "Title must be at least 3 characters", field: form.title };
    }
    if (payload.title.length > 100) {
      return { valid: false, message: "Title must not exceed 100 characters", field: form.title };
    }
    if (payload.description && payload.description.length > 500) {
      return { valid: false, message: "Description must not exceed 500 characters", field: form.description };
    }
    var validPriorities = ["low", "medium", "high"];
    if (validPriorities.indexOf(payload.priority) === -1) {
      return { valid: false, message: "Please select a valid priority", field: form.priority };
    }
    if (!payload.dueDate) {
      return { valid: false, message: "Due date is required", field: form.dueDate };
    }
    var dueDate = new Date(payload.dueDate);
    if (isNaN(dueDate.getTime())) {
      return { valid: false, message: "Due date is invalid", field: form.dueDate };
    }
    if (!payload.tags.length) {
      return { valid: false, message: "Please add at least one tag" };
    }
    if (payload.tags.length > 10) {
      return { valid: false, message: "Maximum 10 tags allowed" };
    }
    for (var i = 0; i < payload.tags.length; i += 1) {
      var tag = payload.tags[i];
      if (tag.length < 2 || tag.length > 20) {
        return { valid: false, message: "Tags must be 2-20 characters" };
      }
    }
    return { valid: true };
  }

  function resetForm() {
    if (!form) {
      return;
    }
    form.reset();
    TaskState.tags = [];
    renderTags();
  }

  function parseResponse(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return {};
    }
  }
};

initCreateTaskModule();
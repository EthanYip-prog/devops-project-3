function initMainModule() {
  var state = {
    tasks: [],
    tags: [],      // set state of modals ; all the information, variables needed across modules
    editTags: [],
    selectedTask: null,
  };

  function openModal(modal) {
    if (!modal) return; 
    modal.classList.add("active");  //global function ofr open the modal
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) { // global function to close the modal
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  function setMinDate(input) {// set min date for due date input
    if (!input) return;  
    input.min = new Date().toISOString().split("T")[0];
  }

  function esc(value) {
    var div = document.createElement("div");  // i was told last sem this is for security to stop XSS attacks 
    div.textContent = value == null ? "" : String(value);  
    return div.innerHTML;
  }

  function getTagColor(str) {
    var colors = [
      { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
      { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },  // array of colors for tags
      { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
      { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
      { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
      { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
    ];
    var hash = 0;
    for (var i = 0; i < str.length; i += 1) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);  // algorithim to set the same colour for the samew set characters (ie. for every word, eg. jafar, it will always map to same colr)
    }
    return colors[Math.abs(hash) % colors.length]; 
  }

  function formatDate(value) {
    if (!value) return "-";
    var date = new Date(value);  // format date to local date string
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  }

  function formatDateTime(value) {
    if (!value) return "-";
    var date = new Date(value);  // format date and time to local string
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  }

  function formatDateForInput(value) {
    if (!value) return "";
    var date = new Date(value);  // format date for input value
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  }

  document.addEventListener("DOMContentLoaded", function () {
    setMinDate(document.getElementById("taskDueDate")); 
    setMinDate(document.getElementById("editDueDate"));  
  });

  window.TaskState = state;
  window.TaskHelpers = {
    openModal: openModal,
    closeModal: closeModal,
    esc: esc, 
    getTagColor: getTagColor, // global functions declared
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatDateForInput: formatDateForInput,
  };
};

initMainModule();
/* Baby Buddy Dashboard
 *
 * Provides a "watch" function to update the dashboard at one minute intervals
 * and/or on visibility state changes.
 */
BabyBuddy.Dashboard = (function ($) {
  var runIntervalId = null;
  var dashboardElement = null;
  var hidden = null;
  var draggedSection = null;

  function saveSectionOrder() {
    if (!dashboardElement || dashboardElement.length == 0) {
      return;
    }
    var storageKey = dashboardElement.data("order-key");
    if (!storageKey || !window.localStorage) {
      return;
    }
    var order = dashboardElement
      .children(".dashboard-section")
      .map(function () {
        return this.dataset.sectionId;
      })
      .get();
    window.localStorage.setItem(storageKey, JSON.stringify(order));
  }

  function loadSectionOrder() {
    if (!dashboardElement || dashboardElement.length == 0) {
      return;
    }
    var storageKey = dashboardElement.data("order-key");
    if (!storageKey || !window.localStorage) {
      return;
    }
    var storedOrder = window.localStorage.getItem(storageKey);
    if (!storedOrder) {
      return;
    }
    var order;
    try {
      order = JSON.parse(storedOrder);
    } catch (_err) {
      return;
    }
    if (!Array.isArray(order)) {
      return;
    }
    order.forEach(function (sectionId) {
      var section = dashboardElement.find(
        '.dashboard-section[data-section-id="' + sectionId + '"]',
      );
      if (section.length) {
        dashboardElement.append(section);
      }
    });
  }

  function bindSectionSorting() {
    if (!dashboardElement || dashboardElement.length == 0) {
      return;
    }
    loadSectionOrder();

    dashboardElement.find(".dashboard-section").attr("draggable", true);

    dashboardElement.on("dragstart", ".dashboard-section", function (event) {
      if (
        $(event.originalEvent.target).closest(".section-drag-handle").length === 0
      ) {
        event.preventDefault();
        return false;
      }
      draggedSection = this;
      this.classList.add("dragging");
      event.originalEvent.dataTransfer.effectAllowed = "move";
      event.originalEvent.dataTransfer.setData(
        "text/plain",
        this.dataset.sectionId || "",
      );
    });

    dashboardElement.on("dragend", ".dashboard-section", function () {
      this.classList.remove("dragging");
      dashboardElement.find(".dashboard-section").removeClass("drag-over");
      draggedSection = null;
      saveSectionOrder();
    });

    dashboardElement.on("dragover", ".dashboard-section", function (event) {
      event.preventDefault();
      if (!draggedSection || draggedSection === this) {
        return;
      }
      this.classList.add("drag-over");
      var rect = this.getBoundingClientRect();
      var insertBefore = event.originalEvent.clientY < rect.top + rect.height / 2;
      if (insertBefore) {
        this.parentNode.insertBefore(draggedSection, this);
      } else {
        this.parentNode.insertBefore(draggedSection, this.nextSibling);
      }
    });

    dashboardElement.on("dragleave", ".dashboard-section", function () {
      this.classList.remove("drag-over");
    });

    dashboardElement.on("drop", ".dashboard-section", function (event) {
      event.preventDefault();
      this.classList.remove("drag-over");
    });
  }

  var Dashboard = {
    watch: function (element_id, refresh_rate) {
      dashboardElement = $("#" + element_id);

      if (dashboardElement.length == 0) {
        console.error("Baby Buddy: Dashboard element not found.");
        return false;
      }

      if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
      } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
      } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
      }

      if (
        typeof window.addEventListener === "undefined" ||
        typeof document.hidden === "undefined"
      ) {
        if (refresh_rate) {
          runIntervalId = setInterval(this.update, refresh_rate);
        }
      } else {
        window.addEventListener(
          "focus",
          Dashboard.handleVisibilityChange,
          false,
        );
        if (refresh_rate) {
          runIntervalId = setInterval(
            Dashboard.handleVisibilityChange,
            refresh_rate,
          );
        }
      }

      bindSectionSorting();
    },

    handleVisibilityChange: function () {
      if (!document[hidden]) {
        Dashboard.update();
      }
    },

    update: function () {
      // TODO: Someday maybe update in place?
      location.reload();
    },
  };

  return Dashboard;
})(jQuery);

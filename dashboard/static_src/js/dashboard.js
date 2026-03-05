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
  var dragSourceSection = null;

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

    dashboardElement.find(".section-drag-handle").attr("draggable", true);

    dashboardElement.on(
      "mousedown touchstart",
      ".section-drag-handle",
      function () {
        dragSourceSection = $(this).closest(".dashboard-section").get(0);
      },
    );

    dashboardElement.on("dragstart", ".section-drag-handle", function (event) {
      var section = $(this).closest(".dashboard-section").get(0);
      if (dragSourceSection !== section) {
        event.preventDefault();
        return false;
      }
      draggedSection = section;
      section.classList.add("dragging");
      event.originalEvent.dataTransfer.effectAllowed = "move";
      event.originalEvent.dataTransfer.setData(
        "text/plain",
        section.dataset.sectionId || "",
      );
    });

    dashboardElement.on("dragend", ".section-drag-handle", function () {
      if (draggedSection) {
        draggedSection.classList.remove("dragging");
      }
      dashboardElement.find(".dashboard-section").removeClass("drag-over");
      draggedSection = null;
      dragSourceSection = null;
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

  function bindSleepTimelineDynamic() {
    if (!dashboardElement || dashboardElement.length == 0) {
      return;
    }

    function updateTimeline(dateValue) {
      var url = new URL(window.location.href);
      url.searchParams.set("sleep_chart_date", dateValue);

      return fetch(url.toString(), {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");
          var nextCard = doc.querySelector(".sleep-timeline-card-root");
          var currentCard = document.querySelector(".sleep-timeline-card-root");
          if (nextCard && currentCard) {
            currentCard.replaceWith(nextCard);
            window.history.replaceState(
              {},
              "",
              url.pathname + url.search + url.hash,
            );
          }
        })
        .catch(function () {
          window.location.assign(url.toString());
        });
    }

    dashboardElement.on(
      "click",
      ".sleep-timeline-card-root .timeline-day-link[data-timeline-nav]",
      function (event) {
        event.preventDefault();
        var dateValue = this.getAttribute("data-date");
        if (dateValue) {
          updateTimeline(dateValue);
        }
      },
    );

    dashboardElement.on(
      "change",
      ".sleep-timeline-card-root .timeline-date-input",
      function () {
        if (this.value) {
          updateTimeline(this.value);
        }
      },
    );
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
      bindSleepTimelineDynamic();
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

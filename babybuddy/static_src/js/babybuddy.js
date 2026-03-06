if (typeof jQuery === "undefined") {
  throw new Error("Baby Buddy requires jQuery.");
}

/**
 * Baby Buddy Namespace
 *
 * Default namespace for the Baby Buddy app.
 *
 * @type {{}}
 */
var BabyBuddy = (function () {
  return {};
})();

/**
 * Pull to refresh.
 *
 * @type {{init: BabyBuddy.PullToRefresh.init, onRefresh: BabyBuddy.PullToRefresh.onRefresh}}
 */
BabyBuddy.PullToRefresh = (function (ptr) {
  return {
    init: function () {
      ptr.init({
        mainElement: "body",
        onRefresh: this.onRefresh,
      });
    },

    onRefresh: function () {
      window.location.reload();
    },
  };
})(PullToRefresh);

/**
 * Fix for duplicate form submission from double pressing submit
 */
function preventDoubleSubmit() {
  return false;
}
$("form").off("submit", preventDoubleSubmit);
$("form").on("submit", function () {
  $(this).on("submit", preventDoubleSubmit);
});

BabyBuddy.RememberAdvancedToggle = function (ptr) {
  localStorage.setItem("advancedForm", event.newState);
};

(function toggleAdvancedFields() {
  window.addEventListener("load", function () {
    if (localStorage.getItem("advancedForm") !== "open") {
      return;
    }

    document.querySelectorAll(".advanced-fields").forEach(function (node) {
      node.open = true;
    });
  });
})();

(function appShellSidebarCollapse() {
  var collapseStorageKey = "appShellSidebarCollapsed";

  function applyCollapsedState(collapsed) {
    document.body.classList.toggle("app-sidebar-collapsed", collapsed);
    var toggleButton = document.getElementById("app-shell-collapse-toggle");
    if (toggleButton) {
      var label = collapsed
        ? toggleButton.dataset.labelCollapsed
        : toggleButton.dataset.labelExpanded;
      if (label) {
        toggleButton.setAttribute("aria-label", label);
        toggleButton.setAttribute("title", label);
      }
    }
  }

  window.addEventListener("load", function () {
    var toggleButton = document.getElementById("app-shell-collapse-toggle");
    if (!toggleButton || window.innerWidth < 768) {
      return;
    }

    document.querySelectorAll(".app-shell-nav .nav-link").forEach(function (link) {
      if (!link.getAttribute("title")) {
        link.setAttribute("title", link.textContent.trim());
      }
    });

    applyCollapsedState(localStorage.getItem(collapseStorageKey) === "1");

    toggleButton.addEventListener("click", function () {
      var collapsed = !document.body.classList.contains("app-sidebar-collapsed");
      applyCollapsedState(collapsed);
      localStorage.setItem(collapseStorageKey, collapsed ? "1" : "0");
    });
  });
})();

(() => {
  /** @returns {HTMLElement[]} All navigation tab buttons */
  function getButtons() {
    return Array.from(document.querySelectorAll("[data-tab]"));
  }

  /** @returns {HTMLElement[]} All screen/tab content panels */
  function getScreens() {
    return Array.from(document.querySelectorAll("[data-screen]"));
  }

  /**
   * Switch the active tab/screen.
   * @param {string} tabName - The data-tab/data-screen value to activate
   */
  function setActiveTab(tabName) {
    const screens = getScreens();
    const buttons = getButtons();

    screens.forEach((screen) => {
      const isMatch = screen.dataset.screen === tabName;
      screen.classList.toggle("active", isMatch);
    });

    buttons.forEach((button) => {
      const isMatch = button.dataset.tab === tabName;
      button.classList.toggle("active", isMatch);
      button.setAttribute("aria-selected", isMatch ? "true" : "false");
    });
  }

  /** Handle navigation button clicks; switches tab and triggers screen-specific init. */
  function onNavClick(event) {
    const button = event.currentTarget;
    if (!button) return;
    const tabName = button.dataset.tab;
    if (!tabName) return;
    setActiveTab(tabName);
    
    // Re-render on tab switch
    if (tabName === "mission" && window.Mission) {
      window.Mission.refresh();
    }
    
    // Initialize calendar on first view
    if (tabName === "calendar" && window.Calendar) {
      window.Calendar.init();
    }
    
    // Initialize documents on first view
    if (tabName === "documents" && window.Documents) {
      window.Documents.init();
    }
    
    // Initialize activity log
    if (tabName === "log" && window.ActivityLog) {
      window.ActivityLog.load();
    }
    
    // Initialize memory browser on first view
    if (tabName === "memory" && window.MemoryBrowser) {
      window.MemoryBrowser.init();
    }
  }

  /** Bind click handlers to all navigation buttons. */
  function bindNavEvents() {
    getButtons().forEach((button) => {
      button.addEventListener("click", onNavClick);
    });
  }

  /** Initialize the app: DB, navigation, Mission Control, ActivityLog, and Notifications. */
  async function init() {
    // Initialize database
    if (window.DB && typeof window.DB.init === "function") {
      try {
        await window.DB.init();
        console.log("✓ Database initialized");
      } catch (error) {
        console.error("Database init failed:", error);
      }
    }

    // Bind navigation
    bindNavEvents();

    // Initialize Mission Control (also initializes Convex)
    if (window.Mission) {
      await window.Mission.init();
    }

    // Initialize ActivityLog AFTER Mission.init() so Convex is ready
    if (window.ActivityLog && window.ActivityLog.init) {
      window.ActivityLog.init();
      console.log("✓ ActivityLog initialized (post-Convex)");
    }

    // Initialize Notifications
    if (window.Notifications) {
      window.Notifications.init();
      console.log("✓ Notifications initialized");
    }

    // Set initial tab
    setActiveTab("mission");
    
    console.log("✓ Abbe Command Center ready");
    console.log("📰 Newspaper editorial theme active");
  }

  window.App = {
    init,
    setActiveTab,
  };

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

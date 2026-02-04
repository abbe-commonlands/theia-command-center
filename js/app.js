(() => {
  function getButtons() {
    return Array.from(document.querySelectorAll("[data-tab]"));
  }

  function getScreens() {
    return Array.from(document.querySelectorAll("[data-screen]"));
  }

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
    
    // Initialize documents on first view
    if (tabName === "documents" && window.Documents) {
      window.Documents.init();
    }
    
    // Initialize activity log
    if (tabName === "log" && window.ActivityLog) {
      window.ActivityLog.load();
    }
    
    // Initialize 3D viz on first view
    if (tabName === "knowledge" && window.initEmbeddingViz) {
      window.initEmbeddingViz();
    }
  }

  function bindNavEvents() {
    getButtons().forEach((button) => {
      button.addEventListener("click", onNavClick);
    });
  }

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

    // Initialize Mission Control
    if (window.Mission) {
      window.Mission.init();
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

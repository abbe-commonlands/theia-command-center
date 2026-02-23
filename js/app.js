// ── Theia Engineering Command Center — App Bootstrap ────────────────────
// Handles: tab routing, Convex init, global DB proxy, connection status.

(function() {
  "use strict";

  // ── Convex project URL ────────────────────────────────────────────
  // Replace with your deployed Convex URL after `npx convex deploy`
  const CONVEX_URL = window.CONVEX_URL || "https://peaceful-frog-360.convex.cloud";

  // ── Simple subscription/query cache ──────────────────────────────
  // Wraps the Convex client with a consistent API used by all tab modules.
  // In production this uses the real Convex client. During dev without
  // a backend, falls back to mock data so the UI is explorable.
  window.DB = (function() {
    let client = null;
    const subs = new Map(); // key -> { unsubscribe, callbacks }

    function getClient() {
      if (client) return client;
      try {
        if (typeof window.ConvexClient !== "undefined") {
          client = new window.ConvexClient(CONVEX_URL);
        } else if (typeof window.convex !== "undefined") {
          client = window.convex;
        }
      } catch (e) {
        console.warn("[DB] Convex client init failed:", e.message);
      }
      return client;
    }

    function subscribe(queryName, args, callback) {
      const c = getClient();
      if (!c) { callback(getMockData(queryName)); return () => {}; }
      try {
        const key = queryName + JSON.stringify(args);
        if (!subs.has(key)) {
          const unsub = c.onUpdate(queryName.replace(":", "/"), args, data => {
            const cbs = subs.get(key)?.callbacks || [];
            cbs.forEach(cb => cb(data));
          });
          subs.set(key, { unsub, callbacks: [] });
        }
        subs.get(key).callbacks.push(callback);
        return () => {
          const entry = subs.get(key);
          if (entry) entry.callbacks = entry.callbacks.filter(cb => cb !== callback);
        };
      } catch (e) {
        console.warn("[DB] subscribe error:", e.message);
        callback(getMockData(queryName));
        return () => {};
      }
    }

    async function mutation(name, args) {
      const c = getClient();
      if (!c) { console.warn("[DB] No client — mutation skipped:", name); return null; }
      return c.mutation(name.replace(":", "/"), args);
    }

    async function query(name, args) {
      const c = getClient();
      if (!c) return getMockData(name);
      return c.query(name.replace(":", "/"), args);
    }

    // ── Mock data for offline exploration ──────────────────────────
    function getMockData(queryName) {
      if (queryName === "agents:list") return [
        { _id: "theia", name: "Theia", role: "Optical Design Lead", emoji: "🔭", status: "active", model: "claude-sonnet-4-6", contextPercent: 24, sessionKey: "agent:main:main" },
        { _id: "photon", name: "Photon", role: "Optimization & Patents", emoji: "⚡", status: "idle", model: "claude-sonnet-4-6", contextPercent: 0, sessionKey: "agent:photon:main" },
        { _id: "quark", name: "Quark", role: "Zemax Automation", emoji: "🔬", status: "idle", model: "gpt-5.3-codex", contextPercent: 0, sessionKey: "agent:quark:main" },
      ];
      if (queryName === "lensDesigns:list" || queryName === "lensDesigns:listActive") return [
        { _id: "d1", name: "DSL952 Wide-Angle M12", designForm: "retrofocus", mount: "M12", status: "optimizing", focalLength: 2.8, fNumber: 2.0, fovDeg: 120, sensorFormat: '1/2.9"', elementCount: 5, groupCount: 5, stopPosition: "front", patentClearance: "clear", currentMFValue: 0.0234, rmsSpotUm: 3.2, mtfAt100: 0.35, distortionPct: -8.2, createdAt: Date.now() - 864e5, updatedAt: Date.now() - 3600e3 },
        { _id: "d2", name: "CIL220 C-mount Telecentric", designForm: "telecentric", mount: "C-mount", status: "tolerance_analysis", focalLength: 25.0, fNumber: 5.6, fovDeg: 14, sensorFormat: '1"', elementCount: 6, groupCount: 5, stopPosition: "rear", patentClearance: "not_checked", currentMFValue: 0.0041, rmsSpotUm: 1.1, createdAt: Date.now() - 432e5, updatedAt: Date.now() - 86400e3 },
        { _id: "d3", name: "M8-F1.8-90", designForm: "double-gauss", mount: "M8", status: "concept", focalLength: 1.8, fNumber: 1.8, fovDeg: 90, sensorFormat: '1/4"', elementCount: 4, groupCount: 4, patentClearance: "not_checked", createdAt: Date.now() - 172e5, updatedAt: Date.now() - 172e5 },
      ];
      if (queryName === "tasks:list") return [];
      if (queryName === "activities:list") return [];
      if (queryName === "patents:list") return [
        { _id: "p1", patentNumber: "US9500827B2", title: "Wide-angle lens system and image pickup apparatus", assignee: "Canon", cpcClass: "G02B13/04", filingDate: new Date("2013-01-15").getTime(), expiryDate: new Date("2033-01-15").getTime(), designForm: "retrofocus", relevance: "adjacent", addedBy: "photon", addedAt: Date.now() - 864e5, summary: "Covers wide-angle retrofocus designs with negative front group. Review claims 1-4 for overlap." },
        { _id: "p2", patentNumber: "US7463431B2", title: "Fisheye lens and image capturing apparatus", assignee: "Nikon", cpcClass: "G02B13/06", filingDate: new Date("2006-03-22").getTime(), expiryDate: new Date("2026-03-22").getTime(), designForm: "fisheye", relevance: "expired", addedBy: "photon", addedAt: Date.now() - 432e5 },
      ];
      if (queryName === "patents:coverageByForm") return [
        { form: "retrofocus", status: "risk", patentCount: 1 },
        { form: "telecentric", status: "unknown", patentCount: 0 },
        { form: "double-gauss", status: "unknown", patentCount: 0 },
      ];
      if (queryName === "optimizationRuns:list") return [
        { _id: "r1", designId: "d1", designName: "DSL952 Wide-Angle M12", runBy: "photon", runByName: "Photon", startedAt: Date.now() - 3600e3, endedAt: Date.now() - 1800e3, durationMs: 1800e3, status: "converged", algorithm: "DLS", meritFunction: "RMS spot + distortion", mfValueBefore: 0.0312, mfValueAfter: 0.0234, mfImprovement: 25.0, rmsSpotBefore: 4.8, rmsSpotAfter: 3.2, iterationsCount: 147, outputSummary: "Good convergence on the wide-angle zone. Stop position adjusted." },
        { _id: "r2", designId: "d2", designName: "CIL220 C-mount Telecentric", runBy: "quark", runByName: "Quark", startedAt: Date.now() - 86400e3, endedAt: Date.now() - 82800e3, durationMs: 3600e3, status: "converged", algorithm: "OD", mfValueBefore: 0.0089, mfValueAfter: 0.0041, mfImprovement: 54.0, rmsSpotAfter: 1.1, iterationsCount: 312 },
      ];
      if (queryName === "toleranceAnalyses:latestPerDesign") return [
        { _id: "t1", designId: "d2", designName: "CIL220 C-mount Telecentric", runBy: "quark", runByName: "Quark", runAt: Date.now() - 86400e3, status: "complete", yieldPercent: 92, rssRmsSpotUm: 1.8, mfgRisk: "medium", worstCaseSensitivity: "Element 3 tilt (±0.05°)", recommendation: "Tighten element 3 tilt to ±0.03° or redesign for lower sensitivity. Current yield acceptable for prototype.", criticalTolerances: [
          { parameter: "Element 3 tilt", nominalValue: 0, tolerancePlus: 0.05, toleranceMinus: 0.05, sensitivity: 0.012, riskLevel: "high" },
          { parameter: "R4 radius", nominalValue: -42.3, tolerancePlus: 0.05, toleranceMinus: 0.05, sensitivity: 0.004, riskLevel: "medium" },
          { parameter: "Element 2 center thickness", nominalValue: 3.2, tolerancePlus: 0.05, toleranceMinus: 0.05, sensitivity: 0.002, riskLevel: "low" },
        ]},
      ];
      if (queryName === "memories:list") return [];
      if (queryName === "notifications:list") return [];
      if (queryName === "sessionHistory:listByAgent") return [];
      return [];
    }

    return { subscribe, mutation, query };
  })();

  // ── Connection status display ─────────────────────────────────────
  function setConnectionStatus(state) {
    const dot  = document.querySelector(".status-dot");
    const text = document.querySelector(".status-text");
    if (!dot || !text) return;
    const states = {
      connecting: { cls: "",          label: "Connecting…" },
      connected:  { cls: "connected", label: "Live" },
      offline:    { cls: "",          label: "Offline (mock data)" },
      error:      { cls: "error",     label: "Connection error" },
    };
    const s = states[state] || states.connecting;
    dot.className = "status-dot " + s.cls;
    text.textContent = s.label;
  }

  setConnectionStatus("connecting");
  // Convex will call onUpdate rapidly once connected; treat first callback as connected
  setTimeout(() => setConnectionStatus("offline"), 3000); // fallback to offline if no Convex

  // ── Tab routing ───────────────────────────────────────────────────
  const tabInits = {
    "lens-library":    () => window.initLensLibrary?.(),
    "patent-map":      () => window.initPatentMap?.(),
    "optimization-log":() => window.initOptimizationLog?.(),
    "tolerance-tracker":() => window.initToleranceTracker?.(),
    "documents":       () => window.initDocuments?.(),
    "memory":          () => window.initMemoryBrowser?.(),
    "log":             () => window.initActivityLog?.(),
  };
  const initialised = new Set();

  function activateTab(tabName) {
    document.querySelectorAll(".nav-tab").forEach(btn => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active);
    });
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.toggle("active", screen.dataset.screen === tabName);
    });
    // Lazy-init each tab on first visit
    if (!initialised.has(tabName)) {
      initialised.add(tabName);
      tabInits[tabName]?.();
    }
  }

  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Global helper for cross-tab navigation (used in lens-library detail)
  window.switchToTab = activateTab;

  // ── Initialize mission control immediately (default tab) ──────────
  window.addEventListener("DOMContentLoaded", () => {
    activateTab("mission");
    // Also pre-subscribe for sidebar active designs (loaded regardless of tab)
    window.DB.subscribe("lensDesigns:listActive", {}, () => {});
  });

  // ── Global modal helpers ──────────────────────────────────────────
  // Close modals on Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(m => m.classList.add("hidden"));
      document.querySelectorAll(".task-detail-panel, .design-detail-panel, .patent-detail")
        .forEach(p => p.classList.add("hidden"));
    }
  });

})();

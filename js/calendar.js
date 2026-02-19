/**
 * Calendar View — Week grid for scheduled events, cron jobs, and heartbeats.
 * Vanilla JS, no external dependencies.
 */
(() => {
  const TYPE_COLORS = {
    cron: { bg: "var(--accent-cyan)", text: "#fff", label: "⚙️ Cron" },
    task: { bg: "var(--accent-amber)", text: "#1a1a1a", label: "📋 Task" },
    heartbeat: { bg: "#4a4a5a", text: "#ccc", label: "💓 Heartbeat" },
  };

  // Days of the week for the header
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let allEvents = [];
  let weekOffset = 0; // 0 = current week, -1 = last week, etc.
  let selectedEvent = null;

  /** Get the Monday of the current week (or offset week). */
  function getWeekStart(offset = 0) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff + offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /** Format a date as "Mon Jan 20" */
  function fmtDay(date) {
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  /** Format a timestamp as "HH:MM" */
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  /**
   * Expand a cron expression into occurrences within a date range.
   * Supports simple interval expressions and common cron patterns.
   */
  function cronOccurrences(schedule, scheduleKind, start, end) {
    const times = [];
    if (scheduleKind === "at") {
      const t = new Date(schedule).getTime();
      if (t >= start && t < end) times.push(t);
      return times;
    }

    if (scheduleKind === "every") {
      // Format: "30m", "1h", "2h30m", etc.
      const match = schedule.match(/(?:(\d+)h)?(?:(\d+)m)?/);
      const h = parseInt(match?.[1] || 0);
      const m = parseInt(match?.[2] || 0);
      const intervalMs = (h * 60 + m) * 60000;
      if (!intervalMs) return times;
      let t = start;
      while (t < end) { times.push(t); t += intervalMs; }
      return times;
    }

    // Basic cron parsing: minute hour dom month dow
    try {
      const parts = schedule.trim().split(/\s+/);
      if (parts.length < 5) return times;
      const [minPart, hourPart] = parts;
      const parseField = (f, max) => {
        if (f === "*") return Array.from({ length: max }, (_, i) => i);
        if (f.includes(",")) return f.split(",").map(Number);
        if (f.includes("/")) {
          const [, step] = f.split("/");
          const s = parseInt(step);
          return Array.from({ length: Math.ceil(max / s) }, (_, i) => i * s).filter(x => x < max);
        }
        return [parseInt(f)];
      };
      const mins = parseField(minPart, 60);
      const hours = parseField(hourPart, 24);
      const cur = new Date(start);
      cur.setSeconds(0, 0);
      while (cur.getTime() < end) {
        if (hours.includes(cur.getHours()) && mins.includes(cur.getMinutes())) {
          times.push(cur.getTime());
        }
        cur.setMinutes(cur.getMinutes() + 1);
        if (times.length > 200) break; // Safety cap
      }
    } catch (_) { /* ignore parse errors */ }
    return times;
  }

  /** Build the full HTML for the week calendar. */
  function buildCalendarHTML(weekStart) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const startMs = weekStart.getTime();
    const endMs = weekEnd.getTime();
    const totalMs = endMs - startMs;

    // Headers
    const headerCells = days.map(d => {
      const isToday = new Date().toDateString() === d.toDateString();
      return `<div class="cal-header-cell ${isToday ? "cal-today" : ""}">${fmtDay(d)}</div>`;
    }).join("");

    // Expand events into occurrences per column
    const columns = days.map(() => []);
    allEvents.forEach(ev => {
      const occ = cronOccurrences(ev.schedule, ev.scheduleKind, startMs, endMs);
      occ.forEach(ts => {
        const dayIdx = Math.floor((ts - startMs) / 86400000);
        if (dayIdx >= 0 && dayIdx < 7) {
          columns[dayIdx].push({ ...ev, occurrenceAt: ts });
        }
      });
    });

    // Build grid cells
    const gridCells = columns.map((evs, dayIdx) => {
      const isToday = new Date().toDateString() === days[dayIdx].toDateString();
      const eventBlocks = evs
        .sort((a, b) => a.occurrenceAt - b.occurrenceAt)
        .map(ev => {
          const c = TYPE_COLORS[ev.type] || TYPE_COLORS.cron;
          const time = fmtTime(ev.occurrenceAt);
          const lastRun = ev.lastRunAt
            ? `<span class="cal-event-result ${ev.lastRunResult === "success" ? "success" : ev.lastRunResult === "failure" ? "failure" : ""}">` +
              `${ev.lastRunResult === "success" ? "✓" : ev.lastRunResult === "failure" ? "✗" : "·"}</span>`
            : "";
          return `<div class="cal-event" 
              style="background:${c.bg};color:${c.text};"
              data-event-id="${ev._id}"
              title="${ev.name} @ ${time}">
            <span class="cal-event-time">${time}</span>
            <span class="cal-event-name">${ev.name}</span>
            ${lastRun}
          </div>`;
        }).join("");
      return `<div class="cal-grid-cell ${isToday ? "cal-today-col" : ""}">
        ${evs.length === 0 ? '<div class="cal-empty-day">–</div>' : eventBlocks}
      </div>`;
    }).join("");

    // Run history bar
    const runHistory = allEvents.length > 0
      ? buildRunHistoryBar()
      : '<div style="color:var(--text-muted);font-size:12px;padding:8px;">No events registered</div>';

    return `
      <div class="cal-header-row">
        ${headerCells}
      </div>
      <div class="cal-grid-row">
        ${gridCells}
      </div>
      ${runHistory}
    `;
  }

  /** Build a "last 24h run history" bar for all events. */
  function buildRunHistoryBar() {
    if (allEvents.length === 0) return "";
    const rows = allEvents.map(ev => {
      const c = TYPE_COLORS[ev.type] || TYPE_COLORS.cron;
      const dot = ev.lastRunResult === "success" ? "🟢"
                : ev.lastRunResult === "failure" ? "🔴"
                : "⚪";
      const lastRun = ev.lastRunAt ? fmtTime(ev.lastRunAt) : "never";
      const nextRun = ev.nextRunAt ? fmtTime(ev.nextRunAt) : "—";
      return `<div class="cal-run-row">
        <span class="cal-run-dot">${dot}</span>
        <span class="cal-run-type" style="color:${c.bg};">${c.label}</span>
        <span class="cal-run-name">${ev.name}</span>
        ${ev.agentName ? `<span class="cal-run-agent">${ev.agentName}</span>` : ''}
        <span class="cal-run-last">Last: ${lastRun}</span>
        <span class="cal-run-next">Next: ${nextRun}</span>
      </div>`;
    }).join("");
    return `<div class="cal-run-history">
      <div class="cal-run-history-title">📊 Job Status</div>
      ${rows}
    </div>`;
  }

  /** Render the calendar into #calendar-grid. */
  function render() {
    const grid = document.getElementById("calendar-grid");
    const weekLabel = document.getElementById("cal-week-label");
    if (!grid) return;

    const weekStart = getWeekStart(weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (weekLabel) {
      weekLabel.textContent =
        weekStart.toLocaleDateString([], { month: "long", day: "numeric" }) +
        " – " +
        weekEnd.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    }

    grid.innerHTML = buildCalendarHTML(weekStart);

    // Attach click listeners to events
    grid.querySelectorAll(".cal-event").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.eventId;
        const ev = allEvents.find(e => e._id === id);
        if (ev) showEventDetail(ev);
      });
    });
  }

  /** Show a detail panel for a clicked event. */
  function showEventDetail(ev) {
    selectedEvent = ev;
    const panel = document.getElementById("cal-detail-panel");
    if (!panel) return;
    const c = TYPE_COLORS[ev.type] || TYPE_COLORS.cron;
    panel.innerHTML = `
      <div class="cal-detail-header" style="border-left:3px solid ${c.bg};padding-left:8px;">
        <div class="cal-detail-name">${ev.name}</div>
        <div class="cal-detail-type" style="color:${c.bg};">${c.label}</div>
      </div>
      <div class="cal-detail-body">
        <div class="cal-detail-row"><span>Schedule</span><code>${ev.schedule}</code></div>
        <div class="cal-detail-row"><span>Kind</span><span>${ev.scheduleKind}</span></div>
        ${ev.agentName ? `<div class="cal-detail-row"><span>Agent</span><span>${ev.agentName}</span></div>` : ""}
        <div class="cal-detail-row"><span>Enabled</span><span>${ev.enabled ? "✅ Yes" : "❌ No"}</span></div>
        <div class="cal-detail-row"><span>Last Run</span><span>${ev.lastRunAt ? new Date(ev.lastRunAt).toLocaleString() : "Never"}</span></div>
        <div class="cal-detail-row"><span>Last Result</span><span>${ev.lastRunResult || "—"}</span></div>
        ${ev.lastRunDurationMs ? `<div class="cal-detail-row"><span>Duration</span><span>${ev.lastRunDurationMs}ms</span></div>` : ""}
        <div class="cal-detail-row"><span>Next Run</span><span>${ev.nextRunAt ? new Date(ev.nextRunAt).toLocaleString() : "—"}</span></div>
      </div>
    `;
    panel.style.display = "block";
  }

  /** Load events from Convex and render. */
  async function load() {
    try {
      if (window.Convex) {
        allEvents = await window.Convex.query("scheduledEvents:list", {});
      } else {
        allEvents = [];
      }
    } catch (e) {
      console.warn("Calendar: could not load events:", e);
      allEvents = [];
    }
    render();
  }

  /** Initialize the calendar tab. */
  function init() {
    // Wire up prev/next week buttons
    const prevBtn = document.getElementById("cal-prev-week");
    const nextBtn = document.getElementById("cal-next-week");
    const todayBtn = document.getElementById("cal-today-btn");
    const refreshBtn = document.getElementById("cal-refresh-btn");

    if (prevBtn) prevBtn.addEventListener("click", () => { weekOffset--; render(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { weekOffset++; render(); });
    if (todayBtn) todayBtn.addEventListener("click", () => { weekOffset = 0; render(); });
    if (refreshBtn) refreshBtn.addEventListener("click", load);

    load();
  }

  window.Calendar = { init, load, render };
})();

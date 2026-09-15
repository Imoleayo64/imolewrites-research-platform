/* ============================================================
   ImoleWrites — Dashboard page logic
   Real greeting, real stat cards, real writing-activity chart,
   and real recent projects — all from actual backend data.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.API) return;

    try {
      const [user, projects, overview] = await Promise.all([
        window.API.me(),
        window.API.listProjects(),
        window.API.analyticsOverview(7),
      ]);

      renderGreeting(user, projects);
      renderStats(projects, overview);
      renderChart(overview.activity_over_time || []);
      renderRecentProjects(projects);
    } catch (err) {
      console.error("Dashboard load failed:", err);
      setText("dashSubtext", "Couldn't load your dashboard. Is the backend running?");
    }
  });

  function renderGreeting(user, projects) {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = (user.name || "").split(" ")[0] || "there";
    setText("dashGreeting", `${timeGreeting}, ${firstName} 👋`);

    const active = projects.filter((p) => p.status !== "published").length;
    setText("dashSubtext", `You have ${active} active project${active === 1 ? "" : "s"}. Let's make progress.`);
  }

  function renderStats(projects, overview) {
    const totalWords = projects.reduce((sum, p) => sum + (p.word_count || 0), 0);
    setText("dashProjectCount", projects.length.toLocaleString());
    setText("dashWordCount", totalWords.toLocaleString());
    setText("dashCitationCount", (overview.totals?.citations_count ?? 0).toLocaleString());
    setText("dashAiCount", (overview.totals?.ai_interactions ?? 0).toLocaleString());
  }

  function renderChart(daily) {
    const el = document.getElementById("progressChart");
    const emptyEl = document.getElementById("progressChartEmpty");
    if (!el || !window.Charts) return;

    const hasActivity = daily.some((d) => d.writes > 0 || d.citations > 0);
    if (!hasActivity) {
      el.style.display = "none";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    window.Charts.line(el, {
      labels: daily.map((d) => new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })),
      series: [
        { values: daily.map((d) => d.writes), color: "#2563eb", fill: true },
        { values: daily.map((d) => d.citations), color: "#14b8a6", fill: false },
      ],
    }, {});
  }

  function renderRecentProjects(projects) {
    const el = document.getElementById("dashRecentProjects");
    if (!el) return;

    if (!projects.length) {
      el.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">No projects yet — create your first workspace above.</p>`;
      return;
    }

    const recent = projects.slice().sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)).slice(0, 3);
    const tiles = ["bg-blue", "bg-teal", "bg-purple"];

    el.innerHTML = recent
      .map((p, i) => {
        const words = (p.word_count || 0).toLocaleString();
        const status = (p.status || "draft").replace("_", " ");
        return `
        <a class="list-row" href="workspace.html?id=${p.id}" style="cursor:pointer;">
          <span class="icon-tile xs ${tiles[i % tiles.length]}" style="width:36px;height:36px;border-radius:9px;"><span data-icon="fileText"></span></span>
          <div class="meta"><div class="title">${escapeHtml(p.title)}</div><div class="sub">${words} words · ${escapeHtml(cap(status))}</div></div>
        </a>`;
      })
      .join("");
    if (window.Icon && window.Icon.fill) window.Icon.fill(document);
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
})();

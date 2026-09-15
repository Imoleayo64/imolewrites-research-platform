/* ============================================================
   ImoleWrites — Analytics page logic
   Wires stat cards and charts to real data from /analytics/overview:
   real word counts, real usage-event counts, real project statuses.
   No fabricated percentages, hours, or trend arrows.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API || !window.Charts) return;

    const periodSelect = document.getElementById("periodSelect");
    const exportBtn = document.getElementById("exportAnalyticsBtn");

    let lastData = null;

    periodSelect.addEventListener("change", () => load());
    exportBtn.addEventListener("click", () => exportData());

    load();

    async function load() {
      try {
        const days = parseInt(periodSelect.value, 10);
        const data = await window.API.analyticsOverview(days);
        lastData = data;
        render(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    }

    function render(data) {
      const t = data.totals || {};
      setText("statTotalWords", (t.total_words || 0).toLocaleString());
      setText("statPapersSearched", (t.papers_searched || 0).toLocaleString());
      setText("statAiInteractions", (t.ai_interactions || 0).toLocaleString());
      setText("statPublications", (t.publications || 0).toLocaleString());

      renderWritingChart(data.activity_over_time || []);
      renderDonut(data.activity_by_type || {});
      renderAiBar(data.ai_usage_by_feature || []);
      renderPublications(data.publication_tracking || []);
    }

    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function renderWritingChart(daily) {
      const el = document.getElementById("writingChart");
      if (!el) return;

      // Aggregate to weekly buckets once the range gets long, so the chart stays readable.
      const points = daily.length > 60 ? aggregateWeekly(daily) : daily;

      const labels = points.map((p) => formatLabel(p.date));
      const writes = points.map((p) => p.writes);
      const citations = points.map((p) => p.citations);

      if (!writes.some((v) => v > 0) && !citations.some((v) => v > 0)) {
        el.innerHTML = `<div class="flex items-center justify-center text-muted" style="height:100%;font-size:var(--fs-sm);">No activity yet in this period — start writing or adding citations to see your trend.</div>`;
        return;
      }

      window.Charts.line(el, {
        labels,
        series: [
          { values: writes, color: "#2563eb", fill: true },
          { values: citations, color: "#14b8a6", fill: false },
        ],
      });
    }

    function aggregateWeekly(daily) {
      const weeks = [];
      for (let i = 0; i < daily.length; i += 7) {
        const chunk = daily.slice(i, i + 7);
        weeks.push({
          date: chunk[0].date,
          writes: chunk.reduce((s, d) => s + d.writes, 0),
          citations: chunk.reduce((s, d) => s + d.citations, 0),
        });
      }
      return weeks;
    }

    function formatLabel(dateStr) {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    function renderDonut(byType) {
      const el = document.getElementById("timeDonut");
      const legend = document.getElementById("activityLegend");
      if (!el || !legend) return;

      const entries = [
        { key: "writing", label: "Writing", color: "#2563eb" },
        { key: "ai_assistant", label: "AI assistant", color: "#7c3aed" },
        { key: "citations", label: "Citations", color: "#f59e0b" },
        { key: "paper_search", label: "Paper search", color: "#14b8a6" },
      ];
      const values = entries.map((e) => byType[e.key] || 0);
      const total = values.reduce((a, b) => a + b, 0);

      if (total === 0) {
        el.innerHTML = `<div class="flex items-center justify-center text-muted" style="height:100%;font-size:var(--fs-sm);">No activity yet</div>`;
        legend.innerHTML = "";
        return;
      }

      window.Charts.donut(
        el,
        { values, colors: entries.map((e) => e.color) },
        { center: { value: String(total), label: "actions" } }
      );

      legend.innerHTML = entries
        .map((e, i) => {
          const pct = total ? Math.round((values[i] / total) * 100) : 0;
          return `<div class="flex items-center gap-2" style="font-size:var(--fs-sm);"><span style="width:10px;height:10px;border-radius:50%;background:${e.color};"></span> ${e.label} <span class="text-muted" style="margin-left:auto;">${values[i]} (${pct}%)</span></div>`;
        })
        .join("");
    }

    function renderAiBar(byFeature) {
      const el = document.getElementById("aiBarChart");
      if (!el) return;

      if (!byFeature.length) {
        el.innerHTML = `<div class="flex items-center justify-center text-muted" style="height:100%;font-size:var(--fs-sm);">No AI feature usage yet — try the AI Assistant, Humanizer, or Journal Match.</div>`;
        return;
      }

      window.Charts.bar(el, {
        labels: byFeature.map((f) => f.label),
        series: [{ values: byFeature.map((f) => f.count), color: "#7c3aed" }],
      });
    }

    function renderPublications(list) {
      const el = document.getElementById("pubTracking");
      if (!el) return;

      if (!list.length) {
        el.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">No projects marked beyond draft status yet.</p>`;
        return;
      }

      const badgeMap = {
        submitted: "badge-blue",
        in_review: "badge-amber",
        revisions: "badge-purple",
        published: "badge-green",
      };
      const labelMap = {
        submitted: "Submitted",
        in_review: "In review",
        revisions: "Revisions",
        published: "Published",
      };

      el.innerHTML = list
        .map((p) => {
          const badgeClass = badgeMap[p.status] || "badge-blue";
          const label = labelMap[p.status] || p.status;
          const date = p.updated_at ? new Date(p.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
          const sub = [p.journal, date].filter(Boolean).join(" · ");
          return `<div class="list-row"><span class="badge ${badgeClass}">${escapeHtml(label)}</span><div class="meta"><div class="title">${escapeHtml(p.title)}</div><div class="sub">${escapeHtml(sub)}</div></div></div>`;
        })
        .join("");
    }

    function exportData() {
      if (!lastData) return;
      const blob = new Blob([JSON.stringify(lastData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "imolewrites-analytics.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

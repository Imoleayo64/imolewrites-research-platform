/* ============================================================
   ImoleWrites — Journal Recommendation page logic
   Wires the "Find journals" button + preference chips to
   API.recommendJournals(), which returns real journal names,
   publishers, and scope-fit rationale (no fabricated stats).
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const abstractEl = document.getElementById("abstract");
    const prefGroup = document.getElementById("prefGroup");
    const recBtn = document.getElementById("recBtn");
    const resultsEl = document.getElementById("journalResults");
    const resultFilters = document.getElementById("journalResultFilters");

    if (!recBtn) return;

    let lastJournals = [];
    let oaOnly = false;

    resultFilters.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      resultFilters.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      oaOnly = chip.dataset.oaFilter === "oa";
      renderResults(lastJournals);
    });

    prefGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("active");
    });

    recBtn.addEventListener("click", async () => {
      const abstract = abstractEl.value.trim();
      if (!abstract) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Paste an abstract first", "alert", "Journal Recommendation");
        return;
      }
      const preferences = Array.from(prefGroup.querySelectorAll(".chip.active")).map((c) => c.dataset.pref);

      const oldLabel = recBtn.innerHTML;
      recBtn.disabled = true;
      recBtn.innerHTML = '<span class="spinner"></span> Matching...';
      resultsEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Finding journals that fit your abstract…</p>`;

      try {
        const data = await window.API.recommendJournals(abstract, preferences);
        lastJournals = data.journals || [];
        resultFilters.style.display = lastJournals.length ? "flex" : "none";
        renderResults(lastJournals);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Found journal matches", "check", "Done");
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail
          ? err.body.detail
          : "Couldn't get journal recommendations right now. Please try again.";
        resultsEl.innerHTML = `<div class="card card-pad-lg text-center text-muted">${escapeHtml(msg)}</div>`;
      } finally {
        recBtn.disabled = false;
        recBtn.innerHTML = oldLabel;
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      }
    });

    function renderResults(journals) {
      const filtered = oaOnly ? journals.filter((j) => j.open_access) : journals;

      if (!filtered.length) {
        resultsEl.innerHTML = journals.length
          ? `<div class="card card-pad-lg text-center text-muted">None of these matches are open access — try "All results" or refine your abstract.</div>`
          : `<div class="card card-pad-lg text-center text-muted">No matches found — try refining your abstract.</div>`;
        return;
      }

      const tiles = ["bg-blue", "bg-teal", "bg-purple", "bg-amber", "bg-green"];

      resultsEl.innerHTML = filtered
        .map((j, i) => {
          const badge = i === 0 ? '<span class="badge badge-green">Best match</span>' : "";
          const oaBadge = j.open_access ? '<span class="badge badge-blue">Open access</span>' : "";
          const metaParts = [j.publisher, j.frequency].filter(Boolean).join(" · ");

          return `
          <article class="card card-pad card-hover">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex gap-4" style="flex:1;min-width:240px;">
                <span class="icon-tile ${tiles[i % tiles.length]}"><span data-icon="book"></span></span>
                <div>
                  <div class="flex items-center gap-2"><h4 style="margin:0;">${escapeHtml(j.name)}</h4>${badge}${oaBadge}</div>
                  <p class="text-muted" style="font-size:var(--fs-sm);margin-top:4px;">${escapeHtml(metaParts)}</p>
                  <p style="font-size:var(--fs-sm);margin-top:10px;">${escapeHtml(j.scope_fit)}</p>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <button class="btn btn-primary btn-sm" data-modal-open="checklistModal"><span data-icon="checkCircle"></span> Checklist</button>
                <a class="btn btn-secondary btn-sm" href="https://www.google.com/search?q=${encodeURIComponent(j.name + " journal submission guidelines")}" target="_blank" rel="noopener"><span data-icon="external"></span> Visit</a>
              </div>
            </div>
          </article>`;
        })
        .join("");

      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

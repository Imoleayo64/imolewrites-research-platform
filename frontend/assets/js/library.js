/* ============================================================
   ImoleWrites — Reference Library page logic
   Renders the user's real saved citations (from listCitations)
   as a browsable, searchable grid. Collections/tags aren't a
   real system yet, so this shows one flat "All references" list.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const searchInput = document.getElementById("librarySearch");
    const gridEl = document.getElementById("libraryGrid");
    const summaryEl = document.getElementById("librarySummary");
    const countEl = document.getElementById("libraryCount");

    let citations = [];

    load();

    searchInput.addEventListener("input", () => render());

    async function load() {
      try {
        citations = await window.API.listCitations();
        render();
      } catch (err) {
        console.error(err);
        gridEl.innerHTML = `<p class="text-muted">Couldn't load your library. Please try again.</p>`;
      }
    }

    function render() {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = q
        ? citations.filter((c) => {
            const authorNames = (c.authors || []).map((a) => `${a.given} ${a.family}`).join(" ").toLowerCase();
            return c.title.toLowerCase().includes(q) || authorNames.includes(q) || (c.venue || "").toLowerCase().includes(q);
          })
        : citations;

      countEl.textContent = citations.length;
      summaryEl.textContent = `${citations.length} source${citations.length === 1 ? "" : "s"}${q ? ` · ${filtered.length} matching "${searchInput.value.trim()}"` : ""}`;

      if (!filtered.length) {
        gridEl.innerHTML = citations.length
          ? `<p class="text-muted">No references match your search.</p>`
          : `<div class="card card-pad-lg text-center text-muted">No references yet. <a href="citations.html">Add one from the Citation Manager</a> or search the Literature tool and save results.</div>`;
        return;
      }

      const tiles = ["bg-blue", "bg-teal", "bg-purple", "bg-amber", "bg-rose", "bg-green"];
      gridEl.innerHTML = filtered
        .map((c, i) => {
          const authors = (c.authors || []).slice(0, 3).map((a) => a.family || a.given).filter(Boolean).join(", ");
          const meta = [authors, c.year, c.venue].filter(Boolean).join(" · ");
          return `
          <article class="card card-pad card-hover">
            <div class="flex items-start justify-between gap-2" style="margin-bottom:10px;">
              <span class="icon-tile sm ${tiles[i % tiles.length]}"><span data-icon="book"></span></span>
              ${c.doi ? `<a class="icon-btn" style="width:32px;height:32px;" href="https://doi.org/${encodeURIComponent(c.doi)}" target="_blank" rel="noopener" title="View"><span data-icon="external"></span></a>` : ""}
            </div>
            <h4 style="font-size:var(--fs-md);line-height:1.35;margin-bottom:4px;">${escapeHtml(c.title)}</h4>
            <div class="text-muted" style="font-size:var(--fs-sm);">${escapeHtml(meta || "No metadata")}</div>
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

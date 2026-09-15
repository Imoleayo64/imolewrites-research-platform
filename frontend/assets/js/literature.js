/* ============================================================
   ImoleWrites — Literature Search page logic
   Wires the search bar, year range, result count, sort, citation
   style, filters, and export controls to the real /papers backend
   (CrossRef). Each result comes back with real APA/MLA/Chicago/
   Harvard/IEEE/Vancouver formatting + BibTeX (same logic as the
   Citation Manager), so exports are genuinely correct per style.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("litSearchForm");
    const queryInput = document.getElementById("litQuery");
    const searchBtn = document.getElementById("litSearchBtn");
    const filterGroup = document.getElementById("litFilters");
    const sortSelect = document.getElementById("litSort");
    const styleSelect = document.getElementById("litStyle");
    const yearFromInput = document.getElementById("litYearFrom");
    const yearToInput = document.getElementById("litYearTo");
    const limitInput = document.getElementById("litLimit");
    const applyBtn = document.getElementById("litApplyBtn");
    const summaryEl = document.getElementById("litResultsSummary");
    const resultsEl = document.getElementById("litResults");

    if (!form || !window.API) return;

    let activeFilter = "all";
    let lastResults = [];

    resultsEl.addEventListener("click", async (e) => {
      const removeBtn = e.target.closest("[data-remove-paper]");
      if (removeBtn) {
        const idx = Number(removeBtn.dataset.removePaper);
        lastResults.splice(idx, 1);
        renderResults(lastResults, lastResults.length);
        return;
      }

      const saveBtn = e.target.closest("[data-save-paper]");
      if (saveBtn) {
        const idx = Number(saveBtn.dataset.savePaper);
        const p = lastResults[idx];
        if (!p) return;
        saveBtn.disabled = true;
        try {
          await window.API.createCitation({
            doi: p.doi,
            title: p.title,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
            volume: p.volume,
            issue: p.issue,
            pages: p.pages,
            url: p.url,
            type: "journal-article",
          });
          saveBtn.classList.add("saved");
          saveBtn.title = "Saved to library";
          if (window.IW && window.IW.Toast) window.IW.Toast.show("Saved to your Citation Manager", "check", "Literature Search");
        } catch (err) {
          console.error(err);
          saveBtn.disabled = false;
          if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't save this paper", "alert", "Literature Search");
        }
      }
    });

    filterGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      filterGroup.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter || "all";
      runSearch();
    });

    sortSelect.addEventListener("change", () => runSearch());
    applyBtn.addEventListener("click", () => runSearch());
    styleSelect.addEventListener("change", () => {
      document.querySelectorAll(".litStyleLabel").forEach((el) => (el.textContent = styleSelect.value));
      renderResults(lastResults, lastResults.length);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch();
    });

    async function runSearch() {
      const query = queryInput.value.trim();
      if (!query) return;

      setLoading(true);

      const opts = {};
      const limit = parseInt(limitInput.value, 10);
      opts.limit = Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 20;

      const yearFrom = parseInt(yearFromInput.value, 10);
      if (Number.isFinite(yearFrom)) opts.year_from = yearFrom;
      const yearTo = parseInt(yearToInput.value, 10);
      if (Number.isFinite(yearTo)) opts.year_to = yearTo;

      if (activeFilter === "open_access") opts.open_access = true;

      try {
        const controller = new AbortController();
        const hardTimeout = setTimeout(() => controller.abort(), 10000);
        // Belt-and-suspenders: race the real request against a plain timer too,
        // so the UI always recovers even in the rare case an aborted fetch
        // doesn't reject promptly.
        const data = await Promise.race([
          window.API.searchPapers(query, opts, controller.signal),
          new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("client_timeout"), { status: "timeout" })), 11000)),
        ]);
        clearTimeout(hardTimeout);
        console.log("Literature search response:", data);
        let results = data.results || [];

        if (activeFilter === "review") {
          results = results.filter((p) => /review/i.test(p.type || ""));
        }
        if (activeFilter === "cited") {
          results = results.filter((p) => (p.citation_count || 0) >= 50);
        }

        const sort = sortSelect.value;
        if (sort === "newest") {
          results = results.slice().sort((a, b) => (b.year || 0) - (a.year || 0));
        } else if (sort === "cited") {
          results = results.slice().sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
        }

        renderResults(results, data.total);
      } catch (err) {
        console.error("Literature search failed:", err);
        if (err && err.name === "AbortError") err.status = "timeout";
        renderError(err);
      } finally {
        setLoading(false);
      }
    }

    function setLoading(isLoading) {
      searchBtn.disabled = isLoading;
      searchBtn.innerHTML = isLoading
        ? "Searching…"
        : 'Search <span data-icon="arrowRight"></span>';
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      if (isLoading) {
        summaryEl.textContent = "Searching…";
        resultsEl.innerHTML = "";
      }
    }

    function renderError(err) {
      let message = "Couldn't reach the literature search service right now. Please try again.";
      if (err && err.status === 401) message = "Please log in again to search the literature database.";
      if (err && err.status === "timeout") message = "The search took too long and timed out. Try again in a moment.";
      summaryEl.textContent = "";
      resultsEl.innerHTML = `<div class="card card-pad-lg text-center text-muted">${escapeHtml(message)}</div>`;
    }

    function renderResults(results, total) {
      lastResults = results;
      const exportBar = document.getElementById("litExportBar");
      if (!results.length) {
        summaryEl.textContent = "No results found.";
        resultsEl.innerHTML = `<div class="card card-pad-lg text-center text-muted">No papers matched your search. Try different keywords, a wider year range, or fewer filters.</div>`;
        if (exportBar) exportBar.style.display = "none";
        return;
      }

      summaryEl.innerHTML = `About <strong class="text-2">${(total || results.length).toLocaleString()}</strong> results · showing ${results.length}`;
      if (exportBar) exportBar.style.display = "flex";

      resultsEl.innerHTML = results.map((p, i) => renderPaperCard(p, i)).join("");
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function renderPaperCard(p, index) {
      const authors = (p.authors || [])
        .slice(0, 3)
        .map((a) => [a.given, a.family].filter(Boolean).join(" "))
        .join(", ") + (p.authors && p.authors.length > 3 ? ", et al." : "");
      const venueYear = [p.venue, p.year].filter(Boolean).join(", ");

      const badges = [`<span class="badge badge-blue">${escapeHtml(p.type || "Article")}</span>`];
      if (p.open_access) badges.push('<span class="badge badge-green">Open Access</span>');

      const pdfBtn = p.pdf_url
        ? `<a class="btn btn-soft btn-sm" href="${escapeAttr(p.pdf_url)}" target="_blank" rel="noopener"><span data-icon="file"></span> PDF</a>`
        : "";
      const doiLink = p.doi
        ? `<a class="btn btn-ghost btn-sm" href="https://doi.org/${escapeAttr(p.doi)}" target="_blank" rel="noopener"><span data-icon="quote"></span> View</a>`
        : "";

      return `
        <article class="card paper-card card-hover" data-result-index="${index}">
          <div class="paper-card__top">
            <div>
              <div class="flex items-center gap-2" style="margin-bottom:6px;">${badges.join("")}</div>
              <h4>${escapeHtml(p.title)}</h4>
              <div class="authors">${escapeHtml(authors || "Unknown authors")}${venueYear ? " — <em>" + escapeHtml(venueYear) + "</em>" : ""}</div>
            </div>
            <div class="paper-actions">
              <button title="Save to library" data-save-paper="${index}"><span data-icon="bookmark"></span></button>
              <button title="Remove from results" data-remove-paper="${index}"><span data-icon="trash"></span></button>
            </div>
          </div>
          <p class="abstract">${escapeHtml(p.abstract)}</p>
          <div class="paper-card__foot">
            <div class="paper-meta">
              <span><span data-icon="star"></span> Cited ${p.citation_count || 0}</span>
            </div>
            <div class="flex gap-2">
              ${pdfBtn}
              ${doiLink}
            </div>
          </div>
        </article>
      `;
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
    function escapeAttr(str) {
      return escapeHtml(str).replace(/"/g, "&quot;");
    }

    // Run an initial search with the pre-filled demo query so the page isn't empty on load.
    runSearch();

    const exportTxtBtn = document.getElementById("litExportTxtBtn");
    const exportBibtexBtn = document.getElementById("litExportBibtexBtn");

    if (exportTxtBtn) {
      exportTxtBtn.addEventListener("click", () => {
        if (!lastResults.length) return;
        const style = styleSelect.value;
        const text = lastResults
          .map((p, i) => `[${i + 1}] ${p.formatted ? p.formatted[style] : p.title}`)
          .join("\n\n");
        downloadFile(text, `literature-search-${style.toLowerCase()}.txt`, "text/plain");
      });
    }

    if (exportBibtexBtn) {
      exportBibtexBtn.addEventListener("click", () => {
        if (!lastResults.length) return;
        const bibtex = lastResults.map((p) => p.bibtex).filter(Boolean).join("\n\n");
        downloadFile(bibtex, "literature-search-results.bib", "text/plain");
      });
    }

    function downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
})();

/* ============================================================
   ImoleWrites — Workspace "Cite" feature
   Search your Citation Manager library (or your live Mendeley
   library, if connected) without leaving the editor, insert a
   real in-text citation at your cursor, and build a References
   list from everything you've cited in this document — the same
   workflow as Mendeley's Word plugin, just built for the web.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const citeBtn = document.getElementById("citeBtn");
    const searchInput = document.getElementById("citeSearchInput");
    const styleSelect = document.getElementById("citeStyleSelect");
    const resultsList = document.getElementById("citeResultsList");
    const mendeleyTab = document.getElementById("citeMendeleyTab");
    const usedCountEl = document.getElementById("citeUsedCount");
    const insertRefsBtn = document.getElementById("insertReferencesBtn");
    const editor = document.querySelector("[data-editor]");

    if (!citeBtn || !editor) return;

    let activeTab = "library";
    let libraryCitations = [];
    let mendeleyDocs = [];
    let mendeleyLoaded = false;
    const usedCitations = new Map(); // id -> {formatted, in_text} for the References list
    let savedRange = null;

    // Remember where the cursor was when "Cite" was clicked, so we can
    // restore it after the modal (which steals focus) closes.
    editor.addEventListener("mouseup", saveSelection);
    editor.addEventListener("keyup", saveSelection);
    function saveSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }

    citeBtn.addEventListener("click", async () => {
      saveSelection();
      if (window.IW && window.IW.Modal) window.IW.Modal.open("citeModal");
      await loadLibrary();
      checkMendeley();
    });

    async function loadLibrary() {
      resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Loading…</p>`;
      try {
        libraryCitations = await window.API.listCitations();
        if (activeTab === "library") renderResults();
      } catch (err) {
        console.error(err);
        resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Couldn't load your library.</p>`;
      }
    }

    async function checkMendeley() {
      try {
        const status = await window.API.mendeleyStatus();
        mendeleyTab.style.display = status.connected ? "" : "none";
      } catch (err) {
        mendeleyTab.style.display = "none";
      }
    }

    document.querySelectorAll("[data-cite-tab]").forEach((tab) => {
      tab.addEventListener("click", async () => {
        document.querySelectorAll("[data-cite-tab]").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        activeTab = tab.dataset.citeTab;
        searchInput.value = "";
        if (activeTab === "mendeley" && !mendeleyLoaded) {
          resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Loading your Mendeley library…</p>`;
          try {
            const data = await window.API.mendeleyLibrary();
            mendeleyDocs = data.documents || [];
            mendeleyLoaded = true;
          } catch (err) {
            console.error(err);
            const detail = err && err.body && err.body.detail ? err.body.detail : "Couldn't load your Mendeley library.";
            resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">${escapeHtml(detail)}</p>`;
            return;
          }
        }
        renderResults();
      });
    });

    searchInput.addEventListener("input", renderResults);
    styleSelect.addEventListener("change", renderResults);

    function renderResults() {
      const q = searchInput.value.trim().toLowerCase();
      const style = styleSelect.value;

      if (activeTab === "library") {
        const filtered = libraryCitations.filter((c) => matchesQuery(c.title, c.authors, q));
        if (!filtered.length) {
          resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">${libraryCitations.length ? "No matches." : "No saved citations yet — add some in the Citation Manager or Literature Search."}</p>`;
          return;
        }
        resultsList.innerHTML = filtered.map((c) => resultRow(c.id, c.title, c.authors, c.year, style, "library")).join("");
      } else {
        const filtered = mendeleyDocs.filter((d) => matchesQuery(d.title, d.authors, q));
        if (!filtered.length) {
          resultsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">${mendeleyDocs.length ? "No matches." : "No documents found in your Mendeley library."}</p>`;
          return;
        }
        resultsList.innerHTML = filtered.map((d) => resultRow(d.mendeley_id, d.title, d.authors, d.year, style, "mendeley")).join("");
      }
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function matchesQuery(title, authors, q) {
      if (!q) return true;
      const authorStr = (authors || []).map((a) => [a.given, a.family].filter(Boolean).join(" ")).join(" ").toLowerCase();
      return (title || "").toLowerCase().includes(q) || authorStr.includes(q);
    }

    function resultRow(id, title, authors, year, style, source) {
      const authorStr = (authors || []).slice(0, 2).map((a) => a.family || a.given).filter(Boolean).join(", ");
      const meta = [authorStr, year].filter(Boolean).join(" · ");
      return `
        <div class="list-row" data-cite-id="${escapeAttr(id)}" data-cite-source="${source}" style="cursor:pointer;">
          <span class="icon-tile xs bg-blue" style="width:32px;height:32px;border-radius:8px;"><span data-icon="book"></span></span>
          <div class="meta"><div class="title" style="font-size:var(--fs-sm);">${escapeHtml(title)}</div><div class="sub">${escapeHtml(meta)}</div></div>
          <button class="btn btn-soft btn-xs" data-insert-cite="${escapeAttr(id)}" data-cite-source="${source}">Insert</button>
        </div>`;
    }

    resultsList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-insert-cite]");
      if (!btn) return;
      const id = btn.dataset.insertCite;
      const source = btn.dataset.citeSource;
      const style = styleSelect.value;

      btn.disabled = true;
      btn.textContent = "Inserting…";

      try {
        let citation;
        if (source === "library") {
          citation = libraryCitations.find((c) => String(c.id) === String(id));
        } else {
          // Importing also saves it to the user's real Citation Manager library.
          citation = await window.API.mendeleyImport(id);
          libraryCitations.push(citation);
        }
        if (!citation) throw new Error("Citation not found");

        insertAtCursor(citation.in_text[style] + " ");
        usedCitations.set(citation.id, citation);
        usedCountEl.textContent = usedCitations.size;
        window.__citedReferences = Array.from(usedCitations.values());

        if (window.IW && window.IW.Toast) window.IW.Toast.show("Citation inserted", "check", "Cite");
        if (window.IW && window.IW.Modal) window.IW.Modal.close();
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = "Insert";
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't insert that citation", "alert", "Cite");
      }
    });

    function insertAtCursor(text) {
      editor.focus();
      const sel = window.getSelection();
      if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      document.execCommand("insertText", false, text);
      saveSelection();
      editor.dispatchEvent(new Event("input")); // trigger autosave/word count
    }

    insertRefsBtn.addEventListener("click", () => {
      if (!usedCitations.size) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Cite something first — nothing to list yet", "alert", "Cite");
        return;
      }
      const style = styleSelect.value;
      const entries = Array.from(usedCitations.values())
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .map((c) => `<p>${escapeHtml(c.formatted[style])}</p>`)
        .join("");
      const block = `<h2>References</h2>${entries}`;

      editor.focus();
      editor.innerHTML += block; // append at the end of the document
      editor.dispatchEvent(new Event("input"));

      if (window.IW && window.IW.Modal) window.IW.Modal.close();
      if (window.IW && window.IW.Toast) window.IW.Toast.show("References list added", "check", "Cite");
    });

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
    function escapeAttr(str) {
      return escapeHtml(str).replace(/"/g, "&quot;");
    }
  });
})();

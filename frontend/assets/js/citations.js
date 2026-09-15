/* ============================================================
   ImoleWrites — Citation Manager page logic
   Wires style switching, bibliography, DOI lookup, add-citation,
   BibTeX, and export to the real FastAPI /citations endpoints.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const styleGroup = document.getElementById("styleGroup");
    const bibList = document.getElementById("bibList");
    const bibHeading = document.getElementById("bibHeading");
    const inTextEl = document.getElementById("inText");
    const bibtexBlock = document.getElementById("bibtexBlock");
    const copyBibtexBtn = document.getElementById("copyBibtexBtn");
    const exportBibBtn = document.getElementById("exportBibBtn");

    const quickDoiInput = document.getElementById("quickDoiInput");
    const quickDoiBtn = document.getElementById("quickDoiBtn");
    const doiModalInput = document.getElementById("doiModalInput");
    const doiModalFetchBtn = document.getElementById("doiModalFetchBtn");

    const addCiteType = document.getElementById("addCiteType");
    const addCiteTitle = document.getElementById("addCiteTitle");
    const addCiteAuthors = document.getElementById("addCiteAuthors");
    const addCiteYear = document.getElementById("addCiteYear");
    const addCiteVenue = document.getElementById("addCiteVenue");
    const addCiteSubmitBtn = document.getElementById("addCiteSubmitBtn");

    let citations = [];
    let currentStyle = "APA";
    let selectedId = null;

    loadCitations();

    styleGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      styleGroup.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentStyle = chip.dataset.style;
      renderAll();
      if (window.IW && window.IW.Toast) window.IW.Toast.show("Switched to " + currentStyle + " style", "check", "Citation style");
    });

    bibList.addEventListener("click", (e) => {
      const entry = e.target.closest(".cite-entry[data-id]");
      if (!entry) return;
      selectedId = Number(entry.dataset.id);
      renderSidePanels();
      bibList.querySelectorAll(".cite-entry").forEach((el) => el.classList.remove("selected"));
      entry.classList.add("selected");
    });

    quickDoiBtn.addEventListener("click", () => fetchAndAdd(quickDoiInput.value));
    doiModalFetchBtn.addEventListener("click", () => fetchAndAdd(doiModalInput.value, true));

    addCiteSubmitBtn.addEventListener("click", async () => {
      const title = addCiteTitle.value.trim();
      if (!title) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Title is required", "alert", "Add citation");
        return;
      }
      const authors = addCiteAuthors.value
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const year = addCiteYear.value ? parseInt(addCiteYear.value, 10) : null;

      try {
        await window.API.createCitation({
          title,
          authors,
          year,
          venue: addCiteVenue.value.trim() || null,
          type: addCiteType.value,
        });
        addCiteTitle.value = "";
        addCiteAuthors.value = "";
        addCiteYear.value = "";
        addCiteVenue.value = "";
        closeModal("addCiteModal");
        await loadCitations();
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Citation added", "check", "Citation Manager");
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't add citation", "alert", "Citation Manager");
      }
    });

    exportBibBtn.addEventListener("click", () => {
      if (!citations.length) return;
      const text = citations.map((c, i) => `[${i + 1}] ${c.formatted[currentStyle]}`).join("\n\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bibliography-${currentStyle.toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    copyBibtexBtn.addEventListener("click", async () => {
      const c = citations.find((x) => x.id === selectedId) || citations[0];
      if (!c) return;
      try {
        await navigator.clipboard.writeText(c.bibtex);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("BibTeX copied", "check", "Citation Manager");
      } catch (e) {
        console.error(e);
      }
    });

    async function fetchAndAdd(doi, fromModal) {
      doi = (doi || "").trim();
      if (!doi) return;
      try {
        const meta = await window.API.lookupDOI(doi);
        await window.API.createCitation({
          doi: meta.doi,
          title: meta.title,
          authors: meta.authors,
          year: meta.year,
          venue: meta.venue,
          volume: meta.volume,
          issue: meta.issue,
          pages: meta.pages,
          url: meta.url,
          type: meta.type,
        });
        quickDoiInput.value = "";
        doiModalInput.value = "";
        if (fromModal) closeModal("doiModal");
        await loadCitations();
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Citation added from DOI", "check", "Citation Manager");
      } catch (err) {
        console.error(err);
        const msg = err && err.status === 404 ? "No metadata found for that DOI" : "DOI lookup failed";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "Citation Manager");
      }
    }

    function closeModal() {
      if (window.IW && window.IW.Modal) window.IW.Modal.close();
    }

    async function loadCitations() {
      bibList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Loading your bibliography…</p>`;
      try {
        citations = await window.API.listCitations();
        if (citations.length && selectedId == null) selectedId = citations[0].id;
        renderAll();
      } catch (err) {
        console.error(err);
        bibList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Couldn't load your bibliography. Please try again.</p>`;
      }
    }

    function renderAll() {
      renderBibliography();
      renderSidePanels();
    }

    function renderBibliography() {
      bibHeading.textContent = `Bibliography (${citations.length} source${citations.length === 1 ? "" : "s"})`;
      if (!citations.length) {
        bibList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">No sources yet — add one by DOI or manually.</p>`;
        return;
      }
      bibList.innerHTML = citations
        .map(
          (c, i) => `
        <div class="cite-entry${c.id === selectedId ? " selected" : ""}" data-id="${c.id}" style="cursor:pointer;">
          <span class="num">[${i + 1}]</span><span data-ref>${escapeHtml(c.formatted[currentStyle])}</span>
        </div>`
        )
        .join("");
    }

    function renderSidePanels() {
      const c = citations.find((x) => x.id === selectedId) || citations[0];
      if (!c) {
        inTextEl.textContent = "Add a source to preview its in-text citation.";
        bibtexBlock.textContent = "Add a source to see its BibTeX entry.";
        return;
      }
      inTextEl.textContent = c.in_text[currentStyle];
      bibtexBlock.innerHTML = escapeHtml(c.bibtex).replace(/\n/g, "<br>").replace(/ {2}/g, "&nbsp;&nbsp;");
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

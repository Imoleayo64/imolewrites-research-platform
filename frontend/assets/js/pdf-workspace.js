/* ============================================================
   ImoleWrites — PDF Workspace page logic
   Real upload (stored server-side, local disk or S3-compatible),
   real PDF.js rendering, real VISIBLE text-selection highlights
   (drawn as colored overlays and persisted with position data so
   they redraw correctly on reload/zoom/page navigation), and AI
   Q&A grounded in the PDF's extracted text.
   ============================================================ */
(function () {
  "use strict";

  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const HIGHLIGHT_COLOR = "#facc15"; // solid amber-yellow, blended with mix-blend-mode:multiply for a real "highlighter" look

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const urlParams = new URLSearchParams(window.location.search);
    const pdfId = urlParams.get("id");

    if (pdfId) {
      initViewer(pdfId);
    } else {
      initLibrary();
    }
  });

  async function initLibrary() {
    const grid = document.getElementById("pdfLibraryGrid");
    const uploadBtn = document.getElementById("pdfUploadBtn");
    const uploadInput = document.getElementById("pdfUploadInput");
    const storageNote = document.getElementById("pdfStorageNote");

    try {
      const info = await window.API.pdfStorageInfo();
      if (!info.persistent) {
        storageNote.innerHTML = `Upload a PDF to read, highlight, and ask AI questions grounded in its content. <strong>Note:</strong> file storage isn't set up for persistent/production hosting yet — uploads may not survive a server restart on some hosts.`;
      }
    } catch (e) { /* non-fatal */ }

    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", async () => {
      const file = uploadInput.files[0];
      if (!file) return;
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';
      try {
        const doc = await window.API.uploadPdf(file);
        window.location.href = `pdf-workspace.html?id=${doc.id}`;
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail ? err.body.detail : "Upload failed";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "PDF Workspace");
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<span data-icon="upload"></span> Upload PDF';
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      }
    });

    try {
      const docs = await window.API.listPdfs();
      renderLibrary(docs);
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p class="text-muted">Couldn't load your PDFs.</p>`;
    }

    function renderLibrary(docs) {
      if (!docs.length) {
        grid.innerHTML = `<div class="card card-pad-lg text-center text-muted" style="grid-column:1/-1;">No PDFs uploaded yet.</div>`;
        return;
      }
      grid.innerHTML = docs
        .map(
          (d) => `
        <a class="card card-pad card-hover" href="pdf-workspace.html?id=${d.id}">
          <span class="icon-tile bg-rose" style="margin-bottom:12px;"><span data-icon="fileText"></span></span>
          <h4 style="font-size:var(--fs-md);line-height:1.35;">${escapeHtml(d.filename)}</h4>
          <p class="text-muted" style="font-size:var(--fs-sm);margin-top:4px;">${d.page_count || "?"} pages · ${formatSize(d.size_bytes)}</p>
        </a>`
        )
        .join("");
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }
  }

  async function initViewer(pdfId) {
    document.getElementById("pdfLibraryView").style.display = "none";
    const viewerView = document.getElementById("pdfViewerView");
    viewerView.style.display = "";

    const titleEl = document.getElementById("pdfTitle");
    const canvas = document.getElementById("pdfCanvas");
    const canvasWrap = document.getElementById("pdfCanvasWrap");
    const highlightLayerEl = document.getElementById("pdfHighlightLayer");
    const textLayerEl = document.getElementById("pdfTextLayer");
    const pageNumEl = document.getElementById("pdfPageNum");
    const pageCountEl = document.getElementById("pdfPageCount");
    const zoomLabel = document.getElementById("pdfZoomLabel");
    const prevBtn = document.getElementById("pdfPrevBtn");
    const nextBtn = document.getElementById("pdfNextBtn");
    const zoomInBtn = document.getElementById("pdfZoomInBtn");
    const zoomOutBtn = document.getElementById("pdfZoomOutBtn");
    const highlightBtn = document.getElementById("pdfHighlightBtn");
    const deleteBtn = document.getElementById("pdfDeleteBtn");
    const annotationsList = document.getElementById("pdfAnnotationsList");
    const askInput = document.getElementById("pdfAskInput");
    const askBtn = document.getElementById("pdfAskBtn");
    const askMessages = document.getElementById("pdfAskMessages");

    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.2;
    let baseScaleSet = false;
    let baseScale = 1.2;
    let annotations = [];
    let pendingHighlight = null; // {text, rectsPct}

    if (!window.pdfjsLib) {
      titleEl.textContent = "Couldn't load the PDF viewer library.";
      return;
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;

    try {
      const blobUrl = await window.API.pdfFileBlobUrl(pdfId);
      pdfDoc = await window.pdfjsLib.getDocument(blobUrl).promise;
      pageCountEl.textContent = pdfDoc.numPages;
      await renderPage(currentPage);
    } catch (err) {
      console.error(err);
      titleEl.textContent = "Couldn't load this PDF.";
      return;
    }

    try {
      const docs = await window.API.listPdfs();
      const meta = docs.find((d) => String(d.id) === String(pdfId));
      if (meta) titleEl.textContent = meta.filename;
    } catch (e) { /* non-fatal */ }

    await loadAnnotations();

    prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
    nextBtn.addEventListener("click", () => goToPage(currentPage + 1));
    zoomInBtn.addEventListener("click", () => setScale(scale + 0.2));
    zoomOutBtn.addEventListener("click", () => setScale(Math.max(0.4, scale - 0.2)));

    highlightBtn.addEventListener("click", () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || !sel.rangeCount) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Select some text in the document first", "alert", "Highlight");
        return;
      }

      // Capture the visual position of the selection NOW, while it's still
      // active — this is what makes the highlight actually render on the
      // page (instead of only being remembered in the sidebar list).
      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      const wrapRect = canvasWrap.getBoundingClientRect();
      const rectsPct = rects.map((r) => ({
        xPct: ((r.left - wrapRect.left) / wrapRect.width) * 100,
        yPct: ((r.top - wrapRect.top) / wrapRect.height) * 100,
        widthPct: (r.width / wrapRect.width) * 100,
        heightPct: (r.height / wrapRect.height) * 100,
      }));
      pendingHighlight = { text, rectsPct };

      document.getElementById("highlightPreviewText").textContent = `"${text.slice(0, 200)}${text.length > 200 ? "…" : ""}"`;
      document.getElementById("highlightNoteInput").value = "";
      if (window.IW && window.IW.Modal) window.IW.Modal.open("highlightNoteModal");
    });

    document.getElementById("highlightSaveBtn").addEventListener("click", async () => {
      if (!pendingHighlight) return;
      const note = document.getElementById("highlightNoteInput").value.trim();
      try {
        await window.API.addAnnotation(pdfId, {
          page_number: currentPage,
          highlighted_text: pendingHighlight.text,
          note: note || null,
          color: HIGHLIGHT_COLOR,
          position: pendingHighlight.rectsPct,
        });
        pendingHighlight = null;
        if (window.IW && window.IW.Modal) window.IW.Modal.close();
        await loadAnnotations();
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't save highlight", "alert", "Highlight");
      }
    });

    annotationsList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-delete-annotation]");
      if (!btn) return;
      try {
        await window.API.deleteAnnotation(btn.dataset.deleteAnnotation);
        await loadAnnotations();
      } catch (err) {
        console.error(err);
      }
    });

    deleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this PDF and all its highlights? This can't be undone.")) return;
      try {
        await window.API.deletePdf(pdfId);
        window.location.href = "pdf-workspace.html";
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't delete PDF", "alert", "PDF Workspace");
      }
    });

    askBtn.addEventListener("click", askAi);
    askInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAi(); }
    });

    async function askAi() {
      const question = askInput.value.trim();
      if (!question) return;
      appendAskMessage("user", question);
      askInput.value = "";
      const loadingId = appendAskMessage("ai", "Thinking…");
      try {
        const data = await window.API.askAboutPdf(pdfId, question);
        updateAskMessage(loadingId, data.answer);
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail ? err.body.detail : "Couldn't get an answer right now.";
        updateAskMessage(loadingId, msg);
      }
    }

    function appendAskMessage(role, text) {
      const id = "msg-" + Date.now() + Math.random().toString(36).slice(2);
      const div = document.createElement("div");
      div.className = "chat-msg " + (role === "user" ? "user" : "ai");
      div.id = id;
      div.innerHTML = role === "user"
        ? `<div class="chat-msg__avatar">You</div><div class="chat-msg__body">${escapeHtml(text)}</div>`
        : `<div class="chat-msg__avatar"><span data-icon="sparkles"></span></div><div class="chat-msg__body">${window.renderMarkdown ? window.renderMarkdown(text) : escapeHtml(text)}</div>`;
      askMessages.appendChild(div);
      askMessages.scrollTop = askMessages.scrollHeight;
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      return id;
    }
    function updateAskMessage(id, text) {
      const el = document.getElementById(id);
      if (!el) return;
      const body = el.querySelector(".chat-msg__body");
      body.innerHTML = window.renderMarkdown ? window.renderMarkdown(text) : escapeHtml(text);
    }

    async function loadAnnotations() {
      try {
        annotations = await window.API.listAnnotations(pdfId);
        renderAnnotations();
        renderHighlightsOnPage(currentPage);
      } catch (err) {
        console.error(err);
      }
    }

    function renderAnnotations() {
      if (!annotations.length) {
        annotationsList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Select text in the document, then click "Highlight selection".</p>`;
        return;
      }
      annotationsList.innerHTML = annotations
        .map(
          (a) => `
        <div style="border-left:3px solid ${a.color || HIGHLIGHT_COLOR};padding-left:10px;cursor:pointer;" data-goto-page="${a.page_number}">
          <div class="flex items-center justify-between"><div class="text-muted" style="font-size:var(--fs-xs);">Page ${a.page_number}</div><button class="btn btn-ghost btn-xs" data-delete-annotation="${a.id}">Remove</button></div>
          <p style="font-size:var(--fs-sm);">"${escapeHtml((a.highlighted_text || "").slice(0, 200))}"</p>
          ${a.note ? `<p class="text-muted" style="font-size:var(--fs-xs);margin-top:4px;">${escapeHtml(a.note)}</p>` : ""}
        </div>`
        )
        .join("");

      annotationsList.querySelectorAll("[data-goto-page]").forEach((row) => {
        row.addEventListener("click", (e) => {
          if (e.target.closest("[data-delete-annotation]")) return;
          const page = Number(row.dataset.gotoPage);
          if (page && page !== currentPage) goToPage(page);
        });
      });
    }

    // Draws the actual colored highlight rectangles for whichever page is
    // currently rendered, from each annotation's saved position percentages
    // — this is what makes highlights visible and persistent (not just a
    // sidebar entry, and not just a temporary browser text-selection color).
    function renderHighlightsOnPage(pageNum) {
      highlightLayerEl.innerHTML = "";
      const wrapWidth = canvasWrap.clientWidth;
      const wrapHeight = canvasWrap.clientHeight;
      highlightLayerEl.style.width = wrapWidth + "px";
      highlightLayerEl.style.height = wrapHeight + "px";

      annotations
        .filter((a) => a.page_number === pageNum && Array.isArray(a.position))
        .forEach((a) => {
          a.position.forEach((r) => {
            const mark = document.createElement("div");
            mark.className = "pdf-highlight-mark";
            mark.style.left = r.xPct + "%";
            mark.style.top = r.yPct + "%";
            mark.style.width = r.widthPct + "%";
            mark.style.height = r.heightPct + "%";
            mark.style.background = a.color || HIGHLIGHT_COLOR;
            mark.title = a.note || "";
            highlightLayerEl.appendChild(mark);
          });
        });
    }

    async function goToPage(n) {
      if (n < 1 || n > pdfDoc.numPages) return;
      currentPage = n;
      await renderPage(n);
      renderHighlightsOnPage(n);
    }

    function setScale(s) {
      scale = s;
      zoomLabel.textContent = Math.round(scale / baseScale * 100) + "%";
      renderPage(currentPage).then(() => renderHighlightsOnPage(currentPage));
    }

    async function renderPage(num) {
      const page = await pdfDoc.getPage(num);

      // On first render, pick a scale that fills the available width nicely
      // instead of a fixed guess — avoids ever needing CSS to scale the canvas
      // (which is what broke text-selection alignment before).
      if (!baseScaleSet) {
        const naturalViewport = page.getViewport({ scale: 1 });
        const wrapperWidth = canvasWrap.clientWidth || 760;
        scale = Math.min(2.5, Math.max(0.6, wrapperWidth / naturalViewport.width));
        baseScale = scale;
        baseScaleSet = true;
        zoomLabel.textContent = "100%";
      }

      const viewport = page.getViewport({ scale });

      // Keep the canvas's actual displayed size in exact 1:1 pixel sync with its
      // drawing buffer (no CSS scaling) — the text layer below is positioned
      // using these same raw pixel coordinates, so any CSS-driven scaling would
      // make selectable text drift away from the visible glyphs under it.
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      pageNumEl.textContent = num;

      // Text layer for real, native text selection (used by the Highlight button)
      textLayerEl.innerHTML = "";
      textLayerEl.style.width = viewport.width + "px";
      textLayerEl.style.height = viewport.height + "px";
      const textContent = await page.getTextContent();
      textContent.items.forEach((item) => {
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const span = document.createElement("span");
        span.textContent = item.str;
        const fontHeight = Math.hypot(tx[2], tx[3]);
        span.style.left = tx[4] + "px";
        span.style.top = (tx[5] - fontHeight) + "px";
        span.style.fontSize = fontHeight + "px";
        span.style.fontFamily = "sans-serif";
        textLayerEl.appendChild(span);
      });
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
})();

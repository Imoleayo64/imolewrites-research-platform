/* ============================================================
   ImoleWrites — Projects grid page logic
   Lists real projects from the backend and lets the user set a
   project's status (draft/submitted/in_review/revisions/published),
   which feeds the real Analytics "Publication tracking" panel.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const gridEl = document.getElementById("projectsGrid");
    const summaryEl = document.getElementById("projectsSummary");
    const filterGroup = document.getElementById("projFilters");
    const statusSelect = document.getElementById("statusSelect");
    const statusJournalInput = document.getElementById("statusJournalInput");
    const statusSaveBtn = document.getElementById("statusSaveBtn");

    let projects = [];
    let activeFilter = "all";
    let editingId = null;

    const STATUS_LABEL = {
      draft: "Draft",
      submitted: "Submitted",
      in_review: "In review",
      revisions: "Revisions",
      published: "Published",
    };
    const STATUS_BADGE = {
      draft: "badge-blue",
      submitted: "badge-blue",
      in_review: "badge-amber",
      revisions: "badge-purple",
      published: "badge-green",
    };
    const STATUS_BORDER = {
      draft: "var(--blue-600)",
      submitted: "var(--blue-600)",
      in_review: "var(--amber-500, #f59e0b)",
      revisions: "var(--purple-600)",
      published: "var(--teal-500)",
    };

    load();

    filterGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      filterGroup.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      render();
    });

    gridEl.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-delete-project]");
      if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.dataset.deleteProject;
        if (!window.confirm("Delete this project? This can't be undone.")) return;
        window.API.deleteProject(id)
          .then(() => load())
          .catch((err) => {
            console.error(err);
            if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't delete project", "alert", "Projects");
          });
        return;
      }
      const btn = e.target.closest("[data-status-btn]");
      if (!btn) return;
      e.preventDefault();
      editingId = Number(btn.dataset.statusBtn);
      const p = projects.find((x) => x.id === editingId);
      if (p) {
        statusSelect.value = p.status || "draft";
        statusJournalInput.value = p.target_journal || "";
      }
    });

    statusSaveBtn.addEventListener("click", async () => {
      if (editingId == null) return;
      try {
        await window.API.updateProjectStatus(editingId, statusSelect.value, statusJournalInput.value.trim() || null);
        if (window.IW && window.IW.Modal) window.IW.Modal.close();
        await load();
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Project status updated", "check", "Projects");
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't update status", "alert", "Projects");
      }
    });

    async function load() {
      try {
        projects = await window.API.listProjects();
        render();
      } catch (err) {
        console.error(err);
        gridEl.innerHTML = `<p class="text-muted">Couldn't load your projects. Please try again.</p>`;
      }
    }

    function render() {
      const activeCount = projects.filter((p) => p.status !== "published").length;
      const publishedCount = projects.filter((p) => p.status === "published").length;
      summaryEl.textContent = `${activeCount} active · ${publishedCount} published`;

      let list = projects;
      if (activeFilter === "active") list = projects.filter((p) => p.status !== "published");
      if (activeFilter === "published") list = projects.filter((p) => p.status === "published");

      const cards = list.map(renderCard).join("");
      const newCard = `
        <a class="card card-pad" href="workspace.html" style="border:2px dashed var(--border-2);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:220px;text-decoration:none;">
          <span class="icon-tile" style="background:var(--surface-3);color:var(--text-3);box-shadow:none;"><span data-icon="plus"></span></span>
          <h4 style="margin-top:14px;">Start a new project</h4>
          <p class="text-muted" style="font-size:var(--fs-sm);margin-top:4px;">Manuscript, review, or proposal</p>
        </a>`;

      gridEl.innerHTML = cards + newCard;
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function renderCard(p) {
      const status = p.status || "draft";
      const badgeClass = STATUS_BADGE[status] || "badge-blue";
      const label = STATUS_LABEL[status] || status;
      const border = STATUS_BORDER[status] || "var(--blue-600)";
      const updated = p.updated_at ? timeAgo(p.updated_at) : "";
      const meta = [`${(p.word_count || 0).toLocaleString()} words`, p.field].filter(Boolean).join(" · ");

      return `
        <div class="card card-pad card-hover" style="border-top:4px solid ${border};position:relative;">
          <a href="workspace.html?id=${p.id}" style="text-decoration:none;color:inherit;display:block;">
            <div class="flex items-center justify-between" style="margin-bottom:14px;">
              <span class="icon-tile bg-blue"><span data-icon="fileText"></span></span>
              <span class="badge ${badgeClass}">${escapeHtml(label)}</span>
            </div>
            <h3 style="font-size:var(--fs-lg);margin-bottom:4px;">${escapeHtml(p.title)}</h3>
            <p class="text-muted" style="font-size:var(--fs-sm);margin-bottom:14px;">${escapeHtml(meta)}</p>
          </a>
          <div class="flex items-center justify-between" style="margin-top:8px;">
            <span class="text-muted" style="font-size:var(--fs-xs);"><span data-icon="clock"></span> ${escapeHtml(updated)}</span>
            <button class="btn btn-ghost btn-sm" data-modal-open="statusModal" data-status-btn="${p.id}"><span data-icon="checkCircle"></span> Status</button>
            <button class="btn btn-ghost btn-sm" data-delete-project="${p.id}"><span data-icon="trash"></span></button>
          </div>
        </div>`;
    }

    function timeAgo(iso) {
      const then = new Date(iso).getTime();
      const diffMs = Date.now() - then;
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + "m ago";
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + "h ago";
      const days = Math.floor(hrs / 24);
      if (days === 1) return "yesterday";
      if (days < 30) return days + "d ago";
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

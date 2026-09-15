/* ============================================================
   ImoleWrites — Admin Dashboard page logic
   Real platform totals (users, projects, citations, AI usage).
   No revenue/billing numbers since no payment system exists.
   Redirects non-admin users away entirely — the backend also
   enforces this independently via require_admin().
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.API) return;

    const gate = document.getElementById("adminGate");
    const content = document.getElementById("adminContent");

    try {
      const data = await window.API.adminOverview();
      content.style.display = "";
      render(data);
    } catch (err) {
      if (err && err.status === 403) {
        gate.style.display = "";
        gate.innerHTML = `<p class="text-muted">You don't have admin access.</p>`;
        setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
      } else {
        console.error(err);
        gate.style.display = "";
        gate.innerHTML = `<p class="text-muted">Couldn't load the admin dashboard.</p>`;
      }
    }

    function render(data) {
      const t = data.totals || {};
      setText("adminTotalUsers", (t.total_users || 0).toLocaleString());
      setText("adminTotalProjects", (t.total_projects || 0).toLocaleString());
      setText("adminTotalCitations", (t.total_citations || 0).toLocaleString());
      setText("adminTotalAi", (t.total_ai_interactions || 0).toLocaleString());

      const aiConfigured = data.system?.ai_service_configured;
      setText("adminAiStatusSub", aiConfigured ? "API key configured" : "No GEMINI_API_KEY set");
      const badge = document.getElementById("adminAiStatusBadge");
      const icon = document.getElementById("adminAiStatusIcon");
      if (badge) {
        badge.textContent = aiConfigured ? "Healthy" : "Not configured";
        badge.className = "badge " + (aiConfigured ? "badge-green" : "badge-amber");
      }
      if (icon) icon.className = aiConfigured ? "text-green" : "text-amber";

      const usersBody = document.getElementById("adminUsersTable");
      const users = data.recent_users || [];
      usersBody.innerHTML = users.length
        ? users
            .map(
              (u) => `
        <tr>
          <td class="col-feature"><div class="flex items-center gap-2"><div class="avatar sm">${initials(u.name)}</div>${escapeHtml(u.name)}</div></td>
          <td>${escapeHtml(u.email)}</td>
          <td>${u.is_admin ? '<span class="badge badge-purple">Admin</span>' : '<span class="badge">User</span>'}</td>
        </tr>`
            )
            .join("")
        : `<tr><td colspan="3" class="text-muted">No users yet.</td></tr>`;

      const statusEl = document.getElementById("adminProjectStatus");
      const byStatus = data.projects_by_status || {};
      const labels = { draft: "Draft", submitted: "Submitted", in_review: "In review", revisions: "Revisions", published: "Published" };
      const entries = Object.entries(byStatus);
      statusEl.innerHTML = entries.length
        ? entries
            .map(([status, count]) => `<div class="list-row"><span class="badge">${escapeHtml(labels[status] || status)}</span><div class="meta"><div class="title">${count} project${count === 1 ? "" : "s"}</div></div></div>`)
            .join("")
        : `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">No projects yet.</p>`;

      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function initials(name) {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
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
  });
})();

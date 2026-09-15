/* ============================================================
   ImoleWrites — Collaboration page logic
   Real project picker + real members via /projects/{id}/members.
   Tasks, Comments, and Version History are honestly marked
   "Coming soon" in the HTML since they aren't built yet.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const projectSelect = document.getElementById("collabProjectSelect");
    const projectSub = document.getElementById("collabProjectSub");
    const avatarStack = document.getElementById("collabAvatarStack");
    const membersList = document.getElementById("collabMembersList");
    const openBtn = document.getElementById("collabOpenBtn");
    const inviteEmail = document.getElementById("collabInviteEmail");
    const inviteRole = document.getElementById("collabInviteRole");
    const inviteBtn = document.getElementById("collabInviteBtn");

    let projects = [];
    let currentProjectId = null;

    load();

    projectSelect.addEventListener("change", () => {
      currentProjectId = projectSelect.value;
      updateOpenLink();
      loadMembers();
    });

    inviteBtn.addEventListener("click", async () => {
      if (!currentProjectId) return;
      const email = inviteEmail.value.trim();
      if (!email) return;
      const oldLabel = inviteBtn.textContent;
      inviteBtn.disabled = true;
      inviteBtn.textContent = "Sending...";
      try {
        await window.API.inviteMember(currentProjectId, email, inviteRole.value);
        inviteEmail.value = "";
        if (window.IW && window.IW.Modal) window.IW.Modal.close();
        await loadMembers();
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Invite sent", "check", "Collaboration");
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail ? err.body.detail : "Couldn't send invite";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "Collaboration");
      } finally {
        inviteBtn.disabled = false;
        inviteBtn.textContent = oldLabel;
      }
    });

    membersList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-remove-member]");
      if (!btn || !currentProjectId) return;
      try {
        await window.API.removeMember(currentProjectId, btn.dataset.removeMember);
        await loadMembers();
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't remove collaborator", "alert", "Collaboration");
      }
    });

    async function load() {
      try {
        projects = await window.API.listProjects();
        if (!projects.length) {
          projectSelect.innerHTML = `<option>No projects yet</option>`;
          projectSub.textContent = "Create a project first from My Projects.";
          return;
        }
        projectSelect.innerHTML = projects.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join("");
        currentProjectId = projects[0].id;
        projectSelect.value = currentProjectId;
        updateOpenLink();
        await loadMembers();
      } catch (err) {
        console.error(err);
        projectSub.textContent = "Couldn't load your projects.";
      }
    }

    function updateOpenLink() {
      openBtn.href = `workspace.html?id=${currentProjectId}`;
    }

    async function loadMembers() {
      const project = projects.find((p) => String(p.id) === String(currentProjectId));
      projectSub.textContent = project ? `${project.title} — real-time co-editing` : "";

      membersList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">Loading…</p>`;
      try {
        const data = await window.API.listMembers(currentProjectId);
        const canManage = data.your_role === "owner";

        const rows = [];
        avatarStack.innerHTML = "";

        data.members.forEach((m, i) => {
          rows.push(`
            <div class="list-row">
              <div class="avatar md">${initials(m.name)}</div>
              <div class="meta"><div class="title">${escapeHtml(m.name)}</div><div class="sub">${escapeHtml(m.email)} · ${escapeHtml(cap(m.role))}</div></div>
              ${canManage ? `<button class="btn btn-ghost btn-xs" data-remove-member="${m.user_id}">Remove</button>` : ""}
            </div>`);
          avatarStack.innerHTML += `<div class="avatar md" style="border:2px solid var(--surface);margin-left:${i === 0 ? 0 : -8}px;">${initials(m.name)}</div>`;
        });

        membersList.innerHTML = rows.length
          ? rows.join("")
          : `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">Just you so far — invite a collaborator above.</p>`;
      } catch (err) {
        console.error(err);
        membersList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);padding:12px 4px;">Couldn't load members.</p>`;
      }
    }

    function initials(name) {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
    }
    function cap(s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }
    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

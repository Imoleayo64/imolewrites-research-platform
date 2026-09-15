/* ============================================================
   ImoleWrites — Workspace "Share" (collaborators) modal logic
   Real invites via /projects/{id}/members — separate from the
   live co-editing socket (collab.js), which is an ES module.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");
    if (!projectId) return;

    const emailInput = document.getElementById("shareEmailInput");
    const roleSelect = document.getElementById("shareRoleSelect");
    const inviteBtn = document.getElementById("shareInviteBtn");
    const listEl = document.getElementById("shareMembersList");

    if (!inviteBtn) return;

    let yourRole = "owner";

    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-modal-open="shareModal"]')) loadMembers();
    });

    inviteBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email) return;
      const oldLabel = inviteBtn.textContent;
      inviteBtn.disabled = true;
      inviteBtn.textContent = "Inviting...";
      try {
        await window.API.inviteMember(projectId, email, roleSelect.value);
        emailInput.value = "";
        await loadMembers();
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Collaborator added", "check", "Share");
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail ? err.body.detail : "Couldn't add collaborator";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "Share");
      } finally {
        inviteBtn.disabled = false;
        inviteBtn.textContent = oldLabel;
      }
    });

    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-remove-member]");
      if (!btn) return;
      const userId = btn.dataset.removeMember;
      try {
        await window.API.removeMember(projectId, userId);
        await loadMembers();
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't remove collaborator", "alert", "Share");
      }
    });

    async function loadMembers() {
      listEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Loading…</p>`;
      try {
        const data = await window.API.listMembers(projectId);
        yourRole = data.your_role;
        const canManage = yourRole === "owner";
        document.getElementById("shareEmailInput").parentElement.style.display = canManage ? "" : "none";

        if (!data.members.length) {
          listEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">No collaborators yet — invite someone by email above.</p>`;
          return;
        }
        listEl.innerHTML = data.members
          .map(
            (m) => `
          <div class="list-row">
            <div class="avatar sm">${initials(m.name)}</div>
            <div class="meta"><div class="title">${escapeHtml(m.name)}</div><div class="sub">${escapeHtml(m.email)} · ${escapeHtml(m.role)}</div></div>
            ${canManage ? `<button class="btn btn-ghost btn-xs" data-remove-member="${m.user_id}">Remove</button>` : ""}
          </div>`
          )
          .join("");
      } catch (err) {
        console.error(err);
        listEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Couldn't load collaborators.</p>`;
      }
    }

    function initials(name) {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

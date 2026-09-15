/* ============================================================
   ImoleWrites — Settings page logic
   Wires the Profile tab (real name/institution/field/role/bio)
   and Security tab (real password change, real account deletion)
   to the backend. Other tabs are marked "Coming soon" in the HTML
   since there's no real system behind them yet.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    // Keep the existing dark-mode toggle sync working
    const dt = document.getElementById("darkToggle");
    if (dt && window.IW && window.IW.Theme) dt.checked = window.IW.Theme.current() === "dark";

    if (!window.API) return;

    const avatarEl = document.getElementById("profileAvatar");
    const nameInput = document.getElementById("settingsName");
    const emailInput = document.getElementById("settingsEmail");
    const institutionInput = document.getElementById("settingsInstitution");
    const fieldInput = document.getElementById("settingsField");
    const roleSelect = document.getElementById("settingsRole");
    const bioInput = document.getElementById("settingsBio");
    const saveBtn = document.getElementById("profileSaveBtn");
    const cancelBtn = document.getElementById("profileCancelBtn");

    const currentPasswordInput = document.getElementById("currentPasswordInput");
    const newPasswordInput = document.getElementById("newPasswordInput");
    const updatePasswordBtn = document.getElementById("updatePasswordBtn");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    const avatarInput = document.getElementById("avatarInput");
    const avatarUploadBtn = document.getElementById("avatarUploadBtn");

    let original = null;
    let currentUserId = null;

    load();

    async function load() {
      try {
        const user = await window.API.me();
        original = user;
        currentUserId = user.id;
        fillForm(user);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    }

    function fillForm(user) {
      nameInput.value = user.name || "";
      emailInput.value = user.email || "";
      institutionInput.value = user.institution || "";
      fieldInput.value = user.field || "";
      if (user.role && [...roleSelect.options].some((o) => o.value === user.role)) {
        roleSelect.value = user.role;
      }
      bioInput.value = user.bio || "";
      renderAvatar(user);
    }

    function renderAvatar(user) {
      if (user.has_avatar && user.id) {
        avatarEl.innerHTML = `<img src="${window.API.avatarUrl(user.id)}?t=${Date.now()}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`;
      } else {
        avatarEl.textContent = initials(user.name);
      }
    }

    avatarUploadBtn.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      const oldLabel = avatarUploadBtn.innerHTML;
      avatarUploadBtn.disabled = true;
      avatarUploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';
      try {
        await window.API.uploadAvatar(file);
        original = { ...original, has_avatar: true, id: currentUserId };
        renderAvatar(original);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Profile photo updated", "check", "Settings");
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail ? err.body.detail : "Couldn't upload photo";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "Settings");
      } finally {
        avatarUploadBtn.disabled = false;
        avatarUploadBtn.innerHTML = oldLabel;
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);
        avatarInput.value = "";
      }
    });

    function initials(name) {
      if (!name) return "··";
      const parts = name.trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "··";
    }

    cancelBtn.addEventListener("click", () => {
      if (original) fillForm(original);
    });

    saveBtn.addEventListener("click", async () => {
      const oldLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      try {
        const updated = await window.API.updateProfile({
          full_name: nameInput.value.trim(),
          institution: institutionInput.value.trim() || null,
          field: fieldInput.value.trim() || null,
          role: roleSelect.value,
          bio: bioInput.value.trim() || null,
        });
        original = updated;
        fillForm(updated);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Profile updated", "check", "Settings");
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't save your profile", "alert", "Settings");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = oldLabel;
      }
    });

    updatePasswordBtn.addEventListener("click", async () => {
      const current = currentPasswordInput.value;
      const next = newPasswordInput.value;
      if (!current || !next) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Enter your current and new password", "alert", "Settings");
        return;
      }
      if (next.length < 6) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("New password should be at least 6 characters", "alert", "Settings");
        return;
      }
      const oldLabel = updatePasswordBtn.textContent;
      updatePasswordBtn.disabled = true;
      updatePasswordBtn.textContent = "Updating...";
      try {
        await window.API.changePassword(current, next);
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Password updated", "check", "Settings");
      } catch (err) {
        console.error(err);
        const msg = err && err.status === 401 ? "Current password is incorrect" : "Couldn't update password";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "Settings");
      } finally {
        updatePasswordBtn.disabled = false;
        updatePasswordBtn.textContent = oldLabel;
      }
    });

    deleteAccountBtn.addEventListener("click", async () => {
      const sure = window.confirm(
        "This will permanently delete your account and all your projects, citations, and data. This cannot be undone. Continue?"
      );
      if (!sure) return;
      try {
        await window.API.deleteAccount();
        localStorage.removeItem("imole-token");
        localStorage.removeItem("access_token");
        window.location.href = "../auth/login.html";
      } catch (err) {
        console.error(err);
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't delete your account", "alert", "Settings");
      }
    });

    initMendeley();

    async function initMendeley() {
      const connectedView = document.getElementById("mendeleyConnectedView");
      const disconnectedView = document.getElementById("mendeleyDisconnectedView");
      const notConfiguredView = document.getElementById("mendeleyNotConfiguredView");
      const connectBtn = document.getElementById("mendeleyConnectBtn");
      const disconnectBtn = document.getElementById("mendeleyDisconnectBtn");
      const browseBtn = document.getElementById("mendeleyBrowseBtn");
      const libraryList = document.getElementById("mendeleyLibraryList");
      if (!connectBtn) return;

      // If we just came back from the OAuth redirect, show a toast either way.
      const urlParams = new URLSearchParams(window.location.search);
      const mendeleyResult = urlParams.get("mendeley");
      if (mendeleyResult === "connected" && window.IW && window.IW.Toast) {
        window.IW.Toast.show("Mendeley connected", "check", "Settings");
      } else if (mendeleyResult === "error" && window.IW && window.IW.Toast) {
        window.IW.Toast.show("Couldn't connect Mendeley — please try again", "alert", "Settings");
      }

      try {
        const status = await window.API.mendeleyStatus();
        if (!status.configured) {
          notConfiguredView.style.display = "";
        } else if (status.connected) {
          connectedView.style.display = "";
        } else {
          disconnectedView.style.display = "";
        }
      } catch (err) {
        console.error(err);
      }

      connectBtn.addEventListener("click", async () => {
        try {
          await window.API.mendeleyConnect(); // navigates the browser away
        } catch (err) {
          console.error(err);
          if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't start Mendeley connection", "alert", "Settings");
        }
      });

      disconnectBtn.addEventListener("click", async () => {
        try {
          await window.API.mendeleyDisconnect();
          connectedView.style.display = "none";
          disconnectedView.style.display = "";
          libraryList.style.display = "none";
          libraryList.innerHTML = "";
        } catch (err) {
          console.error(err);
          if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't disconnect Mendeley", "alert", "Settings");
        }
      });

      browseBtn.addEventListener("click", async () => {
        libraryList.style.display = "";
        libraryList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Loading your Mendeley library…</p>`;
        try {
          const data = await window.API.mendeleyLibrary();
          renderLibrary(data.documents || []);
        } catch (err) {
          console.error(err);
          const detail = err && err.body && err.body.detail ? err.body.detail : "Couldn't load your Mendeley library.";
          libraryList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">${escapeHtml(detail)}</p>`;
        }
      });

      function renderLibrary(docs) {
        if (!docs.length) {
          libraryList.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">No documents found in your Mendeley library.</p>`;
          return;
        }
        libraryList.innerHTML = docs
          .map((d) => {
            const authors = (d.authors || []).map((a) => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
            const meta = [authors, d.year, d.venue].filter(Boolean).join(" · ");
            return `
            <div class="list-row">
              <span class="icon-tile xs bg-blue" style="width:36px;height:36px;border-radius:9px;"><span data-icon="book"></span></span>
              <div class="meta"><div class="title">${escapeHtml(d.title)}</div><div class="sub">${escapeHtml(meta)}</div></div>
              <button class="btn btn-soft btn-xs" data-import-doc="${escapeAttr(d.mendeley_id)}">Import</button>
            </div>`;
          })
          .join("");
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);

        libraryList.querySelectorAll("[data-import-doc]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.importDoc;
            btn.disabled = true;
            btn.textContent = "Importing…";
            try {
              await window.API.mendeleyImport(id);
              btn.textContent = "Imported ✓";
              if (window.IW && window.IW.Toast) window.IW.Toast.show("Added to your Citation Manager", "check", "Mendeley");
            } catch (err) {
              console.error(err);
              btn.disabled = false;
              btn.textContent = "Import";
              if (window.IW && window.IW.Toast) window.IW.Toast.show("Couldn't import this document", "alert", "Mendeley");
            }
          });
        });
      }

      function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
      }
      function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, "&quot;");
      }
    }
  });
})();

/* ============================================================
   ImoleWrites Research Hub - Rich Text Editor + Chat
   ============================================================ */
(function (global) {
  "use strict";

  const Editor = {
    init() {
      // We now strictly target the exact editor attribute Arena AI used
      const editor = document.querySelector("[data-editor]");
      if (!editor) {
          console.error("Editor not found");
          return;
      }

      editor.setAttribute("contenteditable", "true");

      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('id');
      const token = localStorage.getItem("imole-token");

      if (!token) {
          window.location.href = "../auth/login.html";
          return;
      }

      // Locking onto your exact HTML IDs
      const chapterListContainer = document.getElementById("dynamic-chapters-list");
      const titleEl = document.getElementById("document-title");
      const projectTitleEl = document.getElementById("project-title");
      const counter = document.querySelector("[data-wordcount]");
      const statusText = document.querySelector(".save-status"); 
      
      // Load all documents into the left sidebar
      const loadSidebar = () => {
          fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/", {
              headers: { "Authorization": "Bearer " + token }
          })
          .then(res => {
              if(!res.ok) throw new Error("Fetch failed");
              return res.json();
          })
          .then(projects => {
              if (projects && projects.length > 0) {
                  // If arriving without an ID, redirect to the latest project safely
                  if (!projectId) {
                      const latestProject = projects[projects.length - 1];
                      window.location.href = "workspace.html?id=" + latestProject.id;
                      return;
                  }

                  // Clear the "Loading..." and populate your exact chapter list
                  if (chapterListContainer) {
                      chapterListContainer.innerHTML = ""; 
                      projects.forEach(p => {
                          const isActive = (String(p.id) === String(projectId)) ? "active" : "";
                          const item = document.createElement("div");
                          item.className = "ws-tree-item " + isActive;
                          item.style.cursor = "pointer";
                          item.innerHTML = '<span data-icon="fileText"></span><span class="name">' + p.title + '</span><button class="icon-btn xs page-delete-btn" data-page-id="' + p.id + '" aria-label="Delete page" style="width:24px;height:24px;margin-left:auto;"><span data-icon="trash"></span></button>';
                          item.addEventListener("click", (e) => {
                              if (e.target.closest(".page-delete-btn")) return;
                              window.location.href = "workspace.html?id=" + p.id;
                          });
                          chapterListContainer.appendChild(item);
                      });
                      if (global.Icon) {
                          global.Icon.fill(chapterListContainer);
                      }
                      chapterListContainer.querySelectorAll(".page-delete-btn").forEach((btn) => {
                          btn.addEventListener("click", async (e) => {
                              e.stopPropagation();
                              const pid = btn.getAttribute("data-page-id");
                              if (!window.confirm("Delete this page? This can't be undone.")) return;
                              try {
                                  await window.API.deleteProject(pid);
                                  if (String(pid) === String(projectId)) {
                                      window.location.href = "workspace.html";
                                  } else {
                                      loadSidebar();
                                  }
                              } catch (err) {
                                  console.error(err);
                                  if (global.IW && global.IW.Toast) global.IW.Toast.show("Couldn't delete page", "alert", "Workspace");
                              }
                          });
                      });
                  }
              } else {
                  if (chapterListContainer) {
                      chapterListContainer.innerHTML = '<div class="ws-tree-item"><span class="name">No documents yet</span></div>';
                  }
              }
          })
          .catch(err => {
              console.error("Failed to fetch project list:", err);
          });
      };

      loadSidebar();

      // Load the specific document content and title onto the canvas
      if (projectId) {
          fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/" + projectId, {
              headers: { "Authorization": "Bearer " + token }
          })
          .then(res => {
              if (!res.ok) throw new Error("Fetch failed with status: " + res.status);
              return res.json();
          })
          .then(data => {
              if (titleEl) {
                  titleEl.innerText = data.title;
                  titleEl.setAttribute("data-old-title", data.title);
              }
              if (projectTitleEl) {
                  projectTitleEl.innerText = data.title;
              }
              if (editor) {
                  editor.innerHTML = data.content || "";
                  const textContent = editor.innerText.trim();
                  const words = textContent ? textContent.split(/\s+/).length : 0;
                  if (counter) counter.textContent = words.toLocaleString() + " words";
                  if (statusText) statusText.textContent = "Saved";
              }
          })
          .catch(err => {
              console.error("Failed to load project data:", err);
          });
      }

      // Handle the New Page button dynamically
      const newPageBtn = document.getElementById("new-page-btn");
      if (newPageBtn) {
          newPageBtn.addEventListener("click", () => {
              fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + token
                  },
                  body: JSON.stringify({
                      title: "Untitled Document",
                      description: "New research document"
                  })
              })
              .then(res => res.json())
              .then(data => {
                  if (data && data.id) {
                      window.location.href = "workspace.html?id=" + data.id;
                  }
              })
              .catch(err => console.error(err));
          });
      }

      // Delete the currently open page/project
      const deleteProjectBtn = document.getElementById("delete-project-btn");
      if (deleteProjectBtn && projectId) {
          deleteProjectBtn.addEventListener("click", async () => {
              if (!window.confirm("Delete this page? This can't be undone.")) return;
              try {
                  await global.API.deleteProject(projectId);
                  window.location.href = "workspace.html";
              } catch (err) {
                  console.error(err);
                  if (global.IW && global.IW.Toast) global.IW.Toast.show("Couldn't delete page", "alert", "Workspace");
              }
          });
      }

      // Comments aren't built yet — be honest instead of a silent dead button
      const commentsBtn = document.getElementById("workspace-comments-btn");
      if (commentsBtn) {
          commentsBtn.addEventListener("click", () => {
              if (global.IW && global.IW.Toast) global.IW.Toast.show("Comments aren't built yet", "info", "Coming soon");
          });
      }

      // Toolbar bindings
      document.addEventListener("click", (e) => {
        const cmd = e.target.closest("[data-cmd]");
        if (!cmd) return;
        const c = cmd.getAttribute("data-cmd");
        if (c === "createLink") {
          const url = prompt("Enter URL:", "https://");
          if (url) { editor.focus(); document.execCommand("createLink", false, url); }
          return;
        }
        if (c === "formatBlock") {
          editor.focus();
          document.execCommand("formatBlock", false, cmd.getAttribute("data-value"));
          this.syncToolbar();
          return;
        }
        editor.focus();
        document.execCommand(c, false, null);
        this.syncToolbar();
      });

      document.addEventListener("selectionchange", () => this.syncToolbar());

      let saveTimeout;
      const performSave = () => {
          const currentTitle = titleEl ? titleEl.innerText.trim() : "Untitled Document";
          const currentContent = editor.innerHTML;
          const rawText = editor.innerText.trim();
          const words = rawText ? rawText.split(/\s+/).length : 0;
          
          if (projectId && token) {
              fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/" + projectId, {
                  method: "PUT",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + token
                  },
                  body: JSON.stringify({
                      title: currentTitle,
                      content: currentContent
                  })
              })
              .then(async res => {
                  if (res.ok) {
                      if (statusText) statusText.textContent = "Saved";
                      const activeSidebarItem = document.querySelector(".ws-tree-item.active .name");
                      if (activeSidebarItem) activeSidebarItem.innerText = currentTitle;
                      if (projectTitleEl) projectTitleEl.innerText = currentTitle;
                  } else {
                      const errData = await res.text();
                      console.error("Backend Save Error:", res.status, errData);
                      if (statusText) statusText.textContent = "Save Failed (" + res.status + ")";
                  }
              })
              .catch(err => {
                  console.error("Network Error:", err);
                  if (statusText) statusText.textContent = "Offline - Not Saved";
              });
          }
      };

      const update = () => {
        const rawText = editor.innerText.trim();
        const words = rawText ? rawText.split(/\s+/).length : 0;
        
        if (counter) {
            counter.textContent = words.toLocaleString() + " words";
        }

        if (statusText) {
            statusText.textContent = "Saving...";
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(performSave, 1500);
        }
      };

      editor.addEventListener("input", update);
      
      if (titleEl) {
          titleEl.setAttribute("contenteditable", "true");
          titleEl.style.outline = "none";
          titleEl.style.borderBottom = "1px dashed rgba(255,255,255,0.3)"; 
          
          titleEl.addEventListener("blur", function() {
              const newTitle = this.innerText.trim();
              this.setAttribute("data-old-title", newTitle);
              performSave();
          });
          
          titleEl.addEventListener("keydown", function(e) {
              if (e.key === "Enter") {
                  e.preventDefault();
                  editor.focus();
                  this.blur();
              }
          });
      }

      document.addEventListener("click", (e) => {
          const exportBtn = e.target.closest(".export-btn, [data-export], .modal-content .btn, .modal [class*='bg-'], .modal button");
          if (!exportBtn) return;
          
          const text = exportBtn.innerText.trim();
          if (text.includes("DOCX") || text.includes("PDF") || text.includes("Markdown") || text.includes("BibTeX") || text.includes("LaTeX") || text.includes("Cancel")) {
              e.preventDefault();
              e.stopPropagation();
              
              if (!text.includes("Cancel") && global.IW && global.IW.Toast) {
                  global.IW.Toast.show("Preparing document...", "info", "Export Started");
                  
                  const content = editor ? editor.innerHTML : "";
                  const title = titleEl ? titleEl.innerText.trim() : "Untitled Document";
                  const citations = Array.isArray(global.__citedReferences) ? global.__citedReferences : [];

                  fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/export", {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                          "Authorization": "Bearer " + token
                      },
                      body: JSON.stringify({
                          title: title,
                          content: content,
                          format: text,
                          citations: citations
                      })
                  })
                  .then(res => {
                      if (!res.ok) throw new Error("Export failed on server");
                      return res.blob();
                  })
                  .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.style.display = "none";
                      a.href = url;
                      
                      let ext = ".txt";
                      if (text.includes("DOCX")) ext = ".docx";
                      else if (text.includes("PDF")) ext = ".pdf";
                      else if (text.includes("Markdown")) ext = ".md";
                      else if (text.includes("BibTeX")) ext = ".bib";
                      
                      a.download = title + ext;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      
                  })
                  .catch(err => {
                      console.error(err);
                  });
              }
              
              document.querySelectorAll(".modal, .modal-overlay").forEach((m) => {
                  m.classList.remove("open");
                  m.classList.remove("active");
                  m.style.display = "none"; 
                  setTimeout(() => { m.style.display = ""; }, 400); 
              });
              
              document.body.style.overflow = "";
          }
      });
    },
    syncToolbar() {
      document.querySelectorAll("[data-cmd]").forEach((btn) => {
        const c = btn.getAttribute("data-cmd");
        try {
          if (["formatBlock"].indexOf(c) > -1) return;
          if (document.queryCommandState(c)) btn.classList.add("active");
          else btn.classList.remove("active");
        } catch (e) {}
      });
    }
  };

  const Chat = {
    history: [], // [{role: "user"|"assistant", content: "..."}]
    pendingAttachment: null, // {filename, text, truncated}
    init() {
      const form = document.querySelector("[data-chat-form]");
      const list = document.querySelector("[data-chat-messages]");
      if (!form || !list) return;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector("textarea");
        const text = input.value.trim();
        const attachment = this.pendingAttachment;
        if (!text && !attachment) return;

        const displayText = attachment
          ? `📎 ${attachment.filename}${text ? "\n\n" + text : ""}`
          : text;
        this.addMessage(list, "user", displayText);

        // The model sees the extracted document text too, but the chat bubble
        // only shows what the user actually typed (plus the filename) — not
        // the whole dumped document contents.
        const sentContent = attachment
          ? `[Attached document: ${attachment.filename}]\n\n${attachment.text}${attachment.truncated ? "\n\n[...document truncated...]" : ""}\n\n---\n\n${text || "Please review this document."}`
          : text;
        this.history.push({ role: "user", content: sentContent });

        input.value = "";
        input.style.height = "auto";
        this.clearAttachment();
        this.typing(list);

        try {
          if (!global.API) throw new Error("API client not loaded");
          const data = await global.API.chat(this.history);
          this.removeTyping(list);
          const reply = data.reply || "Sorry, I didn't get a response.";
          this.addMessage(list, "ai", reply);
          this.history.push({ role: "assistant", content: reply });
        } catch (err) {
          this.removeTyping(list);
          const msg = err && err.body && err.body.detail
            ? err.body.detail
            : "The AI assistant is unavailable right now. Please try again shortly.";
          this.addMessage(list, "ai", msg);
        }
      });
      const ta = form.querySelector("textarea");
      if (ta) ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
      document.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-suggest]");
        if (!chip) return;
        const ta2 = form.querySelector("textarea");
        if (ta2) { ta2.value = chip.getAttribute("data-suggest"); ta2.focus(); }
      });

      const attachBtn = form.querySelector("#chatAttachBtn");
      const attachInput = form.querySelector("#chatAttachInput");
      if (attachBtn && attachInput) {
        attachBtn.addEventListener("click", () => attachInput.click());
        attachInput.addEventListener("change", async () => {
          const file = attachInput.files[0];
          if (!file) return;
          if (!global.API) return;
          this.showAttachmentChip(file.name, true);
          try {
            const result = await global.API.extractText(file);
            this.pendingAttachment = result;
            this.showAttachmentChip(result.filename, false);
          } catch (err) {
            console.error(err);
            const msg = err && err.body && err.body.detail ? err.body.detail : "Couldn't read that file";
            if (global.IW && global.IW.Toast) global.IW.Toast.show(msg, "alert", "Attach document");
            this.clearAttachment();
          } finally {
            attachInput.value = "";
          }
        });
      }
    },
    showAttachmentChip(filename, loading) {
      const chip = document.getElementById("chatAttachmentChip");
      if (!chip) return;
      chip.style.display = "block";
      chip.innerHTML = loading
        ? `<span class="badge"><span class="spinner"></span> Reading ${this.escape(filename)}…</span>`
        : `<span class="badge badge-blue">📎 ${this.escape(filename)} <button type="button" id="chatAttachRemoveBtn" style="margin-left:6px;background:none;border:none;cursor:pointer;color:inherit;">✕</button></span>`;
      const removeBtn = document.getElementById("chatAttachRemoveBtn");
      if (removeBtn) removeBtn.addEventListener("click", () => this.clearAttachment());
    },
    clearAttachment() {
      this.pendingAttachment = null;
      const chip = document.getElementById("chatAttachmentChip");
      if (chip) { chip.style.display = "none"; chip.innerHTML = ""; }
    },
    addMessage(list, role, text) {
      const wrap = document.createElement("div");
      wrap.className = "chat-msg " + role;
      const avatar = role === "user"
        ? '<div class="chat-msg__avatar">You</div>'
        : '<div class="chat-msg__avatar"><span data-icon="sparkles"></span></div>';
      const actions = role === "ai"
        ? '<div class="chat-msg__actions"><button data-copy="self" aria-label="Copy"><span data-icon="copy"></span></button><button aria-label="Like"><span data-icon="thumbsUp"></span></button><button aria-label="Regenerate"><span data-icon="refresh"></span></button></div>'
        : "";
      const body = role === "ai" && global.renderMarkdown ? global.renderMarkdown(text) : this.escape(text);
      wrap.innerHTML = avatar + '<div class="chat-msg__body">' + body + actions + "</div>";
      list.appendChild(wrap);
      if (global.Icon) Icon.fill(wrap);
      list.scrollTop = list.scrollHeight;
    },
    typing(list) {
      const t = document.createElement("div");
      t.className = "chat-msg ai";
      t.setAttribute("data-typing", "");
      t.innerHTML = '<div class="chat-msg__avatar"><span data-icon="sparkles"></span></div><div class="chat-msg__body"><div class="typing"><span></span><span></span><span></span></div></div>';
      list.appendChild(t);
      if (global.Icon) Icon.fill(t);
      list.scrollTop = list.scrollHeight;
    },
    removeTyping(list) {
      const t = list.querySelector("[data-typing]");
      if (t) t.remove();
    },
    escape(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };

  function boot() {
    Editor.init();
    Chat.init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  global.IW = global.IW || {};
  Object.assign(global.IW, { Editor, Chat });
})(window);

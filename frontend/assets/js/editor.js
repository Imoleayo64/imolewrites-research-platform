/* ============================================================
   ImoleWrites Research Hub — Rich Text Editor + Chat
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Rich text editor ---------- */
  const Editor = {
    init() {
      const editor = document.querySelector("[data-editor]");
      if (!editor) return;
      // toolbar buttons
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
      // selection change -> update active toolbar states
      document.addEventListener("selectionchange", () => this.syncToolbar());
      // word count
      const counter = document.querySelector("[data-wordcount]");
      if (counter) {
        const update = () => {
          const txt = editor.innerText.trim();
          const words = txt ? txt.split(/\s+/).length : 0;
          counter.textContent = words.toLocaleString() + " words";
        };
        editor.addEventListener("input", update);
        update();
      }
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

  /* ---------- AI Chat (simulated) ---------- */
  const Chat = {
    canned: [
      "Great question. Based on your reference library, the key gap here is a lack of reproducible data pipelines — that's a strong angle for your contribution.",
      "Here's a concise summary of those three sources: they converge on adaptive modeling but diverge on validation methods. I'd foreground the validation debate.",
      "I'd suggest the Aligned Rank Transform ANOVA for your 2×3 mixed design with non-normal data. Want me to draft the R code and reporting template?",
      "Your methods section reads clearly. To strengthen it, add an explicit power analysis and define your inclusion criteria upfront.",
      "I've generated the citation in APA 7th and added it to your bibliography. You can switch styles anytime in the Citation Manager."
    ],
    ci: 0,
    init() {
      const form = document.querySelector("[data-chat-form]");
      const list = document.querySelector("[data-chat-messages]");
      if (!form || !list) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector("textarea");
        const text = input.value.trim();
        if (!text) return;
        this.addMessage(list, "user", text);
        input.value = "";
        input.style.height = "auto";
        this.typing(list);
        const delay = 900 + Math.random() * 700;
        setTimeout(() => {
          this.removeTyping(list);
          this.addMessage(list, "ai", this.canned[this.ci % this.canned.length]);
          this.ci++;
        }, delay);
      });
      // auto-grow textarea
      const ta = form.querySelector("textarea");
      if (ta) ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
      // suggestion chips
      document.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-suggest]");
        if (!chip) return;
        const ta2 = form.querySelector("textarea");
        if (ta2) { ta2.value = chip.getAttribute("data-suggest"); ta2.focus(); }
      });
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
      wrap.innerHTML = avatar + '<div class="chat-msg__body">' + this.escape(text) + actions + "</div>";
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

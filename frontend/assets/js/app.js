/* ============================================================
   ImoleWrites Research Hub — Core App Logic
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Theme management ---------- */
  const Theme = {
    key: "imole-theme",
    init() {
      const saved = localStorage.getItem(this.key);
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = saved || (prefersDark ? "dark" : "light");
      this.set(theme, true);
      // follow system changes if user hasn't chosen
      if (!saved && window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
          this.set(e.matches ? "dark" : "light", true);
        });
      }
      document.addEventListener("click", (e) => {
        const t = e.target.closest("[data-theme-toggle]");
        if (t) this.toggle();
      });
    },
    set(theme, silent) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(this.key, theme);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
        m.setAttribute("content", theme === "dark" ? "#0b1120" : "#ffffff");
      });
      if (!silent) global.Toast && Toast.show("Switched to " + theme + " mode", "check", "Theme");
    },
    toggle() { this.set(this.current() === "dark" ? "light" : "dark"); },
    current() { return document.documentElement.getAttribute("data-theme") || "light"; }
  };

  /* ---------- Toast ---------- */
  const Toast = {
    wrap: null,
    ensure() {
      if (!this.wrap) {
        this.wrap = document.createElement("div");
        this.wrap.className = "toast-wrap";
        document.body.appendChild(this.wrap);
      }
      return this.wrap;
    },
    icons: { check: "checkCircle", info: "info", warn: "bell", error: "x" },
    colors: { check: "bg-green", info: "bg-blue", warn: "bg-amber", error: "bg-red" },
    show(message, type, title) {
      type = type || "info";
      this.ensure();
      const el = document.createElement("div");
      el.className = "toast";
      el.innerHTML =
        '<div class="toast__icon ' + this.colors[type] + '">' + (global.Icon ? Icon.get(this.icons[type]) : "") + "</div>" +
        '<div><div class="toast__title">' + (title || "Notice") + '</div><div class="toast__msg">' + message + "</div></div>";
      this.wrap.appendChild(el);
      setTimeout(() => {
        el.style.transition = "opacity .3s, transform .3s";
        el.style.opacity = "0";
        el.style.transform = "translateX(20px)";
        setTimeout(() => el.remove(), 300);
      }, 3600);
    }
  };

  /* ---------- Scroll reveal ---------- */
  const Reveal = {
    io: null,
    init() {
      const els = document.querySelectorAll("[data-reveal]");
      if (!("IntersectionObserver" in window) || !els.length) {
        els.forEach((e) => e.classList.add("is-visible"));
        return;
      }
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            this.io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      els.forEach((e) => this.io.observe(e));
    },
    refresh() { this.init(); }
  };

  /* ---------- Navbar scroll ---------- */
  const NavState = {
    init() {
      const nav = document.querySelector(".nav");
      if (!nav) return;
      const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  };

  /* ---------- Mobile menu ---------- */
  const MobileMenu = {
    init() {
      document.addEventListener("click", (e) => {
        const openBtn = e.target.closest("[data-mobile-open]");
        if (openBtn) { this.open(); return; }
        if (e.target.closest("[data-mobile-close]") || e.target.closest(".mobile-menu__link")) { this.close(); return; }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
    },
    open() {
      const m = document.querySelector(".mobile-menu");
      if (m) { m.classList.add("open"); document.body.style.overflow = "hidden"; }
    },
    close() {
      const m = document.querySelector(".mobile-menu");
      if (m) { m.classList.remove("open"); document.body.style.overflow = ""; }
    }
  };

  /* ---------- Accordion ---------- */
  const Accordion = {
    init() {
      document.addEventListener("click", (e) => {
        const q = e.target.closest(".accordion__q");
        if (!q) return;
        const item = q.closest(".accordion__item");
        const ans = item.querySelector(".accordion__a");
        const isOpen = item.classList.contains("open");
        // close siblings within same accordion (single-open behavior)
        const group = item.closest(".accordion");
        if (group && group.dataset.single !== "multi") {
          group.querySelectorAll(".accordion__item.open").forEach((o) => {
            if (o !== item) { o.classList.remove("open"); o.querySelector(".accordion__a").style.maxHeight = null; }
          });
        }
        item.classList.toggle("open");
        ans.style.maxHeight = isOpen ? null : ans.scrollHeight + "px";
      });
    }
  };

  /* ---------- Tabs ---------- */
  const Tabs = {
    init() {
      document.addEventListener("click", (e) => {
        const tab = e.target.closest("[data-tab]");
        if (!tab) return;
        const group = tab.closest("[data-tabs]");
        const target = tab.getAttribute("data-tab");
        group.querySelectorAll("[data-tab]").forEach((t) => t.classList.toggle("active", t === tab));
        const panels = group.querySelectorAll(".tab-panel");
        panels.forEach((p) => p.classList.toggle("active", p.getAttribute("data-panel") === target));
        const scope = group.getAttribute("data-tab-scope");
        if (scope) {
          document.querySelectorAll('[data-panel-group="' + scope + '"] .tab-panel').forEach((p) => {
            p.classList.toggle("active", p.getAttribute("data-panel") === target);
          });
        }
      });
    }
  };

  /* ---------- Chips (filter toggles) ---------- */
  const Chips = {
    init() {
      document.addEventListener("click", (e) => {
        const group = e.target.closest("[data-chip-group]");
        const chip = e.target.closest(".chip");
        if (!group || !chip) return;
        if (group.dataset.chipMulti === "true") {
          chip.classList.toggle("active");
        } else {
          group.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
        }
      });
    }
  };

  /* ---------- Copy to clipboard ---------- */
  const Clipboard = {
    init() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-copy]");
        if (!btn) return;
        const sel = btn.getAttribute("data-copy");
        let text = "";
        if (sel === "self") {
          // Copy the nearest message/content block this button lives in,
          // excluding the action buttons themselves (copy/like/regenerate).
          const container = btn.closest(".chat-msg__body") || btn.closest(".card") || btn.parentElement;
          if (container) {
            const clone = container.cloneNode(true);
            const actions = clone.querySelector(".chat-msg__actions");
            if (actions) actions.remove();
            text = clone.innerText.trim();
          }
        } else if (sel) {
          const node = document.querySelector(sel);
          text = node ? node.innerText : "";
        }
        if (!text && btn.getAttribute("data-copy-text")) text = btn.getAttribute("data-copy-text");
        if (!text) return;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => Toast.show("Copied to clipboard", "check", "Done"));
        } else {
          const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
          ta.select(); document.execCommand("copy"); ta.remove();
          Toast.show("Copied to clipboard", "check", "Done");
        }
      });
    }
  };

  /* ---------- Password visibility ---------- */
  const PasswordToggle = {
    init() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-pw-toggle]");
        if (!btn) return;
        const input = document.getElementById(btn.getAttribute("data-pw-toggle"));
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.querySelector(".pw-show").style.display = show ? "none" : "";
        btn.querySelector(".pw-hide").style.display = show ? "" : "none";
      });
    }
  };

  /* ---------- Counter animation ---------- */
  const Counters = {
    init() {
      const els = document.querySelectorAll("[data-count]");
      if (!els.length) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseFloat(el.getAttribute("data-count"));
          const suffix = el.getAttribute("data-suffix") || "";
          const dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
          const dur = 1400;
          const start = performance.now();
          const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.unobserve(el);
        });
      }, { threshold: 0.5 });
      els.forEach((e) => io.observe(e));
    }
  };

  /* ---------- Modal ---------- */
  const Modal = {
    init() {
      document.addEventListener("click", (e) => {
        const open = e.target.closest("[data-modal-open]");
        if (open) { e.preventDefault(); this.open(open.getAttribute("data-modal-open")); return; }
        if (e.target.closest("[data-modal-close]") || e.target.classList.contains("modal-overlay")) { this.close(); return; }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
    },
    open(id) {
      const m = document.getElementById(id);
      if (m) { m.classList.add("open"); document.body.style.overflow = "hidden"; }
    },
    close() {
      document.querySelectorAll(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
      document.body.style.overflow = "";
    }
  };

  /* ---------- Sidebar toggle (app) ---------- */
  const SidebarToggle = {
    init() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-sidebar-toggle]");
        if (!btn) return;
        const sb = document.querySelector(".sidebar");
        const bd = document.querySelector(".sidebar-backdrop");
        const isDesktop = window.matchMedia("(min-width: 1025px)").matches;
        if (isDesktop) {
          // On desktop the sidebar is always visible — the toggle collapses
          // it to an icon-only rail instead of hiding it entirely.
          if (sb) sb.classList.toggle("collapsed");
        } else {
          if (sb) sb.classList.toggle("open");
          if (bd) bd.classList.toggle("open");
        }
      });
      document.addEventListener("click", (e) => {
        if (e.target.classList && e.target.classList.contains("sidebar-backdrop")) {
          document.querySelector(".sidebar").classList.remove("open");
          e.target.classList.remove("open");
        }
      });
    }
  };

  /* ---------- Workspace panel toggles ---------- */
  const WSPanels = {
    init() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-ws-toggle]");
        if (!btn) return;
        const target = document.querySelector(btn.getAttribute("data-ws-toggle"));
        if (target) target.classList.toggle("open");
      });
    }
  };

  /* ---------- Dashboard Data Sync ---------- */
  const DashboardSync = {
    async init() {
      const greetingEl = document.querySelector(".content h1");
      if (!greetingEl || !window.API) return;

      try {
        const userData = await window.API.me();
        if (userData && userData.name) {
          greetingEl.innerHTML = `Good morning, ${userData.name} 👋`;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (error.message && error.message.includes("401")) {
          window.location.href = "../auth/login.html";
        }
      }
    }
  };

  /* ---------- OAuth "coming soon" buttons ---------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-oauth-soon]");
    if (!btn) return;
    const provider = btn.getAttribute("data-oauth-soon");
    if (global.IW && global.IW.Toast) {
      global.IW.Toast.show(`Sign in with ${provider} isn't set up yet — please use email for now.`, "info", "Coming soon");
    }
  });

  /* ---------- Boot ---------- */
  function boot() {
    if (global.Icon && typeof global.Icon.fill === "function") Icon.fill(document);
    Theme.init();
    NavState.init();
    MobileMenu.init();
    Reveal.init();
    Accordion.init();
    Tabs.init();
    Chips.init();
    Clipboard.init();
    PasswordToggle.init();
    Counters.init();
    Modal.init();
    SidebarToggle.init();
    WSPanels.init();
    DashboardSync.init();

    document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const s = document.querySelector('.topbar__search input, [data-cmdk]');
        if (s) s.focus();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  global.IW = global.IW || {};
  Object.assign(global.IW, { Theme, Toast, Reveal, Modal });
})(window);

/* ============================================================
   Profile & Auth Checks
   ============================================================ */
document.addEventListener("DOMContentLoaded", async function () {
  if (window.location.pathname.includes("dashboard.html")) {
    try {
      const token = localStorage.getItem("imole-token");
      if (!token) {
        window.location.href = "../auth/login.html";
        return;
      }

      const res = await fetch((window.API_BASE || "http://127.0.0.1:8000") + "/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const user = await res.json();
        const heading = document.querySelector("h1");
        if (heading && user.name) {
          heading.innerHTML = `Good morning, ${user.name} 👋`;
        }
      } else {
        localStorage.removeItem("imole-token");
        window.location.href = "../auth/login.html";
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  }
});

/* ============================================================
   Project Creation Logic (BULLETPROOF FIX - CAPTURE PHASE)
   ============================================================ */
document.addEventListener("click", async function (e) {
  const target = e.target.closest('button, a, .quick-action');
  if (!target) return;
  
  const text = (target.textContent || "").toLowerCase().trim();
  
  // We removed the href check so it doesn't accidentally trigger on sidebar links!
  if (text.includes("new project") || text.includes("new manuscript")) {
    
    // 1. FREEZE THE BROWSER completely
    e.preventDefault(); 
    e.stopPropagation();
    
    const token = localStorage.getItem("imole-token");
    if (!token) {
        window.location.href = "../auth/login.html";
        return;
    }

    const originalText = target.innerHTML;
    target.innerHTML = "Creating...";
    target.style.pointerEvents = "none";

    try {
        const response = await fetch((window.API_BASE || "http://127.0.0.1:8000") + "/projects/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                title: "Untitled Project",
                description: "A new research project."
            })
        });

        if (response.ok) {
            const newProject = await response.json();
            
            // CRITICAL FIX: Reset the button to its normal state BEFORE we leave the page
            // so it works perfectly if you use the browser's "Back" button!
            target.innerHTML = originalText;
            target.style.pointerEvents = "auto";
            
            window.location.href = "workspace.html?id=" + newProject.id;
            
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Backend Error:", errorData);
            alert("The backend rejected the request. Please check the terminal.");
            target.innerHTML = originalText;
            target.style.pointerEvents = "auto";
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Network error: Could not reach the backend. Make sure Uvicorn is running.");
        target.innerHTML = originalText;
        target.style.pointerEvents = "auto";
    }
  }
}, true);
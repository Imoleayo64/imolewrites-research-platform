/* ============================================================
   ImoleWrites Research Hub — Shared Components (nav, footer, sidebar)
   Mount points: <div data-mount="nav" data-active="home"></div>
   ============================================================ */
(function (global) {
  "use strict";

  function detectBase() {
    const p = location.pathname.replace(/\\/g, "/");
    const dir = p.substring(0, p.lastIndexOf("/"));
    if (dir.endsWith("/app") || dir.endsWith("/auth")) return "../";
    return "./".replace("./", "");
  }
  const BASE = (function () {
    const p = location.pathname.replace(/\\/g, "/");
    const dir = p.substring(0, p.lastIndexOf("/"));
    return dir.endsWith("/app") || dir.endsWith("/auth") ? "../" : "";
  })();

  const logoSVG = function (size) {
    const s = size || 26;
    // Real branded mark: gradient rounded-square (matches the site's own
    // --grad-brand) with a fountain-pen-nib glyph — ties "Writes" directly
    // into the icon, instead of a generic play-triangle inheriting text color.
    return '<span class="logo__mark" style="display:inline-flex;width:' + s + 'px;height:' + s + 'px;">' +
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="imoleLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>' +
      '<rect width="32" height="32" rx="9" fill="url(#imoleLogoGrad)"/>' +
      '<path d="M16 7c-4 0-7 3.2-7 6.8 0 3.6 3 6.6 5.3 8.9L16 25l1.7-2.3c2.3-2.3 5.3-5.3 5.3-8.9C23 10.2 20 7 16 7z" fill="#fff"/>' +
      '<line x1="16" y1="12" x2="16" y2="22" stroke="#2563eb" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="16" cy="13" r="1.3" fill="#2563eb"/>' +
      '</svg></span>';
  };
  const brand = function () {
    return BASE + "index.html";
  };
  const logoHTML = '<a class="logo" href="' + brand() + '" aria-label="ImoleWrites home">' +
    logoSVG() + '<span class="logo__name">Imole<b>Writes</b></span></a>';

  const themeBtn = '<button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">' +
    '<span class="moon">' + Icon.get("moon") + "</span><span class=\"sun\">" + Icon.get("sun") + "</span></button>";

  /* ---------- Public nav ---------- */
  const NAV_LINKS = [
    { id: "home", label: "Home", href: BASE + "index.html" },
    { id: "features", label: "Features", href: BASE + "features.html" },
    { id: "pricing", label: "Pricing", href: BASE + "pricing.html" },
    { id: "about", label: "About", href: BASE + "about.html" },
    { id: "faq", label: "FAQ", href: BASE + "faq.html" },
    { id: "contact", label: "Contact", href: BASE + "contact.html" }
  ];

  function navHTML(active) {
    const links = NAV_LINKS.map(function (l) {
      return '<a class="nav__link' + (l.id === active ? " active" : "") + '" href="' + l.href + '">' + l.label + "</a>";
    }).join("");
    return (
      '<header class="nav">' +
        '<div class="container nav__inner">' +
          '<div class="nav__left">' + logoHTML + "</div>" +
          '<nav class="nav__center" aria-label="Primary">' + links + "</nav>" +
          '<div class="nav__right">' +
            themeBtn +
            '<a class="btn btn-ghost btn-sm desktop-only" href="' + BASE + "auth/login.html" + '">Log in</a>' +
            '<a class="btn btn-primary btn-sm desktop-only" href="' + BASE + "auth/register.html" + '">' + Icon.get("sparkles", { size: 16 }) + "Start Free</a>" +
            '<button class="nav__toggle" data-mobile-open aria-label="Open menu" aria-expanded="false">' + Icon.get("menu") + "</button>" +
          "</div>" +
        "</div>" +
      "</header>"
    );
  }

  function mobileMenuHTML(active) {
    const links = NAV_LINKS.map(function (l) {
      return '<a class="mobile-menu__link' + (l.id === active ? " active" : "") + '" href="' + l.href + '">' + l.label + "</a>";
    }).join("");
    return (
      '<div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu">' +
        '<div class="mobile-menu__head">' +
          '<a class="logo" href="' + brand() + '">' + logoSVG() + '<span class="logo__name">Imole<b>Writes</b></span></a>' +
          '<button class="nav__toggle" data-mobile-close aria-label="Close menu">' + Icon.get("close") + "</button>" +
        "</div>" +
        '<nav class="mobile-menu__links">' + links + "</nav>" +
        '<div class="mobile-menu__foot">' +
          themeBtn +
          '<a class="btn btn-secondary btn-block" href="' + BASE + "auth/login.html" + '">Log in</a>' +
          '<a class="btn btn-primary btn-block" href="' + BASE + "auth/register.html" + '">' + Icon.get("sparkles", { size: 16 }) + "Start Free</a>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- Footer ---------- */
  function footerHTML() {
    const col = function (title, items) {
      return '<div class="footer__col"><h5>' + title + "</h5><ul>" +
        items.map(function (i) { return '<li><a href="' + (i.href || "#") + '">' + i.label + "</a></li>"; }).join("") +
        "</ul></div>";
    };
    const socials = [
      { i: "twitter", href: "#" }, { i: "linkedin", href: "#" },
      { i: "github", href: "#" }, { i: "youtube", href: "#" }
    ].map(function (s) {
      return '<a href="' + s.href + '" aria-label="' + s.i + '">' + Icon.get(s.i, { size: 18 }) + "</a>";
    }).join("");

    return (
      '<footer class="footer">' +
        '<div class="container">' +
          '<div class="footer__top">' +
            '<div class="footer__brand">' +
              '<a class="logo" href="' + brand() + '">' + logoSVG() + '<span class="logo__name">Imole<b>Writes</b></span></a>' +
              "<p>The all-in-one research hub that helps scholars research smarter, write better, and publish faster — powered by AI.</p>" +
              '<div class="social">' + socials + "</div>" +
            "</div>" +
            col("Product", [
              { label: "Features", href: BASE + "features.html" },
              { label: "Pricing", href: BASE + "pricing.html" },
              { label: "AI Assistant", href: BASE + "app/ai-assistant.html" },
              { label: "Literature Search", href: BASE + "app/literature.html" },
              { label: "Citation Manager", href: BASE + "app/citations.html" }
            ]) +
            col("Company", [
              { label: "About Us", href: BASE + "about.html" },
              { label: "Contact", href: BASE + "contact.html" },
              { label: "Careers", href: "#" },
              { label: "Blog", href: "#" },
              { label: "Press", href: "#" }
            ]) +
            col("Resources", [
              { label: "Help Center", href: BASE + "app/help.html" },
              { label: "FAQ", href: BASE + "faq.html" }
            ]) +
            col("Legal", [
              { label: "Privacy Policy", href: BASE + "privacy.html" },
              { label: "Terms of Service", href: BASE + "terms.html" }
            ]) +
          "</div>" +
          '<div class="footer__bottom">' +
            "<p>&copy; <span data-year>2025</span> ImoleWrites Research Hub. All rights reserved.</p>" +
            '<div class="flex items-center gap-3">' +
              '<span class="badge badge-green badge-dot">All systems operational</span>' +
              '<button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">' +
                '<span class="moon">' + Icon.get("moon") + "</span><span class=\"sun\">" + Icon.get("sun") + "</span></button>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</footer>"
    );
  }

  /* ---------- App sidebar ---------- */
  const SIDEBAR_GROUPS = [
    {
      items: [
        { id: "dashboard", label: "Dashboard", icon: "grid", href: BASE + "app/dashboard.html" }
      ]
    },
    {
      label: "Workspace",
      items: [
        { id: "projects", label: "My Projects", icon: "folder", href: BASE + "app/projects.html" },
        { id: "workspace", label: "Research Workspace", icon: "fileText", href: BASE + "app/workspace.html" },
        { id: "assistant", label: "AI Research Assistant", icon: "sparkles", href: BASE + "app/ai-assistant.html" },
        { id: "literature", label: "Literature Search", icon: "bookOpen", href: BASE + "app/literature.html" },
        { id: "citations", label: "Citation Manager", icon: "quote", href: BASE + "app/citations.html" },
        { id: "library", label: "Reference Library", icon: "books", href: BASE + "app/library.html" },
        { id: "pdf", label: "PDF Workspace", icon: "file", href: BASE + "app/pdf-workspace.html" },
        { id: "humanizer", label: "AI Humanizer", icon: "wand", href: BASE + "app/humanizer.html" },
        { id: "journals", label: "Journal Recommendation", icon: "compass", href: BASE + "app/journals.html" },
        { id: "statistics", label: "Statistics Assistant", icon: "chart", href: BASE + "app/statistics.html" },
        { id: "collaboration", label: "Collaboration", icon: "users", href: BASE + "app/collaboration.html" },
        { id: "analytics", label: "Analytics", icon: "trending", href: BASE + "app/analytics.html" }
      ]
    },
    {
      label: "Account",
      items: [
        { id: "settings", label: "Settings", icon: "settings", href: BASE + "app/settings.html" },
        { id: "billing", label: "Billing", icon: "creditCard", href: BASE + "app/billing.html" },
        { id: "help", label: "Help Center", icon: "help", href: BASE + "app/help.html" }
      ]
    },
    {
      label: "Administration",
      items: [
        { id: "admin", label: "Admin Dashboard", icon: "shield", href: BASE + "app/admin.html", badge: "Admin" }
      ]
    }
  ];

  function sidebarHTML(active) {
    let groups = SIDEBAR_GROUPS.map(function (g) {
      const label = g.label ? '<div class="sidebar__group-label">' + g.label + "</div>" : "";
      const items = g.items.map(function (it) {
        const badge = it.badge ? '<span class="badge badge-purple">' + it.badge + "</span>" : "";
        return '<a class="side-link' + (it.id === active ? " active" : "") + '" href="' + it.href + '">' +
          Icon.get(it.icon) + "<span>" + it.label + "</span>" + badge + "</a>";
      }).join("");
      const isAdminGroup = g.label === "Administration";
      const groupAttrs = isAdminGroup ? ' id="adminNavGroup" style="display:none;"' : "";
      return "<div" + groupAttrs + ">" + label + items + "</div>";
    }).join("");

    return (
      '<aside class="sidebar" id="sidebar" aria-label="App navigation">' +
        '<div class="sidebar__head">' +
          '<a class="logo" href="' + brand() + '">' + logoSVG() + '<span class="logo__name">Imole<b>Writes</b></span></a>' +
        "</div>" +
        '<nav class="sidebar__nav">' + groups + "</nav>" +
        '<div class="sidebar__foot">' +
          '<a class="sidebar__user" href="' + BASE + "app/settings.html" + '">' +
            '<div class="avatar md" id="sidebarAvatar">··</div>' +
            '<div class="info"><div class="name" id="sidebarName">Account</div><div class="role" id="sidebarRole"></div></div>' +
            Icon.get("chevronRight", { size: 16 }) +
          "</a>" +
        "</div>" +
      "</aside>"
    );
  }

  function backdropHTML() {
    return '<div class="sidebar-backdrop"></div>';
  }

  /* ---------- App topbar ---------- */
  function topbarHTML(opts) {
    opts = opts || {};
    const title = opts.title || "Dashboard";
    const actions = opts.actions || "";
    return (
      '<header class="topbar">' +
        '<button class="icon-btn sidebar-toggle" data-sidebar-toggle aria-label="Toggle sidebar">' + Icon.get("menu") + "</button>" +
        '<div class="topbar__search input-group">' +
          '<span class="input-icon">' + Icon.get("search") + "</span>" +
          '<input type="text" placeholder="Search projects, papers, chats..." data-cmdk aria-label="Search" />' +
          "<kbd>\u2318K</kbd>" +
        "</div>" +
        '<div class="topbar__actions">' +
          actions +
          themeBtn +
          '<button class="icon-btn" data-modal-open="notifModal" aria-label="Notifications"><span class="dot-badge"></span>' + Icon.get("bell") + "</button>" +
          '<a class="btn btn-primary btn-sm" href="' + BASE + "app/workspace.html" + '">' + Icon.get("plus", { size: 16 }) + "New Project</a>" +
        "</div>" +
      "</header>"
    );
  }

  /* ---------- Shared app modals (notifications, command palette) ---------- */
  function injectAppModals() {
    if (!document.getElementById("notifModal")) {
      const items = [
        { icon: "sparkles", color: "bg-blue", title: "AI draft ready", msg: "Your Methods section draft is complete.", time: "2m ago", dot: true },
        { icon: "quote", color: "bg-teal", title: "Citation updated", msg: "APA reference for Wobbrock et al. added.", time: "18m ago" },
        { icon: "users", color: "bg-purple", title: "New comment", msg: "Dr. Moreau commented on your manuscript.", time: "1h ago" },
        { icon: "compass", color: "bg-amber", title: "Journal match found", msg: "3 new journals match your abstract.", time: "3h ago" }
      ];
      const list = items.map(function (it) {
        return '<div class="list-row" style="padding:14px 0;">' +
          '<div class="icon-tile xs ' + it.color + '" style="width:38px;height:38px;border-radius:10px;">' + Icon.get(it.icon) + "</div>" +
          '<div class="meta"><div class="title">' + it.title + '</div><div class="sub">' + it.msg + '</div></div>' +
          '<div class="text-muted" style="font-size:var(--fs-xs);">' + it.time + (it.dot ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--blue-600);margin-left:8px;"></span>' : "") + "</div>" +
          "</div>";
      }).join("");
      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.id = "notifModal";
      modal.innerHTML =
        '<div class="modal" style="max-width:440px;">' +
        '<div class="flex items-center justify-between" style="margin-bottom:16px;"><h3 style="margin:0;">Notifications</h3><button class="btn btn-ghost btn-xs" data-modal-close>' + Icon.get("close", { size: 14 }) + "</button></div>" +
        '<div style="max-height:360px;overflow-y:auto;">' + list + "</div>" +
        '<div class="text-center" style="margin-top:12px;"><a class="btn btn-soft btn-block btn-sm" href="' + BASE + 'app/analytics.html">View all activity</a></div>' +
        "</div>";
      document.body.appendChild(modal);
    }
  }

  /* ---------- Mounting ---------- */
  function mount() {
    const mounts = document.querySelectorAll("[data-mount]");
    let hasTopbar = false;
    mounts.forEach(function (m) {
      const type = m.getAttribute("data-mount");
      const active = m.getAttribute("data-active") || "";
      switch (type) {
        case "nav": m.innerHTML = navHTML(active); break;
        case "mobile-menu": m.innerHTML = mobileMenuHTML(active); break;
        case "footer": m.innerHTML = footerHTML(active); break;
        case "sidebar": m.innerHTML = sidebarHTML(active); break;
        case "sidebar-backdrop": m.innerHTML = backdropHTML(); break;
        case "topbar": hasTopbar = true; m.outerHTML = topbarHTML({ title: m.getAttribute("data-title") || "" }); break;
      }
    });
    if (global.Icon) Icon.fill(document);
    if (hasTopbar) {
      if (global.Icon) injectAppModals();
      else document.addEventListener("DOMContentLoaded", injectAppModals);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  global.IW = global.IW || {};
  global.IW.BASE = BASE;
})(window);

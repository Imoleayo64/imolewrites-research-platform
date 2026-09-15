/* ============================================================
   ImoleWrites — Help Center page logic
   Real, feature-accurate help content (no fake article counts,
   no fake "system status" claims, no dead "#" links). Articles
   are written for the features that actually exist and work.
   ============================================================ */
(function () {
  "use strict";

  const CATEGORIES = [
    { id: "getting-started", label: "Getting started", icon: "sparkles", tile: "bg-blue" },
    { id: "research-tools", label: "Research tools", icon: "bookOpen", tile: "bg-teal" },
    { id: "citations", label: "Citations", icon: "quote", tile: "bg-purple" },
    { id: "account", label: "Account", icon: "settings", tile: "bg-amber" },
  ];

  const ARTICLES = [
    {
      id: "create-account",
      category: "getting-started",
      icon: "user",
      tile: "bg-blue",
      title: "Creating your account",
      readTime: "2 min read",
      body: `Register with your name, email, and a password from the Register page. Your first registered account on a given deployment is automatically made an admin — every account after that is a regular user.`,
    },
    {
      id: "first-project",
      category: "getting-started",
      icon: "fileText",
      tile: "bg-blue",
      title: "Starting your first project",
      readTime: "3 min read",
      body: `From My Projects, click "New Project" to open the workspace editor. Your work saves to the real backend as you go — you can reopen it anytime from the Projects grid, and set its status (draft, submitted, in review, revisions, published) once you're tracking it toward publication.`,
    },
    {
      id: "literature-search",
      category: "research-tools",
      icon: "search",
      tile: "bg-teal",
      title: "Using Literature Search",
      readTime: "3 min read",
      body: `Search real academic papers via Semantic Scholar directly from the Literature Search page. Filter by open access, recency, or citation count, and sort by relevance, newest, or most cited. Results link out to the actual PDF (when open access) or the DOI page.`,
    },
    {
      id: "ai-assistant",
      category: "research-tools",
      icon: "sparkles",
      tile: "bg-teal",
      title: "Getting the most from the AI Assistant",
      readTime: "3 min read",
      body: `The AI Assistant is powered by Gemini and can help with literature summaries, drafting, methodology questions, and citation help. It's a general research assistant — always double-check any factual claims, statistics, or citations it gives you before relying on them.`,
    },
    {
      id: "humanizer",
      category: "research-tools",
      icon: "wand",
      tile: "bg-teal",
      title: "Rewriting text with the AI Humanizer",
      readTime: "2 min read",
      body: `Paste a passage into the Humanizer, choose a tone (Academic, Professional, Natural, or Simple), and it rewrites it while preserving meaning. Readability scores shown before and after are a real Flesch Reading Ease calculation, not a fabricated metric — and there's no "AI detection" claim here, since reliable AI-detection tools don't really exist yet.`,
    },
    {
      id: "journal-recommendation",
      category: "research-tools",
      icon: "compass",
      tile: "bg-teal",
      title: "Finding the right journal",
      readTime: "2 min read",
      body: `Paste your abstract into Journal Recommendation and it suggests real, currently-publishing journals that fit your topic, with a short rationale for each. It intentionally does not show acceptance rates, impact factors, or APCs — those numbers change often and we'd rather send you to the publisher's own page than guess.`,
    },
    {
      id: "statistics-assistant",
      category: "research-tools",
      icon: "chart",
      tile: "bg-teal",
      title: "Using the Statistics Assistant",
      readTime: "2 min read",
      body: `Chat with the Statistics Assistant about test selection, p-values, or reporting formats, or fill in your study design (goal, variable types, data characteristics) and click "Recommend a test" for an AI-generated suggestion — always verify against your actual data before using it.`,
    },
    {
      id: "doi-lookup",
      category: "citations",
      icon: "link",
      tile: "bg-purple",
      title: "Adding citations by DOI",
      readTime: "2 min read",
      body: `In the Citation Manager, paste a DOI into "Quick add by DOI" and it fetches real metadata from CrossRef — title, authors, year, and venue — then saves it to your library automatically.`,
    },
    {
      id: "citation-styles",
      category: "citations",
      icon: "quote",
      tile: "bg-purple",
      title: "Switching citation styles",
      readTime: "2 min read",
      body: `The Citation Manager supports APA, MLA, Chicago, Harvard, IEEE, and Vancouver. Switch styles with the chips at the top — both your bibliography list and the in-text preview update immediately, computed for each citation you've saved.`,
    },
    {
      id: "profile-settings",
      category: "account",
      icon: "settings",
      tile: "bg-amber",
      title: "Updating your profile",
      readTime: "1 min read",
      body: `In Settings → Profile, you can update your name, institution, field, role, and bio. Your email is fixed to the one you registered with. Password changes and account deletion are under Settings → Security.`,
    },
    {
      id: "billing-early-access",
      category: "account",
      icon: "creditCard",
      tile: "bg-amber",
      title: "How billing works right now",
      readTime: "1 min read",
      body: `ImoleWrites is in early access — every feature is free, and there's no payment processor connected yet. Your Billing page shows real usage stats (AI interactions, citations, projects) but no charges, because there aren't any.`,
    },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const catEl = document.getElementById("helpCategories");
    const listEl = document.getElementById("helpArticleList");
    const searchInput = document.getElementById("helpSearch");
    const modalTitle = document.getElementById("helpArticleTitle");
    const modalBody = document.getElementById("helpArticleBody");

    if (!catEl || !listEl) return;

    let activeCategory = null;

    renderCategories();
    renderArticles();

    searchInput.addEventListener("input", () => renderArticles());

    catEl.addEventListener("click", (e) => {
      const card = e.target.closest("[data-cat]");
      if (!card) return;
      activeCategory = activeCategory === card.dataset.cat ? null : card.dataset.cat;
      renderCategories();
      renderArticles();
    });

    listEl.addEventListener("click", (e) => {
      const row = e.target.closest("[data-article]");
      if (!row) return;
      const article = ARTICLES.find((a) => a.id === row.dataset.article);
      if (!article) return;
      modalTitle.textContent = article.title;
      modalBody.textContent = article.body;
    });

    function renderCategories() {
      catEl.innerHTML = CATEGORIES.map((c) => {
        const count = ARTICLES.filter((a) => a.category === c.id).length;
        const active = activeCategory === c.id;
        return `
        <button class="card card-pad card-hover text-center" data-cat="${c.id}" style="${active ? "border-color:var(--blue-500);" : ""}cursor:pointer;">
          <span class="icon-tile ${c.tile}" style="margin-inline:auto;margin-bottom:12px;"><span data-icon="${c.icon}"></span></span>
          <h4 style="font-size:var(--fs-md);">${c.label}</h4>
          <p class="text-muted" style="font-size:var(--fs-sm);">${count} article${count === 1 ? "" : "s"}</p>
        </button>`;
      }).join("");
      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function renderArticles() {
      const q = searchInput.value.trim().toLowerCase();
      let filtered = ARTICLES;
      if (activeCategory) filtered = filtered.filter((a) => a.category === activeCategory);
      if (q) filtered = filtered.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));

      listEl.innerHTML = filtered.length
        ? filtered
            .map(
              (a) => `
        <div class="list-row" data-article="${a.id}" data-modal-open="helpArticleModal" style="cursor:pointer;">
          <span class="icon-tile xs ${a.tile}" style="width:36px;height:36px;border-radius:9px;"><span data-icon="${a.icon}"></span></span>
          <div class="meta"><div class="title">${escapeHtml(a.title)}</div><div class="sub">${escapeHtml(CATEGORIES.find((c) => c.id === a.category)?.label || "")} · ${escapeHtml(a.readTime)}</div></div>
          <span data-icon="chevronRight" class="text-muted"></span>
        </div>`
            )
            .join("")
        : `<p class="text-muted" style="padding:16px 4px;font-size:var(--fs-sm);">No articles match your search.</p>`;

      if (window.Icon && window.Icon.fill) window.Icon.fill(document);
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

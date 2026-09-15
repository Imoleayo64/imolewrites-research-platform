# ImoleWrites Research Hub

> **Research Smarter. Write Better. Publish Faster.**
> A premium, AI-powered SaaS platform for researchers, students, lecturers, universities, research institutions, journal editors, and academic writers.

A complete, production-quality **frontend** for the ImoleWrites platform — built with semantic HTML, modern CSS (custom properties, glassmorphism, animations), and dependency-free vanilla JavaScript. It is fully responsive, accessible, light/dark themed, and designed to connect to a **FastAPI** backend through REST APIs with no major restructuring.

---

## ✨ Highlights

- **Design language** — Notion × ChatGPT × Linear × Perplexity × Grammarly, with its own elegant identity.
- **Brand** — Deep Blue `#2563EB`, Teal `#14B8A6`, Purple `#7C3AED`, Inter typeface, rounded corners, subtle shadows, glassmorphism, smooth motion.
- **Light & Dark mode** — system-aware, user-toggleable, persisted in `localStorage`.
- **Fully responsive** — desktop, tablet, and mobile with adaptive nav, drawers, and 3-column workspace.
- **Accessible** — skip links, focus states, ARIA labels, reduced-motion support, semantic landmarks.
- **Backend-ready** — a thin `API` client (`assets/js/api.js`) abstracts every call; flip `USE_MOCKS` to `false` and point `API_BASE` at your FastAPI server.

---

## 📁 Project structure

```
imolewrites/
├── index.html              # Home — hero, features, workflow, testimonials, pricing, FAQ
├── features.html           # 10 feature cards
├── pricing.html            # 4 plans + full comparison table
├── about.html              # story, mission, vision, values, team
├── contact.html            # contact form, office info, socials
├── faq.html                # categorized FAQ
├── auth/
│   ├── login.html
│   ├── register.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   └── verify-email.html
├── app/
│   ├── dashboard.html      # stats, recent projects, chats, deadlines, quick actions
│   ├── projects.html       # My Projects grid
│   ├── workspace.html      # ★ 3-column research workspace + editor + AI
│   ├── ai-assistant.html   # ChatGPT-style assistant
│   ├── literature.html     # search + paper cards + filters
│   ├── citations.html      # 6 styles, DOI, BibTeX
│   ├── library.html        # reference library, collections, tags
│   ├── pdf-workspace.html  # viewer, highlights, notes, ask-AI
│   ├── humanizer.html      # tone modes + readability score
│   ├── journals.html       # abstract → ranked journals + checklists
│   ├── statistics.html     # test recommender + reporting templates
│   ├── collaboration.html  # members, comments, tasks, version history
│   ├── analytics.html      # charts (SVG), publication tracking
│   ├── settings.html       # profile, appearance, notifications, API keys, language, security
│   ├── billing.html        # subscription, usage, payment history
│   ├── help.html           # knowledge base + support
│   └── admin.html          # users, revenue, system health, tickets
└── assets/
    ├── css/
    │   ├── tokens.css      # design tokens (color, type, spacing, shadow, motion)
    │   ├── base.css        # reset, typography, utilities, animations
    │   ├── components.css  # buttons, cards, forms, nav, footer, modals, etc.
    │   ├── layout.css      # page sections, dashboard, workspace, auth, charts
    │   └── responsive.css  # breakpoints
    └── js/
        ├── icons.js        # inline SVG icon library + filler
        ├── components.js   # shared nav/footer/sidebar/topbar injection
        ├── app.js          # theme, toasts, reveal, modals, tabs, forms
        ├── charts.js       # lightweight SVG charts (line/bar/donut/spark)
        ├── editor.js       # rich text editor + simulated AI chat
        └── api.js          # ★ FastAPI-ready REST client
```

---

## 🚀 Running locally

It's static — serve the folder with any HTTP server:

```bash
cd imolewrites
python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no dependencies to install.

---

## 🔌 Connecting a FastAPI backend

1. Open **`assets/js/api.js`**.
2. Set `API_BASE` to your server (e.g. `"https://api.imolewrites.com/api"`) and `USE_MOCKS = false`.
3. Call the existing helpers from any page — e.g. `await API.login(email, password)`, `await API.searchPapers(q)`, `await API.chat(messages)`. The UI is already wired to swap mock data for real responses.

Suggested FastAPI routes (the client matches these):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | authenticate, returns `access_token` |
| POST | `/api/auth/register` | create account |
| GET  | `/api/me` | current user profile |
| GET/POST | `/api/projects` | list / create projects |
| GET | `/api/papers?query=` | literature search |
| GET/POST | `/api/citations` | list / create citations |
| POST | `/api/citations/doi/{doi}` | DOI metadata lookup |
| POST | `/api/ai/chat` | assistant reply |
| POST | `/api/humanize` | humanize text + score |
| POST | `/api/journals/recommend` | journal matching |
| GET | `/api/analytics/overview` | dashboard analytics |

The client stores the bearer token in `localStorage` and sends it as `Authorization: Bearer <token>` automatically.

---

## 🧩 Reusable building blocks

- **Layout shell** — every page uses `data-mount="nav|footer|sidebar|topbar"` so chrome is defined once in `components.js`.
- **Components** — `.btn`, `.card`, `.badge`, `.chip`, `.input`, `.accordion`, `.tabs`, `.modal-overlay`, `.toast`, `.progress`, `.avatar`, etc.
- **Icons** — add `<span data-icon="name"></span>` anywhere; `Icon.fill()` swaps them for SVG. See `assets/js/icons.js` for the full set.
- **Charts** — `Charts.line(el, data)`, `Charts.bar(...)`, `Charts.donut(...)`, `Charts.spark(...)` render responsive SVG.

---

## ♿ Accessibility & SEO

- Semantic landmarks (`header`, `nav`, `main`, `footer`, `aside`), skip-to-content link, visible focus rings.
- `prefers-reduced-motion` respected; ARIA labels on icon-only controls.
- Per-page `<title>` and `<meta name="description">`, descriptive headings, favicon as inline SVG.

---

© ImoleWrites Research Hub. Built as a premium, AI-first research workspace.

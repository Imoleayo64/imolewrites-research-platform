/* ============================================================
   ImoleWrites Research Hub — API Client (FastAPI-ready)
   ------------------------------------------------------------
   A thin REST layer. Point API_BASE at your FastAPI server and
   flip USE_MOCKS to false once endpoints are live. The rest of
   the app calls these helpers, so swapping backends requires no
   UI changes.

   Expected FastAPI resource paths (suggestions):
     POST /api/auth/login          -> { access_token, user }
     POST /api/auth/register       -> { access_token, user }
     POST /api/auth/forgot-password
     POST /api/auth/reset-password
     GET  /api/me                  -> user profile
     GET  /api/projects            -> Project[]
     POST /api/projects            -> Project
     GET  /api/papers?query=       -> Paper[]
     GET  /api/citations           -> Citation[]
     POST /api/citations           -> Citation
     POST /api/ai/chat             -> { reply }   (streaming optional)
     POST /api/humanize            -> { text, score }
     POST /api/journals/recommend  -> Journal[]
     GET  /api/analytics/overview  -> stats
   ============================================================ */
(function (global) {
  "use strict";

  const API_BASE = "/api";            // set to e.g. "https://api.imolewrites.com/api"
  const USE_MOCKS = true;             // flip to false when the backend is live

  const TOKEN_KEY = "imole-token";

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  async function request(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    const t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    const res = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal
    });
    if (res.status === 401) { setToken(null); /* redirect to login handled by router */ }
    if (!res.ok) {
      const err = new Error("API " + res.status);
      err.status = res.status;
      try { err.body = await res.json(); } catch (e) {}
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  // ---- Mock helpers (demo data) ----
  const wait = (ms) => new Promise((r) => setTimeout(r, ms || 600));

  const API = {
    config: { API_BASE, USE_MOCKS },
    token, setToken,

    /* ----- Auth ----- */
    async login(email, password) {
      if (USE_MOCKS) { await wait(800); setToken("demo." + btoa(email)); return { access_token: "demo", user: { name: "Imole Ayodele", email } }; }
      const data = await request("/auth/login", { method: "POST", body: { email, password } });
      setToken(data.access_token);
      return data;
    },
    async register(payload) {
      if (USE_MOCKS) { await wait(900); setToken("demo." + btoa(payload.email)); return { access_token: "demo", user: payload }; }
      const data = await request("/auth/register", { method: "POST", body: payload });
      setToken(data.access_token);
      return data;
    },
    logout() { setToken(null); },
    async me() { return request("/me"); },

    /* ----- Projects ----- */
    listProjects() { return USE_MOCKS ? wait().then(() => MOCK.projects) : request("/projects"); },
    createProject(body) { return USE_MOCKS ? wait().then(() => Object.assign({ id: "p" + Date.now() }, body)) : request("/projects", { method: "POST", body }); },

    /* ----- Literature ----- */
    searchPapers(query, filters) { return USE_MOCKS ? wait().then(() => MOCK.papers) : request("/papers" + qs({ query, ...filters })); },

    /* ----- Citations ----- */
    listCitations() { return USE_MOCKS ? wait().then(() => MOCK.citations) : request("/citations"); },
    createCitation(body) { return USE_MOCKS ? wait().then(() => body) : request("/citations", { method: "POST", body }); },
    lookupDOI(doi) { return USE_MOCKS ? wait().then(() => MOCK.citations[0]) : request("/citations/doi/" + encodeURIComponent(doi)); },

    /* ----- AI ----- */
    chat(messages) { return USE_MOCKS ? wait(900).then(() => ({ reply: "This is a simulated, grounded response from your reference library." })) : request("/ai/chat", { method: "POST", body: { messages } }); },
    humanize(text, mode) { return USE_MOCKS ? wait().then(() => ({ text, score: 80 })) : request("/humanize", { method: "POST", body: { text, mode } }); },

    /* ----- Journals ----- */
    recommendJournals(abstract) { return USE_MOCKS ? wait().then(() => MOCK.journals) : request("/journals/recommend", { method: "POST", body: { abstract } }); },

    /* ----- Analytics ----- */
    analyticsOverview() { return USE_MOCKS ? wait().then(() => MOCK.analytics) : request("/analytics/overview"); }
  };

  function qs(obj) {
    const p = new URLSearchParams();
    Object.keys(obj || {}).forEach((k) => { if (obj[k] != null) p.append(k, obj[k]); });
    const s = p.toString();
    return s ? "?" + s : "";
  }

  const MOCK = {
    projects: [
      { id: "p1", title: "Adaptive ML for Climate Modeling", words: 12400, progress: 0.68 },
      { id: "p2", title: "Microbiome & Cognition", words: 8200, progress: 0.42 }
    ],
    papers: [],
    citations: [],
    journals: [],
    analytics: {}
  };

  global.API = API;
})(window);

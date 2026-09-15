/* ============================================================
   ImoleWrites Research Hub — API Client (FastAPI-ready)
   ============================================================ */
(function (global) {
  "use strict";

  // Local testing uses your own machine's backend. Once deployed, replace
  // PRODUCTION_API_BASE below with your real Render backend URL (e.g.
  // "https://imolewrites-backend.onrender.com") — everything else adapts
  // automatically based on which domain the site is loaded from.
  const PRODUCTION_API_BASE = "https://imolewrites-backend.onrender.com";
  const isLocal = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const API_BASE = isLocal ? "http://127.0.0.1:8000" : PRODUCTION_API_BASE;
  const WS_BASE = API_BASE.replace(/^http/, "ws");
  window.API_BASE = API_BASE; // exposed so other scripts' direct fetch() calls stay in sync
  const USE_MOCKS = false;
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
    
    if (res.status === 401) { 
        setToken(null); 
    }
    
    if (!res.ok) {
      const err = new Error("API " + res.status);
      err.status = res.status;
      try { err.body = await res.json(); } catch (e) {}
      throw err;
    }
    
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  async function uploadFile(path, file) {
    const headers = {};
    const t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(API_BASE + path, { method: "POST", headers, body: formData });
    if (res.status === 401) setToken(null);
    if (!res.ok) {
      const err = new Error("API " + res.status);
      err.status = res.status;
      try { err.body = await res.json(); } catch (e) {}
      throw err;
    }
    return res.json();
  }

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
    // FIXED: Pointed to the exact auth router endpoint your backend uses
    async me() { return request("/auth/me"); },
    updateProfile(payload) { return request("/auth/me", { method: "PATCH", body: payload }); },
    changePassword(currentPassword, newPassword) { return request("/auth/change-password", { method: "POST", body: { current_password: currentPassword, new_password: newPassword } }); },
    deleteAccount() { return request("/auth/me", { method: "DELETE" }); },
    uploadAvatar(file) { return uploadFile("/auth/me/avatar", file); },
    avatarUrl(userId) { return `${API_BASE}/auth/me/avatar/${userId}`; },

    /* ----- Projects ----- */
    listProjects() { return USE_MOCKS ? wait().then(() => MOCK.projects) : request("/projects/"); },
    createProject(body) { return USE_MOCKS ? wait().then(() => Object.assign({ id: "p" + Date.now() }, body)) : request("/projects/", { method: "POST", body }); },
    getProject(id) { return request(`/projects/${id}`); },
    deleteProject(id) { return request(`/projects/${id}`, { method: "DELETE" }); },
    updateProjectStatus(id, status, targetJournal) { return request(`/projects/${id}/status`, { method: "PATCH", body: { status, target_journal: targetJournal } }); },

    /* ----- Literature ----- */
    searchPapers(query, filters, signal) { return USE_MOCKS ? wait().then(() => MOCK.papers) : request("/papers" + qs({ query, ...filters }), { signal }); },

    /* ----- Citations ----- */
    listCitations() { return USE_MOCKS ? wait().then(() => MOCK.citations) : request("/citations"); },
    createCitation(body) { return USE_MOCKS ? wait().then(() => body) : request("/citations", { method: "POST", body }); },
    lookupDOI(doi) { return USE_MOCKS ? wait().then(() => MOCK.citations[0]) : request("/citations/doi/" + encodeURIComponent(doi)); },

    /* ----- AI ----- */
    chat(messages) { return USE_MOCKS ? wait(900).then(() => ({ reply: "This is a simulated, grounded response from your reference library." })) : request("/ai/chat", { method: "POST", body: { messages } }); },
    extractText(file) { return uploadFile("/ai/extract-text", file); },
    humanize(text, mode) { return USE_MOCKS ? wait().then(() => ({ text, score: 80 })) : request("/humanize", { method: "POST", body: { text, mode } }); },

    /* ----- Journals ----- */
    recommendJournals(abstract, preferences) { return USE_MOCKS ? wait().then(() => MOCK.journals) : request("/journals/recommend", { method: "POST", body: { abstract, preferences } }); },

    /* ----- Analytics ----- */
    analyticsOverview(days) { return USE_MOCKS ? wait().then(() => MOCK.analytics) : request("/analytics/overview" + (days ? "?days=" + days : "")); },

    /* ----- Admin ----- */
    adminOverview() { return request("/admin/overview"); },

    /* ----- Collaboration ----- */
    listMembers(projectId) { return request(`/projects/${projectId}/members`); },
    inviteMember(projectId, email, role) { return request(`/projects/${projectId}/members`, { method: "POST", body: { email, role: role || "editor" } }); },
    removeMember(projectId, userId) { return request(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }); },
    collabSocketUrl(projectId) { return `${WS_BASE}/collab/${projectId}?token=${encodeURIComponent(token() || "")}`; },

    /* ----- Mendeley ----- */
    mendeleyStatus() { return request("/mendeley/status"); },
    async mendeleyConnect() {
      const data = await request("/mendeley/connect");
      window.location.href = data.url;
    },
    mendeleyDisconnect() { return request("/mendeley/disconnect", { method: "POST" }); },
    mendeleyLibrary() { return request("/mendeley/library"); },
    mendeleyImport(mendeleyId) { return request(`/mendeley/import/${encodeURIComponent(mendeleyId)}`, { method: "POST" }); },

    /* ----- PDF Workspace ----- */
    listPdfs() { return request("/pdfs"); },
    uploadPdf(file) { return uploadFile("/pdfs/upload", file); },
    async pdfFileBlobUrl(pdfId) {
      const headers = {};
      const t = token();
      if (t) headers["Authorization"] = "Bearer " + t;
      const res = await fetch(`${API_BASE}/pdfs/${pdfId}/file`, { headers });
      if (!res.ok) { const err = new Error("API " + res.status); err.status = res.status; throw err; }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
    deletePdf(pdfId) { return request(`/pdfs/${pdfId}`, { method: "DELETE" }); },
    listAnnotations(pdfId) { return request(`/pdfs/${pdfId}/annotations`); },
    addAnnotation(pdfId, payload) { return request(`/pdfs/${pdfId}/annotations`, { method: "POST", body: payload }); },
    deleteAnnotation(annotationId) { return request(`/pdfs/annotations/${annotationId}`, { method: "DELETE" }); },
    askAboutPdf(pdfId, question) { return request(`/pdfs/${pdfId}/ask`, { method: "POST", body: { question } }); },
    pdfStorageInfo() { return request("/pdfs/storage-info"); }
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

  // Populate the shared sidebar footer (avatar/name/role) with the real
  // logged-in user, and reveal the Admin nav group only for real admins.
  // Runs on every page that includes api.js — sidebarHTML() renders neutral
  // placeholders by default so nothing fake is ever shown.
  function populateSidebarIdentity() {
    const token = localStorage.getItem("imole-token") || localStorage.getItem("access_token");
    if (!token) return;
    API.me()
      .then((user) => {
        const nameEl = document.getElementById("sidebarName");
        const roleEl = document.getElementById("sidebarRole");
        const avatarEl = document.getElementById("sidebarAvatar");
        const adminGroup = document.getElementById("adminNavGroup");
        if (nameEl) nameEl.textContent = user.name || user.email || "Account";
        if (roleEl) roleEl.textContent = user.role || "Researcher";
        if (avatarEl) {
          if (user.has_avatar && user.id) {
            avatarEl.style.overflow = "hidden";
            avatarEl.innerHTML = `<img src="${API.avatarUrl(user.id)}?t=${Date.now()}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />`;
          } else {
            const parts = (user.name || "").trim().split(/\s+/);
            const initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
            avatarEl.textContent = initials || (user.email || "?")[0].toUpperCase();
          }
        }
        if (adminGroup && user.is_admin) adminGroup.style.display = "";
      })
      .catch(() => {
        // Not logged in or token expired — leave neutral placeholders as-is.
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populateSidebarIdentity);
  } else {
    populateSidebarIdentity();
  }
})(window);
/* ============================================================
   ImoleWrites — Real-time collaborative editing (Yjs binding)
   ES module, loaded via <script type="module">. Connects the
   workspace's contenteditable editor to a shared Y.Text over a
   WebSocket relay (backend: pycrdt + pycrdt-websocket).

   SCOPING NOTE (read this before extending):
   The shared Y.Text holds the editor's raw innerHTML as one CRDT
   string. This gives real character-level collaborative merging
   (two people typing in different paragraphs works great), but it
   does NOT understand HTML structure — two people editing inside
   the exact same tag at the exact same moment could rarely produce
   malformed markup. A fully robust rich-text CRDT (e.g. Yjs bound
   to ProseMirror/TipTap) is a bigger follow-up project; this is an
   honest, working v1, not a production-grade Google Docs clone.

   "Viewer" role is enforced when inviting collaborators, but is
   NOT yet enforced at this socket layer — anyone who can connect
   can currently send edits. Real read-only enforcement is future
   work, flagged here so it isn't mistaken for already being safe.
   ============================================================ */
import * as Y from "https://cdn.jsdelivr.net/npm/yjs@13/+esm";
import { WebsocketProvider } from "https://cdn.jsdelivr.net/npm/y-websocket@3/+esm";

(async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const editor = document.querySelector("[data-editor]");
  const presenceEl = document.getElementById("collabPresence");
  const statusEl = document.getElementById("collabStatus");

  if (!projectId || !editor || !window.API) return;

  // Wait for editor.js to finish loading the initial document content
  // before we start syncing, so we don't race it with a blank Y.Text.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText("content");

  const wsUrl = window.API.collabSocketUrl(projectId);
  // WebsocketProvider builds "<base>/<room>" itself, so pass the collab
  // endpoint without the project id, and the id as the room name.
  const base = wsUrl.slice(0, wsUrl.lastIndexOf("/"));
  const roomAndQuery = wsUrl.slice(wsUrl.lastIndexOf("/") + 1); // "{id}?token=..."
  const [room, query] = roomAndQuery.split("?");
  const params = Object.fromEntries(new URLSearchParams(query));

  const provider = new WebsocketProvider(base, room, ydoc, { params });

  const colors = ["#2563eb", "#14b8a6", "#7c3aed", "#f59e0b", "#e11d48"];
  const myColor = colors[Math.floor(Math.random() * colors.length)];
  let myName = "You";
  try {
    const me = await window.API.me();
    myName = me.name || me.email || "You";
  } catch (e) {
    /* not fatal — presence just shows a generic name */
  }
  provider.awareness.setLocalStateField("user", { name: myName, color: myColor });

  let applyingRemote = false;

  function setStatus(text, cls) {
    if (!statusEl) return;
    statusEl.style.display = "";
    statusEl.textContent = text;
    statusEl.className = "badge " + cls;
  }

  provider.on("status", (event) => {
    if (event.status === "connected") setStatus("Live", "badge-green");
    else if (event.status === "connecting") setStatus("Connecting…", "badge-amber");
    else setStatus("Offline", "");
  });
  setStatus("Connecting…", "badge-amber");

  // If the room was brand new, the server seeds it from the saved document.
  // If it already had content (another collaborator got there first, or a
  // previous session), take the shared version once synced.
  let handledInitialSync = false;
  provider.on("sync", (isSynced) => {
    if (!isSynced || handledInitialSync) return;
    handledInitialSync = true;
    const shared = ytext.toString();
    if (shared && shared !== editor.innerHTML) {
      applyingRemote = true;
      editor.innerHTML = shared;
      applyingRemote = false;
      editor.dispatchEvent(new Event("input")); // let editor.js update word count / trigger save
    } else if (!shared && editor.innerHTML) {
      // Brand new room, seeded before we connected — push our current content in.
      ydoc.transact(() => ytext.insert(0, editor.innerHTML));
    }
  });

  ytext.observe((_event, transaction) => {
    if (transaction.local) return;
    const shared = ytext.toString();
    if (shared === editor.innerHTML) return;
    applyingRemote = true;
    const caret = saveCaretOffset(editor);
    editor.innerHTML = shared;
    restoreCaretOffset(editor, caret);
    applyingRemote = false;
    editor.dispatchEvent(new Event("input"));
  });

  editor.addEventListener("input", () => {
    if (applyingRemote) return;
    const newVal = editor.innerHTML;
    const oldVal = ytext.toString();
    if (newVal === oldVal) return;
    const [start, end, insert] = diffStrings(oldVal, newVal);
    ydoc.transact(() => {
      if (end > start) ytext.delete(start, end - start);
      if (insert) ytext.insert(start, insert);
    });
  });

  provider.awareness.on("change", renderPresence);
  renderPresence();

  function renderPresence() {
    if (!presenceEl) return;
    const states = Array.from(provider.awareness.getStates().entries()).filter(
      ([clientId]) => clientId !== ydoc.clientID
    );
    presenceEl.innerHTML = states
      .slice(0, 4)
      .map(([, state]) => {
        const user = state.user || { name: "?", color: "#94a3b8" };
        const initial = (user.name || "?").trim()[0]?.toUpperCase() || "?";
        return `<div class="avatar sm tooltip" data-tip="${escapeAttr(user.name)}" style="background:${user.color};border:2px solid var(--surface);margin-left:-6px;color:#fff;">${initial}</div>`;
      })
      .join("");
  }

  function diffStrings(oldStr, newStr) {
    let start = 0;
    const minLen = Math.min(oldStr.length, newStr.length);
    while (start < minLen && oldStr[start] === newStr[start]) start++;
    let oldEnd = oldStr.length;
    let newEnd = newStr.length;
    while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    return [start, oldEnd, newStr.slice(start, newEnd)];
  }

  function saveCaretOffset(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer)) return null;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  }

  function restoreCaretOffset(el, offset) {
    if (offset == null) return;
    const range = document.createRange();
    const sel = window.getSelection();
    let node;
    let pos = 0;
    let found = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while ((node = walker.nextNode())) {
      const next = pos + node.length;
      if (offset <= next) {
        range.setStart(node, offset - pos);
        range.collapse(true);
        found = true;
        break;
      }
      pos = next;
    }
    if (!found) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function escapeAttr(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML.replace(/"/g, "&quot;");
  }

  window.addEventListener("beforeunload", () => {
    provider.disconnect();
  });
})();

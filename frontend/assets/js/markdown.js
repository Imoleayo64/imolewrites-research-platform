/* ============================================================
   ImoleWrites — tiny Markdown renderer for AI responses
   Handles the subset Gemini commonly uses: headers, bold, italic,
   bullet/numbered lists, horizontal rules, inline code, links.
   Not a full CommonMark implementation — just enough so AI replies
   don't show raw ** and ### characters in the chat UI.
   ============================================================ */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function inline(text) {
    let t = escapeHtml(text);
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/__(.+?)__/g, "<strong>$1</strong>");
    t = t.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, "<em>$1</em>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    return t;
  }

  function renderMarkdown(md) {
    if (!md) return "";
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let listType = null; // "ul" | "ol" | null

    function closeList() {
      if (listType) {
        html.push(listType === "ul" ? "</ul>" : "</ol>");
        listType = null;
      }
    }

    for (let raw of lines) {
      const line = raw.trimEnd();

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        closeList();
        html.push("<hr>");
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        const level = h[1].length;
        html.push(`<h${level}>${inline(h[2])}</h${level}>`);
        continue;
      }

      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) {
        if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
        html.push(`<li>${inline(ol[1])}</li>`);
        continue;
      }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
        html.push(`<li>${inline(ul[1])}</li>`);
        continue;
      }

      if (line.trim() === "") {
        closeList();
        continue;
      }

      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
    closeList();
    return html.join("");
  }

  global.renderMarkdown = renderMarkdown;
})(window);

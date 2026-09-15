/* ============================================================
   ImoleWrites — Workspace editor extras
   Table insert + formatting, text-case transformation, and a
   "focus mode" that collapses the side panels for a wider,
   Word-like writing canvas.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const editor = document.querySelector("[data-editor]");
    if (!editor) return;

    initTables(editor);
    initCaseDropdown(editor);
    initFocusMode();
  });

  /* ---------------- Tables ---------------- */
  function initTables(editor) {
    const insertBtn = document.getElementById("insertTableBtn");
    const toolbar = document.getElementById("tableToolbar");
    const addRowBtn = document.getElementById("tblAddRowBtn");
    const delRowBtn = document.getElementById("tblDelRowBtn");
    const addColBtn = document.getElementById("tblAddColBtn");
    const delColBtn = document.getElementById("tblDelColBtn");
    const toggleHeaderBtn = document.getElementById("tblToggleHeaderBtn");
    const deleteBtn = document.getElementById("tblDeleteBtn");
    if (!insertBtn) return;

    let savedRange = null;
    editor.addEventListener("mouseup", saveRange);
    editor.addEventListener("keyup", saveRange);
    function saveRange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }

    insertBtn.addEventListener("click", () => {
      editor.focus();
      const sel = window.getSelection();
      if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      const html =
        '<table><tbody>' +
        '<tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>' +
        '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
        '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
        '</tbody></table><p><br></p>';
      document.execCommand("insertHTML", false, html);
      editor.dispatchEvent(new Event("input"));
    });

    // Show/hide the table context toolbar based on cursor position
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode || !editor.contains(sel.anchorNode)) {
        toolbar.style.display = "none";
        return;
      }
      const cell = closestCell(sel.anchorNode);
      toolbar.style.display = cell ? "flex" : "none";
    });

    function closestCell(node) {
      const el = node.nodeType === 3 ? node.parentElement : node;
      return el ? el.closest("td, th") : null;
    }
    function currentTable() {
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) return null;
      const cell = closestCell(sel.anchorNode);
      return cell ? cell.closest("table") : null;
    }
    function currentCell() {
      const sel = window.getSelection();
      return sel && sel.anchorNode ? closestCell(sel.anchorNode) : null;
    }

    addRowBtn.addEventListener("click", () => {
      const cell = currentCell();
      if (!cell) return;
      const row = cell.parentElement;
      const colCount = row.children.length;
      const newRow = document.createElement("tr");
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement("td");
        td.innerHTML = "&nbsp;";
        newRow.appendChild(td);
      }
      row.after(newRow);
      editor.dispatchEvent(new Event("input"));
    });

    delRowBtn.addEventListener("click", () => {
      const cell = currentCell();
      if (!cell) return;
      const row = cell.parentElement;
      const table = row.closest("table");
      const tbody = row.parentElement;
      if (tbody.children.length > 1) {
        row.remove();
      } else {
        table.remove();
      }
      editor.dispatchEvent(new Event("input"));
    });

    addColBtn.addEventListener("click", () => {
      const cell = currentCell();
      if (!cell) return;
      const table = cell.closest("table");
      const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
      table.querySelectorAll("tr").forEach((row) => {
        const refCell = row.children[cellIndex];
        const isHeaderRow = refCell && refCell.tagName === "TH";
        const newCell = document.createElement(isHeaderRow ? "th" : "td");
        newCell.innerHTML = isHeaderRow ? "New column" : "&nbsp;";
        if (refCell) refCell.after(newCell);
        else row.appendChild(newCell);
      });
      editor.dispatchEvent(new Event("input"));
    });

    delColBtn.addEventListener("click", () => {
      const cell = currentCell();
      if (!cell) return;
      const table = cell.closest("table");
      const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
      const firstRow = table.querySelector("tr");
      if (firstRow.children.length <= 1) {
        table.remove();
      } else {
        table.querySelectorAll("tr").forEach((row) => {
          if (row.children[cellIndex]) row.children[cellIndex].remove();
        });
      }
      editor.dispatchEvent(new Event("input"));
    });

    toggleHeaderBtn.addEventListener("click", () => {
      const table = currentTable();
      if (!table) return;
      const firstRow = table.querySelector("tr");
      if (!firstRow) return;
      const isHeader = firstRow.children[0] && firstRow.children[0].tagName === "TH";
      Array.from(firstRow.children).forEach((cell) => {
        const newCell = document.createElement(isHeader ? "td" : "th");
        newCell.innerHTML = cell.innerHTML;
        cell.replaceWith(newCell);
      });
      editor.dispatchEvent(new Event("input"));
    });

    deleteBtn.addEventListener("click", () => {
      const table = currentTable();
      if (!table) return;
      if (!window.confirm("Delete this table?")) return;
      table.remove();
      toolbar.style.display = "none";
      editor.dispatchEvent(new Event("input"));
    });
  }

  /* ---------------- Text case transform ---------------- */
  function initCaseDropdown(editor) {
    const btn = document.getElementById("caseDropdownBtn");
    const menu = document.getElementById("caseDropdownMenu");
    if (!btn || !menu) return;

    let savedRange = null;
    editor.addEventListener("mouseup", saveRange);
    editor.addEventListener("keyup", saveRange);
    function saveRange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.anchorNode) && !sel.isCollapsed) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#caseDropdown")) menu.style.display = "none";
    });

    menu.querySelectorAll("[data-case]").forEach((item) => {
      item.addEventListener("click", () => {
        menu.style.display = "none";
        if (!savedRange) {
          if (window.IW && window.IW.Toast) window.IW.Toast.show("Select some text first", "alert", "Change case");
          return;
        }
        editor.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);

        const text = sel.toString();
        if (!text) return;
        const transformed = transformCase(text, item.dataset.case);
        document.execCommand("insertText", false, transformed);
        editor.dispatchEvent(new Event("input"));
      });
    });

    function transformCase(text, mode) {
      switch (mode) {
        case "upper":
          return text.toUpperCase();
        case "lower":
          return text.toLowerCase();
        case "title":
          return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        case "sentence":
          return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
        default:
          return text;
      }
    }
  }

  /* ---------------- Focus mode ---------------- */
  function initFocusMode() {
    const btn = document.getElementById("focusModeBtn");
    const workspace = document.querySelector(".workspace");
    if (!btn || !workspace) return;

    btn.addEventListener("click", () => {
      const active = workspace.classList.toggle("focus-mode");
      const iconSpan = btn.querySelector("[data-icon], svg");
      btn.innerHTML = active
        ? '<span data-icon="minimize"></span>'
        : '<span data-icon="maximize"></span>';
      btn.setAttribute("data-tip", active ? "Exit focus mode" : "Focus mode — hide side panels");
      if (window.Icon && window.Icon.fill) window.Icon.fill(btn);
    });
  }
})();

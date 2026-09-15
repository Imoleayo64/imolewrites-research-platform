/* ============================================================
   ImoleWrites — AI Humanizer page logic
   Wires the Humanize button + mode chips to API.humanize(), which
   calls a real Gemini rewrite on the backend and returns a
   Flesch-Reading-Ease readability score for both versions.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const origText = document.getElementById("origText");
    const origWordsEl = document.getElementById("origWords");
    const origScoreEl = document.getElementById("origScore");
    const newScoreEl = document.getElementById("newScore");
    const humanText = document.getElementById("humanText");
    const humanizeBtn = document.getElementById("humanizeBtn");
    const modeGroup = document.getElementById("modeGroup");

    if (!origText || !humanizeBtn) return;

    function countWords(el) {
      const t = (el.innerText || el.textContent || "").trim();
      return t ? t.split(/\s+/).length : 0;
    }
    function updateWordCount() {
      origWordsEl.textContent = countWords(origText) + " words";
    }
    origText.addEventListener("input", updateWordCount);
    updateWordCount();

    humanizeBtn.addEventListener("click", async () => {
      const text = (origText.innerText || origText.textContent || "").trim();
      if (!text) {
        if (window.IW && window.IW.Toast) window.IW.Toast.show("Paste some text first", "alert", "AI Humanizer");
        return;
      }
      const mode = (modeGroup.querySelector(".chip.active") || {}).dataset
        ? modeGroup.querySelector(".chip.active").dataset.mode
        : "academic";

      const oldLabel = humanizeBtn.innerHTML;
      humanizeBtn.disabled = true;
      humanizeBtn.innerHTML = '<span class="spinner"></span> Humanizing...';

      try {
        const data = await window.API.humanize(text, mode);
        humanText.textContent = data.text;
        origScoreEl.textContent = data.original_score;
        newScoreEl.textContent = data.score;

        if (window.IW && window.IW.Toast) window.IW.Toast.show("Text humanized in " + mode + " mode", "check", "Done");
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail
          ? err.body.detail
          : "Couldn't humanize the text right now. Please try again.";
        if (window.IW && window.IW.Toast) window.IW.Toast.show(msg, "alert", "AI Humanizer");
      } finally {
        humanizeBtn.disabled = false;
        humanizeBtn.innerHTML = oldLabel;
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      }
    });
  });
})();

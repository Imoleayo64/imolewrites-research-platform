/* ============================================================
   ImoleWrites — Statistics Assistant page logic
   The chat panel already uses editor.js's Chat module, which now
   calls real Gemini via API.chat() (just needed api.js included).
   This file wires the "Recommend a test" card to the same backend
   with a structured prompt, parsed into a real recommendation.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.API) return;

    const goalSelect = document.getElementById("statGoal");
    const indepSelect = document.getElementById("statIndepVar");
    const depSelect = document.getElementById("statDepVar");
    const chipsGroup = document.getElementById("statDataChips");
    const recBtn = document.getElementById("statRecommendBtn");
    const resultEl = document.getElementById("statRecommendation");

    if (!recBtn) return;

    chipsGroup.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("active");
    });

    recBtn.addEventListener("click", async () => {
      const characteristics = Array.from(chipsGroup.querySelectorAll(".chip.active")).map((c) => c.dataset.val);

      const prompt = `A researcher's study design:
- Research goal: ${goalSelect.value}
- Independent variable: ${indepSelect.value}
- Dependent variable: ${depSelect.value}
- Data characteristics: ${characteristics.join(", ") || "not specified"}

Recommend the single most appropriate statistical test. Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{"test_name": "...", "rationale": "1-2 sentence explanation", "assumptions": ["...", "..."], "min_sample": "e.g. 30 per group", "effect_size": "e.g. Cohen's d", "reporting_template": "example APA-style results sentence with placeholder statistics"}`;

      const oldLabel = recBtn.innerHTML;
      recBtn.disabled = true;
      recBtn.innerHTML = '<span class="spinner"></span> Thinking...';
      resultEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">Analyzing your study design…</p>`;

      try {
        const data = await window.API.chat([{ role: "user", content: prompt }]);
        const parsed = parseJson(data.reply);
        if (!parsed) throw new Error("Couldn't parse recommendation");
        renderRecommendation(parsed);
      } catch (err) {
        console.error(err);
        const msg = err && err.body && err.body.detail
          ? err.body.detail
          : "Couldn't get a recommendation right now. Please try again.";
        resultEl.innerHTML = `<p class="text-muted" style="font-size:var(--fs-sm);">${escapeHtml(msg)}</p>`;
      } finally {
        recBtn.disabled = false;
        recBtn.innerHTML = oldLabel;
        if (window.Icon && window.Icon.fill) window.Icon.fill(document);
      }
    });

    function parseJson(raw) {
      if (!raw) return null;
      let cleaned = raw.trim().replace(/^```(?:json)?|```$/gm, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        return null;
      }
    }

    function renderRecommendation(r) {
      const assumptions = (r.assumptions || []).map((a) => `<li>${escapeHtml(a)}</li>`).join("");
      resultEl.innerHTML = `
        <div class="flex items-center gap-2" style="margin-bottom:8px;"><span class="badge badge-blue">AI-suggested</span></div>
        <h3>${escapeHtml(r.test_name || "Recommended test")}</h3>
        <p class="text-muted" style="font-size:var(--fs-sm);margin-top:6px;">${escapeHtml(r.rationale || "")}</p>
        <div class="grid grid-2 gap-3" style="margin-top:14px;">
          <div><div class="text-muted" style="font-size:var(--fs-xs);">Min. sample</div><div class="fw-semibold" style="font-size:var(--fs-sm);">${escapeHtml(r.min_sample || "—")}</div></div>
          <div><div class="text-muted" style="font-size:var(--fs-xs);">Effect size</div><div class="fw-semibold" style="font-size:var(--fs-sm);">${escapeHtml(r.effect_size || "—")}</div></div>
        </div>
        ${assumptions ? `<div style="margin-top:14px;"><div class="text-muted" style="font-size:var(--fs-xs);margin-bottom:4px;">Assumptions to check</div><ul style="margin:0;padding-left:18px;font-size:var(--fs-sm);">${assumptions}</ul></div>` : ""}
        ${r.reporting_template ? `<div style="margin-top:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;font-family:var(--font-mono);font-size:var(--fs-xs);">${escapeHtml(r.reporting_template)}</div>` : ""}
        <p class="text-muted" style="font-size:var(--fs-xs);margin-top:10px;">AI-generated suggestion — verify against your actual data and study design before using.</p>
      `;
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }
  });
})();

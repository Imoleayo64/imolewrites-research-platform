/* ============================================================
   ImoleWrites — Billing page logic
   No payment processor is wired up yet (that needs a real Stripe
   account), so this just shows real usage stats pulled from the
   same data Analytics uses — no fabricated charges or plan info.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.API) return;

    try {
      const [overview, projects] = await Promise.all([
        window.API.analyticsOverview(365),
        window.API.listProjects(),
      ]);
      setText("billingAiCount", (overview.totals?.ai_interactions ?? 0).toLocaleString());
      setText("billingCitationsCount", (overview.totals?.citations_count ?? 0).toLocaleString());
      setText("billingProjectsCount", (projects.length ?? 0).toLocaleString());
    } catch (err) {
      console.error("Failed to load billing usage:", err);
    }

    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }
  });
})();

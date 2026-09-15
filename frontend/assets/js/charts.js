/* ============================================================
   ImoleWrites Research Hub — Lightweight SVG Charts
   Usage: Charts.line(el, {...}); Charts.bar(...); Charts.donut(...)
   ============================================================ */
(function (global) {
  "use strict";

  const cssVar = (name) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v;
  };
  const palette = () => ({
    blue: cssVar("--blue-500") || "#3b82f6",
    blue600: cssVar("--blue-600") || "#2563eb",
    teal: cssVar("--teal-500") || "#14b8a6",
    purple: cssVar("--purple-500") || "#8b5cf6",
    text3: cssVar("--text-3") || "#64748b",
    border: cssVar("--border") || "#e2e8f0",
    grid: "rgba(148,163,184,0.18)"
  });

  function svg(w, h, content, vb) {
    vb = vb || (w + " " + h);
    return '<svg viewBox="0 0 ' + vb + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img">' + content + "</svg>";
  }
  function uid() { return "g" + Math.random().toString(36).slice(2, 9); }

  const Charts = {
    /* Area + line chart */
    line(el, data, opts) {
      opts = opts || {};
      const W = opts.w || 600, H = opts.h || 260, pad = opts.pad || { t: 20, r: 16, b: 28, l: 36 };
      const c = palette();
      const series = data.series || [{ values: data.values, color: c.blue600, fill: true }];
      const labels = data.labels || [];
      const allVals = series.flatMap((s) => s.values);
      const max = opts.max != null ? opts.max : Math.max.apply(null, allVals) * 1.1;
      const min = opts.min != null ? opts.min : Math.min(0, Math.min.apply(null, allVals));
      const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
      const xAt = (i) => pad.l + (innerW * i) / Math.max(1, (series[0].values.length - 1));
      const yAt = (v) => pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;

      let body = "";
      // grid lines
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const y = pad.t + (innerH * i) / ticks;
        const val = Math.round(max - ((max - min) * i) / ticks);
        body += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="' + c.grid + '" stroke-width="1"/>';
        body += '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="' + c.text3 + '">' + val + "</text>";
      }
      // x labels
      labels.forEach((lb, i) => {
        if (i % Math.ceil(labels.length / 8 || 1) === 0 || labels.length <= 8)
          body += '<text x="' + xAt(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="' + c.text3 + '">' + lb + "</text>";
      });
      // series
      series.forEach((s) => {
        const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
        const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
        if (s.fill) {
          const id = uid();
          const areaD = d + " L" + xAt(s.values.length - 1) + " " + (pad.t + innerH) + " L" + xAt(0) + " " + (pad.t + innerH) + " Z";
          body += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.35"/>' +
            '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/>' +
            "</linearGradient></defs>";
          body += '<path d="' + areaD + '" fill="url(#' + id + ')"/>';
        }
        body += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        pts.forEach((p) => { body += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="var(--surface)" stroke="' + s.color + '" stroke-width="2"/>'; });
      });
      el.innerHTML = svg(W, H, body);
    },

    /* Bar chart */
    bar(el, data, opts) {
      opts = opts || {};
      const W = opts.w || 600, H = opts.h || 260, pad = { t: 16, r: 12, b: 28, l: 36 };
      const c = palette();
      const series = data.series || [{ values: data.values, color: c.blue600 }];
      const labels = data.labels || [];
      const allVals = series.flatMap((s) => s.values);
      const max = Math.max.apply(null, allVals) * 1.12;
      const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
      const groupW = innerW / labels.length;
      const barW = (groupW * 0.6) / series.length;
      let body = "";
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const y = pad.t + (innerH * i) / ticks;
        const val = Math.round(max - (max * i) / ticks);
        body += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="' + c.grid + '"/>';
        body += '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="' + c.text3 + '">' + val + "</text>";
      }
      labels.forEach((lb, i) => {
        const cx = pad.l + groupW * i + groupW / 2;
        body += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="' + c.text3 + '">' + lb + "</text>";
        series.forEach((s, si) => {
          const h = (s.values[i] / max) * innerH;
          const x = cx - (series.length * barW) / 2 + si * barW;
          const id = uid();
          body += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + s.color + '"/><stop offset="100%" stop-color="' + s.color + '" stop-opacity="0.55"/></linearGradient></defs>';
          body += '<rect x="' + x.toFixed(1) + '" y="' + (pad.t + innerH - h).toFixed(1) + '" width="' + (barW - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="url(#' + id + ')"/>';
        });
      });
      el.innerHTML = svg(W, H, body);
    },

    /* Donut chart */
    donut(el, data, opts) {
      opts = opts || {};
      const W = opts.w || 220, H = opts.h || 220, R = 80, r = 54, cx = W / 2, cy = H / 2;
      const colors = data.colors || ["#2563eb", "#14b8a6", "#7c3aed", "#f59e0b", "#ef4444", "#22c55e"];
      const total = data.values.reduce((a, b) => a + b, 0) || 1;
      let body = "";
      let start = -Math.PI / 2;
      data.values.forEach((v, i) => {
        const angle = (v / total) * Math.PI * 2;
        const end = start + angle;
        const large = angle > Math.PI ? 1 : 0;
        const x1 = cx + Math.cos(start) * R, y1 = cy + Math.sin(start) * R;
        const x2 = cx + Math.cos(end) * R, y2 = cy + Math.sin(end) * R;
        const x3 = cx + Math.cos(end) * r, y3 = cy + Math.sin(end) * r;
        const x4 = cx + Math.cos(start) * r, y4 = cy + Math.sin(start) * r;
        const d = "M" + x1 + " " + y1 + " A" + R + " " + R + " 0 " + large + " 1 " + x2 + " " + y2 +
          " L" + x3 + " " + y3 + " A" + r + " " + r + " 0 " + large + " 0 " + x4 + " " + y4 + " Z";
        body += '<path d="' + d + '" fill="' + colors[i % colors.length] + '"/>';
        start = end;
      });
      if (opts.center) {
        body += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="26" font-weight="800" fill="var(--text)">' + (opts.center.value || "") + "</text>";
        body += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="11" fill="var(--text-3)">' + (opts.center.label || "") + "</text>";
      }
      el.innerHTML = svg(W, H, body);
    },

    /* Sparkline */
    spark(el, values, color) {
      const W = 120, H = 36, c = palette();
      color = color || c.blue600;
      const max = Math.max.apply(null, values), min = Math.min.apply(null, values);
      const pts = values.map((v, i) => [(W * i) / (values.length - 1), H - ((v - min) / (max - min || 1)) * (H - 6) - 3]);
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      const id = uid();
      const area = d + " L" + W + " " + H + " L0 " + H + " Z";
      el.innerHTML = svg(W, H, '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.3"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', W + " " + H);
    }
  };

  global.Charts = Charts;
})(window);

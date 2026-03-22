import type { IncomingMessage, ServerResponse } from "node:http";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
import { createTraceViewerService } from "./src/service.js";
import { traceStore } from "./src/store.js";
import type { Trace } from "./src/types.js";

function createHtmlHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<boolean> {
  return async (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trace Viewer - OpenClaw</title>
  <style>
    :root {
      --bg-primary: #0f1117;
      --bg-secondary: #1a1d27;
      --bg-tertiary: #252a37;
      --bg-hover: #2d3344;
      --text-primary: #e4e7ed;
      --text-secondary: #8b92a5;
      --text-muted: #5c6478;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --error: #ef4444;
      --border: #2d3344;
      --font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; line-height: 1.5; }
    .app { display: flex; flex-direction: column; min-height: 100vh; }
    header { background: var(--bg-secondary); border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .logo { display: flex; align-items: center; gap: 0.75rem; }
    .logo svg { width: 28px; height: 28px; color: var(--accent); }
    .logo h1 { font-size: 1.125rem; font-weight: 600; }
    .stats { display: flex; gap: 1.5rem; }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .theme-selector select { cursor: pointer; min-width: 120px; }
    .stat-value { font-size: 1.25rem; font-weight: 600; font-family: var(--font-mono); color: var(--accent); }
    .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    main { flex: 1; display: flex; flex-direction: column; padding: 1.5rem; gap: 1rem; }
    .filters { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .filter-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .filter-input { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--text-primary); min-width: 150px; font-family: inherit; }
    .filter-input:focus { outline: none; border-color: var(--accent); }
    .filter-input::placeholder { color: var(--text-muted); }
    select.filter-input { cursor: pointer; }
    .btn { background: var(--accent); color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s; }
    .btn:hover { background: var(--accent-hover); }
    .btn-secondary { background: var(--bg-tertiary); }
    .btn-secondary:hover { background: var(--bg-hover); }
    .traces-container { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; position: relative; }
    .trace-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
    .trace-card:hover { border-color: var(--accent); background: var(--bg-tertiary); }
    .trace-card.active { border-left: 3px solid var(--warning); }
    .trace-card.completed { border-left: 3px solid var(--success); }
    .trace-card.error { border-left: 3px solid var(--error); }
    .trace-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .trace-id { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
    .trace-status { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 9999px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
    .trace-status.active { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .trace-status.completed { background: rgba(34, 197, 94, 0.15); color: var(--success); }
    .trace-status.error { background: rgba(239, 68, 68, 0.15); color: var(--error); }
    .trace-info { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; font-size: 0.875rem; }
    .trace-info-item { display: flex; align-items: center; gap: 0.375rem; }
    .trace-info-label { color: var(--text-muted); }
    .trace-info-value { color: var(--text-primary); font-family: var(--font-mono); }
    .trace-time { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; font-family: var(--font-mono); }
    .trace-detail-panel { position: absolute; z-index: 200; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; width: 100%; max-height: 70vh; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); margin-top: 0.5rem; }
    .trace-detail-panel::before { content: ''; position: absolute; top: -8px; left: 24px; width: 14px; height: 14px; background: var(--bg-secondary); border-left: 1px solid var(--border); border-top: 1px solid var(--border); transform: rotate(45deg); }
    .trace-detail-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); }
    .trace-detail-title { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
    .trace-detail-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0.25rem; border-radius: 4px; }
    .trace-detail-close:hover { color: var(--text-primary); background: var(--bg-hover); }
    .spans-container { padding: 1rem; max-height: 600px; overflow-y: auto; }
    .span-item { padding: 0.75rem; margin-bottom: 0.5rem; background: var(--bg-tertiary); border-radius: 6px; border-left: 3px solid var(--accent); }
    .span-item.llm_input { border-left-color: #6366f1; }
    .span-item.llm_output { border-left-color: #22c55e; }
    .span-item.tool_call { border-left-color: #f59e0b; }
    .span-item.tool_result { border-left-color: #f97316; }
    .span-item.session_start { border-left-color: #8b5cf6; }
    .span-item.session_end { border-left-color: #ec4899; }
    .span-item.message { border-left-color: #06b6d4; }
    .span-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem; cursor: pointer; }
    .span-header:hover { opacity: 0.8; }
    .span-name { font-weight: 500; font-size: 0.875rem; }
    .span-type { font-size: 0.625rem; padding: 0.125rem 0.375rem; border-radius: 3px; background: var(--bg-hover); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); margin-right: 0.5rem; }
    .span-duration { font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); }
    .span-meta { font-size: 0.75rem; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; display: none; }
    .span-meta.expanded { display: block; }
    .span-meta-item { margin-top: 0.25rem; }
    .span-meta-key { color: var(--text-muted); }
    .span-toggle { font-size: 0.625rem; color: var(--text-muted); margin-left: 0.25rem; }
    .span-toggle.expanded { color: var(--accent); }
    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 2rem; color: var(--text-muted); }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) { .filters { flex-direction: column; align-items: stretch; } .filter-input { width: 100%; } .stats { gap: 1rem; } .trace-info { flex-direction: column; gap: 0.25rem; } }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <h1>Trace Viewer</h1>
      </div>
      <div class="stats">
        <div class="stat"><span class="stat-value" id="stat-traces">-</span><span class="stat-label">Traces</span></div>
        <div class="stat"><span class="stat-value" id="stat-active">-</span><span class="stat-label">Active</span></div>
        <div class="stat"><span class="stat-value" id="stat-spans">-</span><span class="stat-label">Spans</span></div>
      </div>
      <div class="theme-selector">
        <select id="theme-select" class="filter-input">
          <option value="default">Default</option>
          <option value="nord">Nord</option>
          <option value="dracula">Dracula</option>
          <option value="monokai">Monokai</option>
          <option value="solarized-light">Solarized Light</option>
          <option value="gruvbox">Gruvbox</option>
        </select>
      </div>
    </header>
    <main>
      <div class="filters">
        <div class="filter-group"><span class="filter-label">Session</span><input type="text" class="filter-input" id="filter-session" placeholder="Session key..."></div>
        <div class="filter-group"><span class="filter-label">Channel</span><input type="text" class="filter-input" id="filter-channel" placeholder="e.g. telegram"></div>
        <div class="filter-group"><span class="filter-label">Provider</span><input type="text" class="filter-input" id="filter-provider" placeholder="e.g. openai"></div>
        <div class="filter-group"><span class="filter-label">Model</span><input type="text" class="filter-input" id="filter-model" placeholder="e.g. gpt-4o"></div>
        <div class="filter-group"><span class="filter-label">Status</span><select class="filter-input" id="filter-status"><option value="">All</option><option value="active">Active</option><option value="completed">Completed</option><option value="error">Error</option></select></div>
        <button class="btn" id="btn-refresh">Refresh</button>
        <button class="btn btn-secondary" id="btn-clear">Clear</button>
      </div>
      <div class="traces-container" id="traces-container"><div class="loading"><div class="spinner"></div>Loading traces...</div></div>
    </main>
  </div>
  <script>
    const API_BASE = '/api/trace-viewer';
    let traces = [], stats = { totalTraces: 0, activeTraces: 0, totalSpans: 0 }, selectedTraceId = null;
    const themes = {
      default: { '--bg-primary': '#0f1117', '--bg-secondary': '#1a1d27', '--bg-tertiary': '#252a37', '--bg-hover': '#2d3344', '--text-primary': '#e4e7ed', '--text-secondary': '#8b92a5', '--text-muted': '#5c6478', '--accent': '#6366f1', '--accent-hover': '#818cf8', '--success': '#22c55e', '--warning': '#f59e0b', '--error': '#ef4444', '--border': '#2d3344' },
      nord: { '--bg-primary': '#2e3440', '--bg-secondary': '#3b4252', '--bg-tertiary': '#434c5e', '--bg-hover': '#4c566a', '--text-primary': '#eceff4', '--text-secondary': '#d8dee9', '--text-muted': '#8892a4', '--accent': '#88c0d0', '--accent-hover': '#8fbcbb', '--success': '#a3be8c', '--warning': '#ebcb8b', '--error': '#bf616a', '--border': '#4c566a' },
      dracula: { '--bg-primary': '#282a36', '--bg-secondary': '#383a59', '--bg-tertiary': '#44475a', '--bg-hover': '#6272a4', '--text-primary': '#f8f8f2', '--text-secondary': '#e6e6e6', '--text-muted': '#6272a4', '--accent': '#bd93f9', '--accent-hover': '#ff79c6', '--success': '#50fa7b', '--warning': '#f1fa8c', '--error': '#ff5555', '--border': '#44475a' },
      monokai: { '--bg-primary': '#272822', '--bg-secondary': '#3e3d32', '--bg-tertiary': '#49483e', '--bg-hover': '#75715e', '--text-primary': '#f8f8f2', '--text-secondary': '#cfcfc2', '--text-muted': '#75715e', '--accent': '#f92672', '--accent-hover': '#fd971f', '--success': '#a6e22e', '--warning': '#e6db74', '--error': '#f92672', '--border': '#49483e' },
      'solarized-light': { '--bg-primary': '#fdf6e3', '--bg-secondary': '#eee8d5', '--bg-tertiary': '#e4dcc3', '--bg-hover': '#d9ceb0', '--text-primary': '#657b83', '--text-secondary': '#586e75', '--text-muted': '#93a1a1', '--accent': '#268bd2', '--accent-hover': '#2aa198', '--success': '#859900', '--warning': '#b58900', '--error': '#dc322f', '--border': '#ddd6c1' },
      gruvbox: { '--bg-primary': '#282828', '--bg-secondary': '#3c3836', '--bg-tertiary': '#504945', '--bg-hover': '#665c54', '--text-primary': '#ebdbb2', '--text-secondary': '#d5c4a1', '--text-muted': '#a89984', '--accent': '#fabd2f', '--accent-hover': '#feac9d', '--success': '#b8bb26', '--warning': '#fabd2f', '--error': '#fb4934', '--border': '#504945' },
    };
    function applyTheme(name) {
      const root = document.documentElement;
      const theme = themes[name] || themes.default;
      Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    async function fetchTraces() {
      const params = new URLSearchParams();
      const s = document.getElementById('filter-session').value, c = document.getElementById('filter-channel').value, p = document.getElementById('filter-provider').value, m = document.getElementById('filter-model').value, st = document.getElementById('filter-status').value;
      if (s) params.set('sessionKey', s); if (c) params.set('channel', c); if (p) params.set('provider', p); if (m) params.set('model', m); if (st) params.set('status', st);
      params.set('limit', '50');
      try {
        const res = await fetch(API_BASE + '/traces?' + params);
        const data = await res.json();
        traces = data.traces || []; stats = data.stats || stats;
        renderStats(); renderTraces();
      } catch (err) { console.error(err); document.getElementById('traces-container').innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Failed to load traces. Is the trace-viewer plugin enabled?</p></div>'; }
    }
    function renderStats() { document.getElementById('stat-traces').textContent = stats.totalTraces; document.getElementById('stat-active').textContent = stats.activeTraces; document.getElementById('stat-spans').textContent = stats.totalSpans; }
    function renderTraces() {
      const c = document.getElementById('traces-container');
      if (!traces.length) { c.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg><p>No traces found. Start a conversation to see traces here.</p></div>'; return; }
      c.innerHTML = traces.map(t => '<div class="trace-card ' + t.status + '" data-id="' + t.id + '" style="position:relative"><div class="trace-header"><span class="trace-id">' + t.id + '</span><span class="trace-status ' + t.status + '">' + t.status + '</span></div><div class="trace-info">' + (t.sessionKey ? '<div class="trace-info-item"><span class="trace-info-label">Session:</span><span class="trace-info-value">' + t.sessionKey.slice(0, 12) + '...</span></div>' : '') + (t.channel ? '<div class="trace-info-item"><span class="trace-info-label">Channel:</span><span class="trace-info-value">' + t.channel + '</span></div>' : '') + (t.provider ? '<div class="trace-info-item"><span class="trace-info-label">Provider:</span><span class="trace-info-value">' + t.provider + '</span></div>' : '') + (t.model ? '<div class="trace-info-item"><span class="trace-info-label">Model:</span><span class="trace-info-value">' + t.model + '</span></div>' : '') + '<div class="trace-info-item"><span class="trace-info-label">Spans:</span><span class="trace-info-value">' + (t.spans?.length || 0) + '</span></div></div><div class="trace-time">' + formatTime(t.startTime) + (t.endTime ? ' - ' + formatTime(t.endTime) : '') + '</div></div>').join('');
      c.querySelectorAll('.trace-card').forEach(card => card.addEventListener('click', () => selectTrace(card.dataset.id)));
    }
    async function selectTrace(id) {
      if (selectedTraceId === id) { selectedTraceId = null; renderTraces(); return; }
      selectedTraceId = id; renderTraces();
      try { const res = await fetch(API_BASE + '/traces/' + id); const data = await res.json(); showTraceDetail(data.trace); } catch (err) { console.error(err); }
    }
    function showTraceDetail(trace) {
      const existing = document.querySelector('.trace-detail-panel'); if (existing) existing.remove();
      const card = document.querySelector('.trace-card[data-id="' + trace.id + '"]');
      const d = document.createElement('div'); d.className = 'trace-detail-panel';
      d.innerHTML = '<div class="trace-detail-header"><span class="trace-detail-title">' + trace.id.slice(0, 16) + '...</span><button class="trace-detail-close" id="btn-close-detail">&times;</button></div><div class="spans-container" id="spans-container">' + (trace.spans.length ? trace.spans.map((s, i) => '<div class="span-item ' + s.type + '" data-index="' + i + '"><div class="span-header" data-index="' + i + '"><span class="span-name">' + s.name + '</span><span class="span-type">' + s.type + '</span><span class="span-toggle" data-index="' + i + '">&#9658;</span></div>' + (s.durationMs ? '<div class="span-duration">' + s.durationMs + 'ms</div>' : '') + '<div class="span-meta" data-index="' + i + '">' + Object.entries(s.metadata || {}).map(([k, v]) => '<div class="span-meta-item"><span class="span-meta-key">' + k + ':</span> ' + formatMetaValue(v) + '</div>').join('') + '</div></div>').join('') : '<p style="color:var(--text-muted)">No spans</p>') + '</div>';
      if (card) {
        const rect = card.getBoundingClientRect();
        const containerRect = document.getElementById('traces-container').getBoundingClientRect();
        let top = rect.bottom - containerRect.top + 8;
        d.style.top = top + 'px';
        d.style.left = '0px';
      }
      document.getElementById('traces-container').appendChild(d);
      document.getElementById('btn-close-detail').addEventListener('click', () => { d.remove(); selectedTraceId = null; });
      document.querySelectorAll('.span-header[data-index]').forEach(header => {
        header.addEventListener('click', (e) => {
          const idx = header.dataset.index;
          const meta = document.querySelector('.span-meta[data-index="' + idx + '"]');
          const toggle = document.querySelector('.span-toggle[data-index="' + idx + '"]');
          if (meta && toggle) {
            meta.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
            toggle.innerHTML = meta.classList.contains('expanded') ? '&#9660;' : '&#9658;';
          }
        });
      });
    }
    function formatMetaValue(v) { if (v == null) return 'null'; if (typeof v === 'object') return JSON.stringify(v, null, 2); const s = String(v); return s; }
    function formatTime(ts) { if (!ts) return ''; const d = new Date(ts); return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0'); }
    document.getElementById('btn-refresh').addEventListener('click', fetchTraces);
    document.getElementById('btn-clear').addEventListener('click', () => { traces = []; stats = { totalTraces: 0, activeTraces: 0, totalSpans: 0 }; selectedTraceId = null; renderStats(); renderTraces(); });
    let ft; ['filter-session', 'filter-channel', 'filter-provider', 'filter-model', 'filter-status'].forEach(id => { document.getElementById(id).addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(fetchTraces, 300); }); document.getElementById(id).addEventListener('change', fetchTraces); });
    // Theme switching
    const themeSelect = document.getElementById('theme-select');
    const savedTheme = localStorage.getItem('trace-viewer-theme') || 'default';
    applyTheme(savedTheme);
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      applyTheme(theme);
      localStorage.setItem('trace-viewer-theme', theme);
    });
    fetchTraces();
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return true;
  };
}

export default definePluginEntry({
  id: "trace-viewer",
  name: "Trace Viewer",
  description: "Visual trace viewer for OpenClaw model interactions",
  register(api) {
    // Register HTTP routes
    api.registerHttpRoute({
      path: "/trace-viewer",
      auth: "plugin",
      match: "prefix",
      handler: createHtmlHandler(),
    });

    api.registerHttpRoute({
      path: "/api/trace-viewer/traces",
      auth: "plugin",
      match: "prefix",
      handler: async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Extract the part after /api/trace-viewer/traces
        const afterTraces = pathname.replace("/api/trace-viewer/traces", "");

        // If there's a trace ID after /traces/ (e.g., /api/trace-viewer/traces/trace-uuid),
        // handle it as a single trace request
        if (afterTraces && afterTraces !== "/" && req.method === "GET") {
          const traceId = afterTraces.startsWith("/") ? afterTraces.slice(1) : afterTraces;
          if (traceId && traceId !== "traces") {
            const trace = traceStore.getTrace(traceId);
            if (!trace) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Trace not found" }));
              return true;
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ trace }));
            return true;
          }
        }

        // Handle list traces request (GET /api/trace-viewer/traces)
        if (req.method === "GET") {
          const sessionKey = url.searchParams.get("sessionKey") || undefined;
          const sessionId = url.searchParams.get("sessionId") || undefined;
          const channel = url.searchParams.get("channel") || undefined;
          const provider = url.searchParams.get("provider") || undefined;
          const model = url.searchParams.get("model") || undefined;
          const status = url.searchParams.get("status") as Trace["status"] | undefined;
          const limit = parseInt(url.searchParams.get("limit") || "100", 10);
          const offset = parseInt(url.searchParams.get("offset") || "0", 10);

          const traces = traceStore.queryTraces({
            sessionKey,
            sessionId,
            channel,
            provider,
            model,
            status,
            limit,
            offset,
          });

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ traces, stats: traceStore.getStats() }));
          return true;
        }

        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return true;
      },
    });

    api.registerHttpRoute({
      path: "/api/trace-viewer/stats",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(traceStore.getStats()));
          return true;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return true;
      },
    });

    // Debug endpoint to check if hooks are registered
    api.registerHttpRoute({
      path: "/api/trace-viewer/debug",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              traceStoreStats: traceStore.getStats(),
              timestamp: Date.now(),
              message: "Debug endpoint working",
            }),
          );
          return true;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return true;
      },
    });

    // Test endpoint to create a sample trace
    api.registerHttpRoute({
      path: "/api/trace-viewer/test-trace",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (req.method === "POST") {
          const testTraceId = `test-trace-${Date.now()}`;
          const testTrace = {
            id: testTraceId,
            sessionKey: "test-session",
            sessionId: "test-session-id",
            runId: testTraceId,
            agentId: "test-agent",
            channel: "test",
            provider: "openai",
            model: "gpt-4o",
            startTime: Date.now() - 10000,
            endTime: Date.now(),
            status: "completed" as const,
            spans: [
              {
                id: `span-${Date.now()}-1`,
                traceId: testTraceId,
                type: "llm_input" as const,
                name: "Test LLM Input",
                startTime: Date.now() - 10000,
                metadata: { prompt: "test prompt" },
              },
              {
                id: `span-${Date.now()}-2`,
                traceId: testTraceId,
                type: "llm_output" as const,
                name: "Test LLM Output",
                startTime: Date.now() - 5000,
                metadata: { response: "test response" },
              },
            ],
          };
          traceStore.addTrace(testTrace);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, traceId: testTraceId }));
          return true;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return true;
      },
    });

    api.logger.info(
      "[trace-viewer] Plugin registered with hooks: llm_input, llm_output, session_start, session_end, before_tool_call, after_tool_call",
    );

    // Register hooks for trace collection
    api.on("llm_input", (event, ctx) => {
      api.logger.info(
        `[trace-viewer] llm_input hook fired! runId=${event.runId} model=${event.model}`,
      );
      const runId = event.runId;
      const traceId = `trace-${runId}`;

      const trace: Trace = {
        id: traceId,
        sessionKey: ctx.sessionKey || event.sessionId,
        sessionId: event.sessionId,
        runId,
        agentId: ctx.agentId,
        channel: ctx.channelId,
        provider: event.provider,
        model: event.model,
        startTime: Date.now(),
        spans: [],
        status: "active",
      };
      traceStore.addTrace(trace);
      api.logger.info(`[trace-viewer] trace added: ${traceId}`);

      traceStore.addSpan(traceId, {
        id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        traceId,
        type: "llm_input",
        name: `LLM Input: ${event.model}`,
        startTime: Date.now(),
        metadata: {
          prompt: event.prompt,
          systemPrompt: event.systemPrompt,
          historyMessagesCount: event.historyMessages.length,
          imagesCount: event.imagesCount,
        },
      });
    });

    api.on("llm_output", (event, ctx) => {
      const trace = traceStore.getTraceByRunId(event.runId);
      if (!trace) return;

      traceStore.addSpan(trace.id, {
        id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        traceId: trace.id,
        type: "llm_output",
        name: `LLM Output: ${event.model}`,
        startTime: Date.now(),
        metadata: {
          assistantTexts: event.assistantTexts,
          lastAssistant: event.lastAssistant,
          usage: event.usage,
        },
      });

      traceStore.updateTrace(trace.id, {
        status: "completed",
        endTime: Date.now(),
      });
    });

    api.on("before_tool_call", (event, ctx) => {
      const trace = ctx.runId ? traceStore.getTraceByRunId(ctx.runId) : undefined;
      if (!trace) return;

      traceStore.addSpan(trace.id, {
        id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        traceId: trace.id,
        type: "tool_call",
        name: `Tool: ${event.toolName}`,
        startTime: Date.now(),
        metadata: {
          params: event.params,
          toolName: event.toolName,
        },
      });
    });

    api.on("after_tool_call", (event, ctx) => {
      const trace = ctx.runId ? traceStore.getTraceByRunId(ctx.runId) : undefined;
      if (!trace) return;

      const toolSpan = trace.spans
        .filter((s) => s.type === "tool_call" && s.name === `Tool: ${event.toolName}`)
        .pop();

      if (toolSpan) {
        traceStore.updateSpan(trace.id, toolSpan.id, {
          endTime: Date.now(),
          durationMs: event.durationMs,
          metadata: {
            ...toolSpan.metadata,
            result: event.result,
            error: event.error,
          },
        });
      }
    });

    api.on("session_start", (event, ctx) => {
      const traceId = `trace-session-${event.sessionId}`;

      const trace: Trace = {
        id: traceId,
        sessionKey: ctx.sessionKey || event.sessionId,
        sessionId: event.sessionId,
        runId: traceId,
        agentId: ctx.agentId,
        startTime: Date.now(),
        spans: [],
        status: "active",
      };
      traceStore.addTrace(trace);

      traceStore.addSpan(traceId, {
        id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        traceId,
        type: "session_start",
        name: "Session Start",
        startTime: Date.now(),
        metadata: {
          resumedFrom: event.resumedFrom,
        },
      });
    });

    api.on("session_end", (event, ctx) => {
      const trace = traceStore.queryTraces({ sessionId: event.sessionId, limit: 1 })[0];
      if (!trace) return;

      traceStore.addSpan(trace.id, {
        id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        traceId: trace.id,
        type: "session_end",
        name: "Session End",
        startTime: Date.now(),
        metadata: {
          messageCount: event.messageCount,
          durationMs: event.durationMs,
        },
      });

      traceStore.updateTrace(trace.id, {
        status: "completed",
        endTime: Date.now(),
      });
    });

    // Register the service for background processing if needed
    api.registerService(createTraceViewerService());
  },
});

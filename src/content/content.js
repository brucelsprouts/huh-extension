const HOST_ID = 'huh-extension-host';
const CARD_CSS = `
  :host { all: initial; }
  .card {
    position: fixed;
    z-index: 2147483647;
    max-width: 360px;
    min-width: 280px;
    background: #ffffff;
    color: #0a0a0a;
    border: 1px solid #e4e4e7;
    border-radius: 4px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.05);
    font-family: ui-monospace, "JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.55;
    padding: 12px 14px;
    overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    .card {
      background: #111111;
      color: #fafafa;
      border-color: #27272a;
      box-shadow: 0 12px 28px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4);
    }
    button.btn:hover { background: #18181b !important; color: #fafafa !important; }
    .close:hover { background: #18181b !important; color: #fafafa !important; }
  }
  header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 10px; }
  .brand-name {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .brand-sub {
    font-size: 10px;
    color: #71717a;
    margin-top: 2px;
    font-weight: 400;
  }
  .close {
    all: unset;
    cursor: pointer;
    color: #71717a;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .close:hover { background: #f4f4f5; color: #0a0a0a; }
  .body {
    white-space: pre-wrap;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 13.5px;
    line-height: 1.6;
  }
  .actions { display:flex; gap: 2px; margin-top: 10px; align-items:center; flex-wrap: wrap; }
  button.btn {
    all: unset;
    cursor: pointer;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 500;
    padding: 5px 9px;
    border-radius: 3px;
    background: transparent;
    color: #71717a;
    transition: background 0.12s ease, color 0.12s ease;
  }
  button.btn:hover { color: #0a0a0a; background: #f4f4f5; }
  button.btn[disabled] { opacity: 0.4; cursor: not-allowed; }
  .status {
    font-size: 11px;
    color: #0a0a0a;
    margin-left: auto;
    font-weight: 500;
  }
  @media (prefers-color-scheme: dark) {
    .status { color: #fafafa; }
  }
  .error::before { content: "[!] "; font-weight: 700; }
  .loading { display:flex; gap:6px; padding: 10px 0; }
  .loading span {
    width:6px; height:6px; border-radius:50%; background:#0a0a0a;
    opacity: 0.30;
    animation: huh-blink 1.4s infinite;
  }
  .loading span:nth-child(2) { animation-delay: 0.2s; }
  .loading span:nth-child(3) { animation-delay: 0.4s; }
  @media (prefers-color-scheme: dark) {
    .loading span { background: #fafafa; }
  }
  @keyframes huh-blink {
    0%,100% { opacity: 0.15; }
    40%     { opacity: 1; }
  }
`;

function errorMessage(code, detail) {
  if (code === 'RATE_LIMIT' && /limit:\s*0/i.test(detail || '')) {
    return "Project quota is 0. Open Settings → change model, or use a different API key.";
  }
  switch (code) {
    case 'NO_KEY': return "Add your API key in Settings.";
    case 'BAD_KEY': return "Invalid API key.";
    case 'RATE_LIMIT': return "Rate limit hit. Wait ~60 seconds.";
    case 'TOO_LONG': return "Too long. Try a smaller chunk.";
    case 'TOO_SHORT': return "No selection. Try the popup paste mode.";
    case 'NETWORK': return "Network error.";
    case 'SERVER': return "Server error. Try again.";
    default: return "Something went wrong.";
  }
}

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.zIndex = '2147483647';
  document.documentElement.appendChild(host);
  host.attachShadow({ mode: 'open' });
  return host;
}

function positionCard(cardEl) {
  const sel = window.getSelection();
  let rect = null;
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    try { rect = sel.getRangeAt(0).getBoundingClientRect(); } catch (_) { /* ignore */ }
  }
  const margin = 12;
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = margin, left = margin;
  if (rect && rect.width > 0 && rect.height > 0) {
    top = Math.min(rect.bottom + 8, vh - 240);
    left = Math.min(Math.max(rect.left, margin), vw - 380);
  }
  cardEl.style.top = `${Math.max(margin, top)}px`;
  cardEl.style.left = `${Math.max(margin, left)}px`;
}

function renderCard({ state }) {
  const host = ensureHost();
  const root = host.shadowRoot;
  root.innerHTML = `
    <style>${CARD_CSS}</style>
    <div class="card" role="dialog" aria-label="Huh? explanation">
      <header>
        <span class="brand">
          <div class="brand-name">huh?</div>
          <div class="brand-sub">say it like i'm five</div>
        </span>
        <button class="close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="content"></div>
    </div>
  `;
  const cardEl = root.querySelector('.card');
  const content = root.querySelector('.content');
  positionCard(cardEl);

  if (state.kind === 'loading') {
    content.innerHTML = `<div class="loading"><span></span><span></span><span></span></div>`;
  } else if (state.kind === 'result') {
    content.innerHTML = `
      <div class="body"></div>
      <div class="actions">
        <button class="btn" data-action="simpler">↓ simpler</button>
        <button class="btn" data-action="copy">⧉ copy</button>
        <button class="btn" data-action="openSettings">⚙ settings</button>
        <span class="status" data-role="status"></span>
      </div>
    `;
    content.querySelector('.body').textContent = state.explanation;
  } else if (state.kind === 'error') {
    const isKeyErr = state.errorCode === 'NO_KEY' || state.errorCode === 'BAD_KEY';
    const isQuotaZero = state.errorCode === 'RATE_LIMIT' && /limit:\s*0/i.test(state.detail || '');
    const showSettings = isKeyErr || isQuotaZero;
    content.innerHTML = `
      <div class="body error"></div>
      <div class="actions">
        ${showSettings ? '<button class="btn" data-action="openSettings">⚙ settings</button>' : ''}
        <button class="btn" data-action="close">dismiss</button>
      </div>
    `;
    content.querySelector('.body').textContent = errorMessage(state.errorCode, state.detail);
  }

  root.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => handleAction(el.dataset.action));
  });
}

let session = { originalText: '', level: 1 };
let inFlight = false;

function close() {
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
}

async function handleAction(action) {
  if (action === 'close') return close();
  if (action === 'openSettings') {
    chrome.runtime.sendMessage({ type: 'openOptions' }).catch(() => {});
    return;
  }
  if (action === 'simpler') {
    if (!session.originalText || inFlight) return;
    return run(session.originalText, session.level + 1);
  }
  if (action === 'copy') {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    const body = host.shadowRoot.querySelector('.body');
    const status = host.shadowRoot.querySelector('[data-role="status"]');
    if (body) {
      try {
        await navigator.clipboard.writeText(body.textContent || '');
        if (status) {
          status.textContent = 'Copied!';
          setTimeout(() => { if (status) status.textContent = ''; }, 1500);
        }
      } catch (_) {
        if (status) status.textContent = 'Copy failed';
      }
    }
  }
}

async function run(text, level) {
  session = { originalText: text, level };
  inFlight = true;
  renderCard({ state: { kind: 'loading' } });
  try {
    const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
    if (res?.ok) {
      renderCard({ state: { kind: 'result', explanation: res.explanation } });
    } else {
      renderCard({ state: { kind: 'error', errorCode: res?.errorCode || 'UNKNOWN', detail: res?.detail || '' } });
    }
  } finally {
    inFlight = false;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'huh:showCard') {
    const text = (msg.text || '').trim();
    if (!text) {
      renderCard({ state: { kind: 'error', errorCode: 'TOO_SHORT' } });
      sendResponse({ ok: true });
      return;
    }
    run(text, 1);
    sendResponse({ ok: true });
  }
});

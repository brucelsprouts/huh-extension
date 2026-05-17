const HOST_ID = 'huh-extension-host';
const CARD_CSS = `
  :host { all: initial; }
  .card {
    position: fixed;
    z-index: 2147483647;
    max-width: 380px;
    min-width: 280px;
    background: #fbf6ef;
    color: #1f1b2e;
    border: 1.5px solid #ece2d3;
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(31,27,46,0.18), 0 1px 3px rgba(31,27,46,0.08);
    font-family: "Nunito", "Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    padding: 14px 16px;
    animation: huh-pop 0.18s ease-out;
  }
  @media (prefers-color-scheme: dark) {
    .card {
      background: #221d31;
      color: #f6f1ee;
      border-color: #2f2942;
      box-shadow: 0 20px 40px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.3);
    }
    button.btn { border-color: #2f2942 !important; }
    button.btn:hover { background: rgba(165,180,252,0.12) !important; }
    .close:hover { background: rgba(255,255,255,0.06) !important; }
  }
  @keyframes huh-pop {
    from { transform: scale(0.96) translateY(-4px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
  .brand { display:inline-flex; align-items:center; gap: 8px; font-weight: 800; font-size: 14px; letter-spacing: -0.01em; }
  .brand .dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #818cf8 0%, #f472b6 100%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 900;
    font-size: 12px;
    transform: rotate(-6deg);
    box-shadow: 0 1px 2px rgba(31,27,46,0.15);
  }
  .brand .dot::after { content: "?"; line-height: 1; }
  .close {
    all: unset;
    cursor: pointer;
    color: #7a7387;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .close:hover { background: rgba(31,27,46,0.06); color: #1f1b2e; }
  .body { white-space: pre-wrap; }
  .actions { display:flex; gap: 6px; margin-top: 12px; align-items:center; flex-wrap: wrap; }
  button.btn {
    all: unset;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1.5px solid #ece2d3;
    background: transparent;
    color: inherit;
    transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  button.btn:hover { background: rgba(99,102,241,0.08); transform: translateY(-1px); }
  button.btn:active { transform: translateY(0); }
  button.btn[disabled] { opacity: 0.55; cursor: not-allowed; transform: none; }
  button.btn.primary {
    background: linear-gradient(135deg, #818cf8 0%, #f472b6 100%);
    color: #fff;
    border-color: transparent;
  }
  .status { font-size: 12px; color: #7a7387; }
  .error { color: #dc2626; }
  .loading { display:flex; gap:8px; padding: 12px 0; align-items: center; }
  .loading span {
    width:10px; height:10px; border-radius:50%; background:#818cf8;
    animation: huh-bounce 1.1s infinite ease-in-out;
  }
  .loading span:nth-child(2) { background: #f472b6; animation-delay: .18s; }
  .loading span:nth-child(3) { animation-delay: .36s; }
  .thinking-text { font-size: 12px; color: #7a7387; font-style: italic; margin-left: 4px; }
  @keyframes huh-bounce {
    0%,80%,100% { transform: scale(0.5) translateY(0); opacity: 0.4; }
    40% { transform: scale(1) translateY(-4px); opacity: 1; }
  }
`;

function errorMessage(code) {
  switch (code) {
    case 'NO_KEY': return "Add your Gemini API key in Settings to get started.";
    case 'BAD_KEY': return "That key didn't work. Check it in Settings.";
    case 'RATE_LIMIT': return "Gemini is rate-limiting you. Wait a minute.";
    case 'TOO_LONG': return "That's a lot of text! Try a smaller chunk.";
    case 'TOO_SHORT': return "Couldn't read your selection. Try the popup paste mode.";
    case 'NETWORK': return "Can't reach Gemini. Check your internet.";
    case 'SERVER': return "Gemini hiccupped. Try again in a sec.";
    default: return "Something went wrong. Try again.";
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
        <span class="brand"><span class="dot" aria-hidden="true"></span>Huh?</span>
        <button class="close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="content"></div>
    </div>
  `;
  const cardEl = root.querySelector('.card');
  const content = root.querySelector('.content');
  positionCard(cardEl);

  if (state.kind === 'loading') {
    content.innerHTML = `<div class="loading"><span></span><span></span><span></span><span class="thinking-text">Thinking like a 5-year-old…</span></div>`;
  } else if (state.kind === 'result') {
    content.innerHTML = `
      <div class="body"></div>
      <div class="actions">
        <button class="btn" data-action="simpler">Simpler please</button>
        <button class="btn" data-action="copy">Copy</button>
        <span class="status" data-role="status"></span>
      </div>
    `;
    content.querySelector('.body').textContent = state.explanation;
  } else if (state.kind === 'error') {
    const isKeyErr = state.errorCode === 'NO_KEY' || state.errorCode === 'BAD_KEY';
    content.innerHTML = `
      <div class="body error"></div>
      <div class="actions">
        ${isKeyErr ? '<button class="btn" data-action="openSettings">Open Settings</button>' : ''}
        <button class="btn" data-action="close">Dismiss</button>
      </div>
    `;
    content.querySelector('.body').textContent = errorMessage(state.errorCode);
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
      renderCard({ state: { kind: 'error', errorCode: res?.errorCode || 'UNKNOWN' } });
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

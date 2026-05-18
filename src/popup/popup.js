const $paste = document.getElementById('pasteSection');
const $result = document.getElementById('resultSection');
const $input = document.getElementById('pasteInput');
const $explain = document.getElementById('explainBtn');
const $explainLabel = $explain.querySelector('.btn-label');
const $explainLoader = document.getElementById('explainLoader');
const $simpler = document.getElementById('simplerBtn');
const $copy = document.getElementById('copyBtn');
const $back = document.getElementById('backBtn');
const $resultBox = document.getElementById('result');
const $copyStatus = document.getElementById('copyStatus');
const $inlineError = document.getElementById('inlineError');
const $inlineErrorActions = document.getElementById('inlineErrorActions');
const $errorSettings = document.getElementById('errorSettingsBtn');
const $openSettings = document.getElementById('openSettings');
const $openPage = document.getElementById('openPage');
const $historyList = document.getElementById('historyList');
const $historySection = document.getElementById('historySection');

let state = { originalText: '', level: 1, fromHistory: false };
let inFlight = false;

function clearError() {
  $inlineError.hidden = true;
  $inlineError.textContent = '';
  $inlineErrorActions.hidden = true;
}

function showError(msg, withSettings) {
  $inlineError.textContent = msg;
  $inlineError.hidden = false;
  $inlineErrorActions.hidden = !withSettings;
}

function showInput({ focus = false } = {}) {
  $paste.hidden = false;
  $result.hidden = true;
  $simpler.hidden = state.fromHistory;
  if (focus) $input.focus();
}

function showResult() {
  $paste.hidden = true;
  $result.hidden = false;
  $simpler.hidden = state.fromHistory;
  clearError();
}

function setBusy(busy) {
  inFlight = busy;
  $explain.disabled = busy;
  $simpler.disabled = busy;
  if ($explainLabel) $explainLabel.textContent = busy ? 'thinking' : 'explain →';
  if ($explainLoader) $explainLoader.hidden = !busy;
}

function errorMessage(code, detail) {
  if (code === 'RATE_LIMIT' && /limit:\s*0/i.test(detail || '')) {
    return "Your project has zero quota. Try a different model in Settings, or generate a new API key from a new project.";
  }
  switch (code) {
    case 'NO_KEY': return "Add your API key in Settings.";
    case 'BAD_KEY': return "Invalid API key.";
    case 'RATE_LIMIT': return "Rate limit hit. Wait ~60 seconds.";
    case 'TOO_LONG': return "Too long. Try a smaller chunk.";
    case 'TOO_SHORT': return "Enter some text first.";
    case 'NETWORK': return "Network error.";
    case 'SERVER': return "Server error. Try again.";
    default: return "Something went wrong.";
  }
}

async function explain(text, level) {
  if (inFlight) return;
  state = { originalText: text, level, fromHistory: false };
  clearError();
  setBusy(true);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
    if (res?.ok) {
      $resultBox.textContent = res.explanation;
      showResult();
      renderHistory();
    } else {
      const code = res?.errorCode;
      const detail = (res?.detail || '').trim();
      const needsSettings = code === 'NO_KEY' || code === 'BAD_KEY'
        || (code === 'RATE_LIMIT' && /limit:\s*0/i.test(detail));
      showError(errorMessage(code, detail), needsSettings);
    }
  } finally {
    setBusy(false);
  }
}

$explain.addEventListener('click', () => {
  const text = $input.value.trim();
  if (!text) {
    showError(errorMessage('TOO_SHORT'), false);
    return;
  }
  explain(text, 1);
});

$simpler.addEventListener('click', () => {
  if (!state.originalText || state.fromHistory) return;
  explain(state.originalText, state.level + 1);
});

$copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($resultBox.textContent);
    $copyStatus.textContent = 'Copied!';
  } catch (_) {
    $copyStatus.textContent = 'Copy failed';
  }
  setTimeout(() => { $copyStatus.textContent = ''; }, 1500);
});

$back.addEventListener('click', () => {
  $input.value = '';
  state = { originalText: '', level: 1, fromHistory: false };
  showInput({ focus: true });
});

$errorSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
$openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

if ($openPage) {
  if (document.documentElement.dataset.surface === 'page') {
    $openPage.hidden = true;
  } else {
    $openPage.addEventListener('click', () => {
      const url = chrome.runtime?.getURL ? chrome.runtime.getURL('src/page/page.html') : '../page/page.html';
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
      window.close?.();
    });
  }
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function renderHistory() {
  const res = await chrome.runtime.sendMessage({ type: 'getHistory' });
  const items = res?.items || [];
  $historyList.innerHTML = '';
  $historySection.hidden = items.length === 0;
  if (items.length === 0) return;
  for (const item of items) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const preview = document.createElement('span');
    preview.className = 'preview';
    preview.textContent = item.textPreview;
    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = timeAgo(item.ts);
    btn.append(preview, ts);
    btn.addEventListener('click', () => {
      state = { originalText: '', level: item.level, fromHistory: true };
      $resultBox.textContent = item.explanation;
      showResult();
    });
    li.appendChild(btn);
    $historyList.appendChild(li);
  }
}

renderHistory();

const $paste = document.getElementById('pasteSection');
const $result = document.getElementById('resultSection');
const $error = document.getElementById('errorSection');
const $input = document.getElementById('pasteInput');
const $explain = document.getElementById('explainBtn');
const $simpler = document.getElementById('simplerBtn');
const $copy = document.getElementById('copyBtn');
const $back = document.getElementById('backBtn');
const $resultBox = document.getElementById('result');
const $copyStatus = document.getElementById('copyStatus');
const $errorMsg = document.getElementById('errorMsg');
const $errorDetailWrap = document.getElementById('errorDetailWrap');
const $errorDetail = document.getElementById('errorDetail');
const $errorSettings = document.getElementById('errorSettingsBtn');
const $errorBack = document.getElementById('errorBackBtn');
const $openSettings = document.getElementById('openSettings');
const $openPage = document.getElementById('openPage');
const $historyList = document.getElementById('historyList');
const $historySection = document.getElementById('historySection');

let state = { originalText: '', level: 1, fromHistory: false };
let inFlight = false;

function show(section) {
  for (const s of [$paste, $result, $error]) s.hidden = (s !== section);
  $simpler.hidden = state.fromHistory;
}

function setBusy(busy) {
  inFlight = busy;
  $explain.disabled = busy;
  $simpler.disabled = busy;
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
  setBusy(true);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
    if (res?.ok) {
      $resultBox.textContent = res.explanation;
      show($result);
      renderHistory();
    } else {
      const detail = (res?.detail || '').trim();
      $errorMsg.textContent = errorMessage(res?.errorCode, detail);
      const isQuotaZero = res?.errorCode === 'RATE_LIMIT' && /limit:\s*0/i.test(detail);
      $errorSettings.hidden = !(res?.errorCode === 'NO_KEY' || res?.errorCode === 'BAD_KEY' || isQuotaZero);
      if (detail) {
        $errorDetail.textContent = detail;
        $errorDetailWrap.hidden = false;
      } else {
        $errorDetailWrap.hidden = true;
      }
      show($error);
    }
  } finally {
    setBusy(false);
  }
}

$explain.addEventListener('click', () => {
  const text = $input.value.trim();
  if (!text) return;
  explain(text, 1);
});

$simpler.addEventListener('click', () => {
  if (!state.originalText || state.fromHistory) return;
  explain(state.originalText, state.level + 1);
});

$copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText($resultBox.textContent);
  $copyStatus.textContent = 'Copied!';
  setTimeout(() => { $copyStatus.textContent = ''; }, 1500);
});

$back.addEventListener('click', () => show($paste));
$errorBack.addEventListener('click', () => show($paste));
$errorSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
$openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

if ($openPage) {
  // Hide the "open in tab" button when we're already in the page-mode tab.
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
      show($result);
    });
    li.appendChild(btn);
    $historyList.appendChild(li);
  }
}

renderHistory();

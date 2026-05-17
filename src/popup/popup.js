const $paste = document.getElementById('pasteSection');
const $result = document.getElementById('resultSection');
const $loading = document.getElementById('loadingSection');
const $error = document.getElementById('errorSection');
const $input = document.getElementById('pasteInput');
const $explain = document.getElementById('explainBtn');
const $simpler = document.getElementById('simplerBtn');
const $copy = document.getElementById('copyBtn');
const $back = document.getElementById('backBtn');
const $resultBox = document.getElementById('result');
const $copyStatus = document.getElementById('copyStatus');
const $errorMsg = document.getElementById('errorMsg');
const $errorSettings = document.getElementById('errorSettingsBtn');
const $errorBack = document.getElementById('errorBackBtn');
const $openSettings = document.getElementById('openSettings');
const $historyList = document.getElementById('historyList');
const $historyHint = document.getElementById('historyHint');

let state = { originalText: '', level: 1, fromHistory: false };
let inFlight = false;

function show(section) {
  for (const s of [$paste, $result, $loading, $error]) s.hidden = (s !== section);
  $simpler.hidden = state.fromHistory;
}

function setBusy(busy) {
  inFlight = busy;
  $explain.disabled = busy;
  $simpler.disabled = busy;
}

function errorMessage(code) {
  switch (code) {
    case 'NO_KEY': return "Add your Gemini API key to get started.";
    case 'BAD_KEY': return "That key didn't work. Double-check it in Settings.";
    case 'RATE_LIMIT': return "Gemini is rate-limiting you. Wait a minute and try again.";
    case 'TOO_LONG': return "That's a lot of text! Try a smaller chunk.";
    case 'TOO_SHORT': return "Type or paste something to explain first.";
    case 'NETWORK': return "Can't reach Gemini. Check your internet.";
    case 'SERVER': return "Gemini hiccupped. Try again in a sec.";
    default: return "Something went wrong. Try again.";
  }
}

async function explain(text, level) {
  if (inFlight) return;
  state = { originalText: text, level, fromHistory: false };
  setBusy(true);
  show($loading);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
    if (res?.ok) {
      $resultBox.textContent = res.explanation;
      show($result);
      renderHistory();
    } else {
      $errorMsg.textContent = errorMessage(res?.errorCode);
      $errorSettings.hidden = !(res?.errorCode === 'NO_KEY' || res?.errorCode === 'BAD_KEY');
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
  $historyHint.hidden = items.length === 0;
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = "Your aha! moments will land here.";
    $historyList.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `"${item.textPreview}" · ${timeAgo(item.ts)}`;
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

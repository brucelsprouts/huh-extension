import {
  getApiKey, setApiKey,
  getModel, setModel, MODELS,
  getHistoryEnabled, setHistoryEnabled,
  getHistoryLimit, setHistoryLimit,
  getHistory, clearHistory, deleteHistoryItem,
} from '../lib/storage.js';

const $key = document.getElementById('apiKey');
const $toggle = document.getElementById('toggleVisibility');
const $save = document.getElementById('save');
const $status = document.getElementById('status');
const $historyEnabled = document.getElementById('historyEnabled');
const $historyLimit = document.getElementById('historyLimit');
const $historyManager = document.getElementById('historyManager');
const $historyList = document.getElementById('historyList');
const $historyCount = document.getElementById('historyCount');
const $historyEmpty = document.getElementById('historyEmpty');
const $clearHistory = document.getElementById('clearHistory');
const $copyAll = document.getElementById('copyAllHistory');
const $export = document.getElementById('exportHistory');
const $modelSelect = document.getElementById('modelSelect');
const $openPage = document.getElementById('openPage');

if ($openPage) {
  $openPage.addEventListener('click', () => {
    const url = chrome.runtime?.getURL ? chrome.runtime.getURL('src/page/page.html') : '../page/page.html';
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  });
}

async function init() {
  $key.value = await getApiKey();
  populateModels();
  $modelSelect.value = await getModel();
  $historyEnabled.checked = await getHistoryEnabled();
  $historyLimit.value = String(await getHistoryLimit());
  await renderHistory();
}

function populateModels() {
  $modelSelect.innerHTML = '';
  for (const m of MODELS) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    $modelSelect.appendChild(opt);
  }
}

$modelSelect.addEventListener('change', async () => {
  await setModel($modelSelect.value);
  flashStatus(`// model = ${$modelSelect.value}`);
});

$toggle.addEventListener('click', () => {
  if ($key.type === 'password') {
    $key.type = 'text';
    $toggle.textContent = 'hide';
  } else {
    $key.type = 'password';
    $toggle.textContent = 'show';
  }
});

$save.addEventListener('click', async () => {
  await setApiKey($key.value);
  flashStatus('// saved');
});

$historyEnabled.addEventListener('change', async () => {
  await setHistoryEnabled($historyEnabled.checked);
  flashStatus($historyEnabled.checked ? '// history on' : '// history off');
});

$historyLimit.addEventListener('change', async () => {
  let n = parseInt($historyLimit.value, 10);
  if (!Number.isFinite(n)) n = 5;
  n = Math.min(50, Math.max(1, n));
  $historyLimit.value = String(n);
  await setHistoryLimit(n);
  flashStatus(`// limit = ${n}`);
  await renderHistory();
});

$clearHistory.addEventListener('click', async () => {
  if (!confirm('Clear all stored explanations? This cannot be undone.')) return;
  await clearHistory();
  flashStatus('// cleared');
  await renderHistory();
});

$copyAll.addEventListener('click', async () => {
  const items = await getHistory();
  if (items.length === 0) {
    flashStatus('// nothing to copy');
    return;
  }
  const text = formatItems(items);
  try {
    await navigator.clipboard.writeText(text);
    flashStatus(`// copied ${items.length}`);
  } catch (_) {
    flashStatus('// copy failed');
  }
});

$export.addEventListener('click', async () => {
  const items = await getHistory();
  if (items.length === 0) {
    flashStatus('// nothing to export');
    return;
  }
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `huh-history-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  flashStatus(`// exported ${items.length}`);
});

function formatItems(items) {
  return items.map((it, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const date = new Date(it.ts).toISOString();
    return `[${idx}] ${date}\n--- text ---\n${it.textPreview}\n--- explanation (level ${it.level}) ---\n${it.explanation}\n`;
  }).join('\n');
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
  const items = await getHistory();
  $historyList.innerHTML = '';
  if (items.length === 0) {
    $historyManager.hidden = true;
    $historyEmpty.hidden = false;
    return;
  }
  $historyManager.hidden = false;
  $historyEmpty.hidden = true;
  $historyCount.textContent = `// ${items.length} stored`;

  for (const item of items) {
    const li = document.createElement('li');

    const row = document.createElement('div');
    row.className = 'history-row';

    const idx = document.createElement('span');
    idx.className = 'index';
    row.appendChild(idx);

    const preview = document.createElement('span');
    preview.className = 'preview';
    preview.textContent = item.textPreview;
    row.appendChild(preview);

    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = timeAgo(item.ts);
    row.appendChild(ts);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'del';
    del.title = 'Delete this entry';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteHistoryItem(item.id);
      flashStatus('// removed');
      await renderHistory();
    });
    row.appendChild(del);

    li.appendChild(row);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toggle';
    toggle.textContent = '// show explanation';
    toggle.addEventListener('click', () => {
      const open = li.classList.toggle('expanded');
      toggle.textContent = open ? '// hide explanation' : '// show explanation';
    });
    li.appendChild(toggle);

    const exp = document.createElement('p');
    exp.className = 'history-expl';
    exp.textContent = item.explanation;
    li.appendChild(exp);

    $historyList.appendChild(li);
  }
}

function flashStatus(text) {
  $status.textContent = text;
  setTimeout(() => { $status.textContent = ''; }, 2000);
}

init();

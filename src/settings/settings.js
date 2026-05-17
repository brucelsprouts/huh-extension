import {
  getApiKey, setApiKey,
  getHistoryEnabled, setHistoryEnabled,
  clearHistory,
} from '../lib/storage.js';

const $key = document.getElementById('apiKey');
const $toggle = document.getElementById('toggleVisibility');
const $save = document.getElementById('save');
const $status = document.getElementById('status');
const $historyEnabled = document.getElementById('historyEnabled');
const $clearHistory = document.getElementById('clearHistory');

async function init() {
  $key.value = await getApiKey();
  $historyEnabled.checked = await getHistoryEnabled();
}

$toggle.addEventListener('click', () => {
  if ($key.type === 'password') {
    $key.type = 'text';
    $toggle.textContent = 'Hide';
  } else {
    $key.type = 'password';
    $toggle.textContent = 'Show';
  }
});

$save.addEventListener('click', async () => {
  await setApiKey($key.value);
  flashStatus('Saved.');
});

$historyEnabled.addEventListener('change', async () => {
  await setHistoryEnabled($historyEnabled.checked);
  flashStatus($historyEnabled.checked ? 'History on.' : 'History off.');
});

$clearHistory.addEventListener('click', async () => {
  await clearHistory();
  flashStatus('History cleared.');
});

function flashStatus(text) {
  $status.textContent = text;
  setTimeout(() => { $status.textContent = ''; }, 1800);
}

init();
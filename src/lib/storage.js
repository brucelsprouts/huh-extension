const KEYS = {
  apiKey: 'apiKey',
  historyEnabled: 'historyEnabled',
  history: 'history',
};

const HISTORY_LIMIT = 5;

export async function getApiKey() {
  const out = await chrome.storage.local.get(KEYS.apiKey);
  return out[KEYS.apiKey] || '';
}

export async function setApiKey(value) {
  await chrome.storage.local.set({ [KEYS.apiKey]: (value || '').trim() });
}

export async function getHistoryEnabled() {
  const out = await chrome.storage.local.get(KEYS.historyEnabled);
  return out[KEYS.historyEnabled] !== false;
}

export async function setHistoryEnabled(enabled) {
  await chrome.storage.local.set({ [KEYS.historyEnabled]: !!enabled });
}

export async function getHistory() {
  const out = await chrome.storage.local.get(KEYS.history);
  return Array.isArray(out[KEYS.history]) ? out[KEYS.history] : [];
}

export async function clearHistory() {
  await chrome.storage.local.set({ [KEYS.history]: [] });
}

export async function pushHistory({ text, explanation, level }) {
  const enabled = await getHistoryEnabled();
  if (!enabled) return;
  const items = await getHistory();
  const item = {
    id: crypto.randomUUID(),
    textPreview: (text || '').slice(0, 120),
    explanation,
    level,
    ts: Date.now(),
  };
  const next = [item, ...items].slice(0, HISTORY_LIMIT);
  await chrome.storage.local.set({ [KEYS.history]: next });
}

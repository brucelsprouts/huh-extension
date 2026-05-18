const KEYS = {
  apiKey: 'apiKey',
  model: 'model',
  historyEnabled: 'historyEnabled',
  historyLimit: 'historyLimit',
  history: 'history',
};

export const MODELS = [
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (recommended)' },
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
  { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
];
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

const DEFAULT_HISTORY_LIMIT = 5;
const MIN_HISTORY_LIMIT = 1;
const MAX_HISTORY_LIMIT = 50;

export async function getApiKey() {
  const out = await chrome.storage.local.get(KEYS.apiKey);
  return out[KEYS.apiKey] || '';
}

export async function setApiKey(value) {
  await chrome.storage.local.set({ [KEYS.apiKey]: (value || '').trim() });
}

export async function getModel() {
  const out = await chrome.storage.local.get(KEYS.model);
  const m = out[KEYS.model];
  if (!m || !MODELS.some(x => x.id === m)) return DEFAULT_MODEL;
  return m;
}

export async function setModel(value) {
  if (!MODELS.some(x => x.id === value)) return;
  await chrome.storage.local.set({ [KEYS.model]: value });
}

export async function getHistoryEnabled() {
  const out = await chrome.storage.local.get(KEYS.historyEnabled);
  return out[KEYS.historyEnabled] !== false;
}

export async function setHistoryEnabled(enabled) {
  await chrome.storage.local.set({ [KEYS.historyEnabled]: !!enabled });
}

export async function getHistoryLimit() {
  const out = await chrome.storage.local.get(KEYS.historyLimit);
  const raw = Number(out[KEYS.historyLimit]);
  if (!Number.isFinite(raw) || raw < MIN_HISTORY_LIMIT) return DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.floor(raw));
}

export async function setHistoryLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  const clamped = Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, Math.floor(n)));
  await chrome.storage.local.set({ [KEYS.historyLimit]: clamped });
  // Trim existing history to the new limit
  const items = await getHistory();
  if (items.length > clamped) {
    await chrome.storage.local.set({ [KEYS.history]: items.slice(0, clamped) });
  }
}

export async function getHistory() {
  const out = await chrome.storage.local.get(KEYS.history);
  return Array.isArray(out[KEYS.history]) ? out[KEYS.history] : [];
}

export async function clearHistory() {
  await chrome.storage.local.set({ [KEYS.history]: [] });
}

export async function deleteHistoryItem(id) {
  const items = await getHistory();
  const next = items.filter(it => it.id !== id);
  await chrome.storage.local.set({ [KEYS.history]: next });
}

export async function pushHistory({ text, explanation, level }) {
  const enabled = await getHistoryEnabled();
  if (!enabled) return;
  const limit = await getHistoryLimit();
  const items = await getHistory();
  const item = {
    id: crypto.randomUUID(),
    textPreview: (text || '').slice(0, 120),
    explanation,
    level,
    ts: Date.now(),
  };
  const next = [item, ...items].slice(0, limit);
  await chrome.storage.local.set({ [KEYS.history]: next });
}

export { DEFAULT_HISTORY_LIMIT, MIN_HISTORY_LIMIT, MAX_HISTORY_LIMIT };

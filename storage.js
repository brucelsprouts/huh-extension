// localStorage-backed storage for the web version. Mirrors the API of src/lib/storage.js.

const KEYS = {
  apiKey: 'huh:apiKey',
  model: 'huh:model',
  historyEnabled: 'huh:historyEnabled',
  historyLimit: 'huh:historyLimit',
  history: 'huh:history',
};

export const MODELS = [
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (recommended)' },
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
  { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
];
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_HISTORY_LIMIT = 5;
export const MIN_HISTORY_LIMIT = 1;
export const MAX_HISTORY_LIMIT = 50;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function getApiKey() {
  return localStorage.getItem(KEYS.apiKey) || '';
}

export async function setApiKey(value) {
  localStorage.setItem(KEYS.apiKey, (value || '').trim());
}

export async function getModel() {
  const m = localStorage.getItem(KEYS.model);
  if (!m || !MODELS.some(x => x.id === m)) return DEFAULT_MODEL;
  return m;
}

export async function setModel(value) {
  if (!MODELS.some(x => x.id === value)) return;
  localStorage.setItem(KEYS.model, value);
}

export async function getHistoryEnabled() {
  const raw = localStorage.getItem(KEYS.historyEnabled);
  if (raw == null) return true;
  return raw !== 'false';
}

export async function setHistoryEnabled(enabled) {
  localStorage.setItem(KEYS.historyEnabled, enabled ? 'true' : 'false');
}

export async function getHistoryLimit() {
  const raw = Number(localStorage.getItem(KEYS.historyLimit));
  if (!Number.isFinite(raw) || raw < MIN_HISTORY_LIMIT) return DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.floor(raw));
}

export async function setHistoryLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  const clamped = Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, Math.floor(n)));
  localStorage.setItem(KEYS.historyLimit, String(clamped));
  const items = await getHistory();
  if (items.length > clamped) writeJSON(KEYS.history, items.slice(0, clamped));
}

export async function getHistory() {
  const items = readJSON(KEYS.history, []);
  return Array.isArray(items) ? items : [];
}

export async function clearHistory() {
  writeJSON(KEYS.history, []);
}

export async function deleteHistoryItem(id) {
  const items = await getHistory();
  writeJSON(KEYS.history, items.filter(it => it.id !== id));
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
  writeJSON(KEYS.history, [item, ...items].slice(0, limit));
}

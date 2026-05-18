export const MAX_INPUT_CHARS = 30000;
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_DELAY_MS = 1200;

function urlFor(model) {
  return `${GEMINI_BASE}/${encodeURIComponent(model || DEFAULT_MODEL)}:generateContent`;
}

export function precheckInput(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return 'TOO_SHORT';
  if (text.length > MAX_INPUT_CHARS) return 'TOO_LONG';
  return null;
}

export function classifyError(info) {
  if (info?.networkError) return 'NETWORK';
  const status = info?.status;
  if (status === 401 || status === 403) return 'BAD_KEY';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500 && status < 600) return 'SERVER';
  return 'UNKNOWN';
}

async function fetchOnce({ apiKey, model, body, fetchImpl }) {
  let response;
  try {
    response = await fetchImpl(`${urlFor(model)}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { networkError: true, detail: String(err) };
  }
  return { response };
}

export async function callGemini({ apiKey, model, system, user, fetchImpl = fetch, sleep = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  if (!apiKey) return { ok: false, errorCode: 'NO_KEY' };

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.6 },
  };

  let attempt = await fetchOnce({ apiKey, model, body, fetchImpl });
  if (attempt.networkError) {
    return { ok: false, errorCode: 'NETWORK', detail: attempt.detail };
  }

  // One automatic retry on 429 — Gemini's free tier rate-limits aggressively in short bursts.
  if (attempt.response.status === 429) {
    await sleep(RETRY_DELAY_MS);
    attempt = await fetchOnce({ apiKey, model, body, fetchImpl });
    if (attempt.networkError) {
      return { ok: false, errorCode: 'NETWORK', detail: attempt.detail };
    }
  }

  const response = attempt.response;
  if (!response.ok) {
    const errorCode = classifyError({ status: response.status });
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* ignore */ }
    return { ok: false, errorCode, detail };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return { ok: false, errorCode: 'UNKNOWN', detail: 'Invalid JSON from Gemini' };
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('').trim();
  if (!text) {
    return { ok: false, errorCode: 'UNKNOWN', detail: 'Empty response from Gemini' };
  }

  return { ok: true, explanation: text };
}

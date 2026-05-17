export const MAX_INPUT_CHARS = 30000;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

export async function callGemini({ apiKey, system, user, fetchImpl = fetch }) {
  if (!apiKey) {
    return { ok: false, errorCode: 'NO_KEY' };
  }

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.6 },
  };

  let response;
  try {
    response = await fetchImpl(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, errorCode: classifyError({ networkError: true }), detail: String(err) };
  }

  if (!response.ok) {
    const errorCode = classifyError({ status: response.status });
    let detail = '';
    try {
      detail = await response.text();
    } catch (_) {
      /* ignore */
    }
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

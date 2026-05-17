# "Huh?" Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Git policy:** The user (brucelsprouts) handles all git operations themselves. Where steps say "verify", do **not** run `git add`/`git commit`/`git push`. Leave commits to the user.

**Goal:** Build a Manifest V3 Chrome extension ("Huh?") that explains highlighted or pasted text in ELI5 language via Gemini, with a floating in-page card, a popup paste mode, local history (last 5), and a settings page for the API key.

**Architecture:** Service worker owns Gemini calls and history writes. Content script renders a shadow-DOM-scoped floating card on selections. Popup handles paste mode and history. Settings stores the API key in `chrome.storage.local`. Pure `lib/` modules (prompts, error classifier) are node-testable via the built-in `node --test` runner — zero npm dependencies.

**Tech Stack:** Chrome MV3, vanilla JavaScript (no bundler), Gemini 2.0 Flash REST API, `chrome.storage.local`, `node:test` for unit tests on pure modules.

---

## File Structure

To be created:

```
huh-extension/
├── manifest.json                    Task 1
├── .gitignore                       Task 1
├── LICENSE                          Task 1
├── README.md                        Task 10
├── icons/icon16.png                 Task 1 (placeholder)
├── icons/icon48.png                 Task 1
├── icons/icon128.png                Task 1
├── src/
│   ├── shared/theme.css             Task 2
│   ├── lib/
│   │   ├── prompts.js               Task 3
│   │   ├── gemini.js                Task 4
│   │   └── storage.js               Task 5
│   ├── background/service-worker.js Task 6
│   ├── settings/
│   │   ├── settings.html            Task 7
│   │   ├── settings.css             Task 7
│   │   └── settings.js              Task 7
│   ├── popup/
│   │   ├── popup.html               Task 8
│   │   ├── popup.css                Task 8
│   │   └── popup.js                 Task 8
│   └── content/
│       ├── content.js               Task 9
│       └── content.css              Task 9
├── tests/
│   ├── prompts.test.mjs             Task 3
│   └── gemini.test.mjs              Task 4
└── docs/manual-test.md              Task 10
```

---

## Task 1: Scaffolding (manifest, icons, gitignore, license)

**Files:**
- Create: `manifest.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` (placeholders)

- [ ] **Step 1: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/
package-lock.json

# Environment / secrets
.env
.env.local
*.key
config.local.json

# Build outputs
dist/
build/
*.zip

# IDE / OS
.vscode/
.idea/
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Misc
.cache/
tmp/
```

- [ ] **Step 2: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 brucelsprouts

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Create placeholder icons**

Use any 1x1 transparent PNG for now (real icons are out-of-scope for v1 code; user can swap them later). On Windows PowerShell, generate a minimal PNG with:

```powershell
$png = [byte[]]@(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,0x89,0x00,0x00,0x00,0x0D,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82)
New-Item -ItemType Directory -Force -Path icons | Out-Null
[IO.File]::WriteAllBytes("icons/icon16.png", $png)
[IO.File]::WriteAllBytes("icons/icon48.png", $png)
[IO.File]::WriteAllBytes("icons/icon128.png", $png)
```

- [ ] **Step 4: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Huh?",
  "version": "0.1.0",
  "description": "Highlight any text and get it explained like you're 5. Powered by Gemini.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_title": "Huh?",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "options_page": "src/settings/settings.html",
  "permissions": ["storage", "contextMenus", "scripting"],
  "host_permissions": ["https://generativelanguage.googleapis.com/*"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "css": ["src/content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["src/shared/theme.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- [ ] **Step 5: Verify manifest loads in Chrome**

Open `chrome://extensions`, enable Developer mode, click "Load unpacked", select the repo folder. Expected: extension appears named "Huh?" with no manifest errors. The popup icon is present but clicking it shows an empty popup (popup.html doesn't exist yet — that's fine; we'll fix this in Task 8). If there are manifest errors, fix them before moving on.

---

## Task 2: Shared theme CSS

**Files:**
- Create: `src/shared/theme.css`

- [ ] **Step 1: Create `src/shared/theme.css`**

```css
:root {
  --huh-bg: #ffffff;
  --huh-bg-elevated: #f9fafb;
  --huh-text: #111827;
  --huh-text-muted: #6b7280;
  --huh-border: #e5e7eb;
  --huh-accent: #6366f1;
  --huh-accent-hover: #4f46e5;
  --huh-accent-fg: #ffffff;
  --huh-danger: #dc2626;
  --huh-radius: 10px;
  --huh-radius-sm: 6px;
  --huh-shadow: 0 8px 24px rgba(17, 24, 39, 0.12);
  --huh-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --huh-bg: #1f2937;
    --huh-bg-elevated: #111827;
    --huh-text: #f3f4f6;
    --huh-text-muted: #9ca3af;
    --huh-border: #374151;
    --huh-accent: #818cf8;
    --huh-accent-hover: #a5b4fc;
    --huh-accent-fg: #111827;
    --huh-danger: #f87171;
    --huh-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
}
```

- [ ] **Step 2: Verify file exists**

Confirm the file is on disk. Nothing renders it yet — Tasks 7/8 will import it.

---

## Task 3: `lib/prompts.js` with tests

**Files:**
- Create: `src/lib/prompts.js`
- Create: `tests/prompts.test.mjs`

- [ ] **Step 1: Write failing tests for `buildPrompt`**

Create `tests/prompts.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, SYSTEM_PROMPT } from '../src/lib/prompts.js';

test('buildPrompt at level 1 returns system prompt + text', () => {
  const out = buildPrompt('photosynthesis', 1);
  assert.equal(out.system, SYSTEM_PROMPT);
  assert.match(out.user, /photosynthesis/);
});

test('buildPrompt at level >= 2 includes simpler instruction with level number', () => {
  const out = buildPrompt('photosynthesis', 3);
  assert.match(out.system, /level 3/);
  assert.match(out.system, /level 2/);
  assert.match(out.user, /photosynthesis/);
});

test('buildPrompt throws on empty text', () => {
  assert.throws(() => buildPrompt('', 1), /empty/i);
  assert.throws(() => buildPrompt('   ', 1), /empty/i);
});

test('buildPrompt throws on invalid level', () => {
  assert.throws(() => buildPrompt('x', 0), /level/i);
  assert.throws(() => buildPrompt('x', -1), /level/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/prompts.test.mjs`
Expected: FAIL — `src/lib/prompts.js` doesn't exist.

- [ ] **Step 3: Implement `src/lib/prompts.js`**

```javascript
export const SYSTEM_PROMPT = [
  "You are a warm, encouraging tutor who explains things to a literal 5-year-old.",
  "Rules:",
  "- Use short, simple sentences.",
  "- Prefer everyday analogies (animals, food, toys, family).",
  "- Avoid jargon. If a technical term is unavoidable, define it inline in parentheses using simpler words.",
  "- Be kind and encouraging, never condescending.",
  "- If the input isn't really text to explain (e.g. a bare URL with no context, or a single word with no meaning given), say so gently and ask for more.",
].join('\n');

export function buildPrompt(text, level) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Input text is empty.');
  }
  if (!Number.isInteger(level) || level < 1) {
    throw new Error('Level must be a positive integer.');
  }

  let system = SYSTEM_PROMPT;
  if (level >= 2) {
    system +=
      `\n\nYou already explained this at level ${level - 1}. ` +
      `Explain it at level ${level} — even shorter sentences, even more familiar comparisons, fewer concepts per sentence. ` +
      `Do not repeat your earlier wording verbatim. ` +
      `Pretend the listener is younger and more tired than before.`;
  }

  const user = `Please explain this:\n\n${text}`;
  return { system, user };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/prompts.test.mjs`
Expected: PASS — 4 tests pass.

---

## Task 4: `lib/gemini.js` with error classifier tests

**Files:**
- Create: `src/lib/gemini.js`
- Create: `tests/gemini.test.mjs`

- [ ] **Step 1: Write failing tests for error classifier**

Create `tests/gemini.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyError, MAX_INPUT_CHARS, precheckInput } from '../src/lib/gemini.js';

test('classifyError 401 -> BAD_KEY', () => {
  assert.equal(classifyError({ status: 401 }), 'BAD_KEY');
});

test('classifyError 403 -> BAD_KEY', () => {
  assert.equal(classifyError({ status: 403 }), 'BAD_KEY');
});

test('classifyError 429 -> RATE_LIMIT', () => {
  assert.equal(classifyError({ status: 429 }), 'RATE_LIMIT');
});

test('classifyError 500 -> SERVER', () => {
  assert.equal(classifyError({ status: 500 }), 'SERVER');
});

test('classifyError network error -> NETWORK', () => {
  assert.equal(classifyError({ networkError: true }), 'NETWORK');
});

test('classifyError unknown -> UNKNOWN', () => {
  assert.equal(classifyError({ status: 418 }), 'UNKNOWN');
});

test('precheckInput rejects empty', () => {
  assert.equal(precheckInput(''), 'TOO_SHORT');
  assert.equal(precheckInput('   '), 'TOO_SHORT');
});

test('precheckInput rejects too-long text', () => {
  const big = 'a'.repeat(MAX_INPUT_CHARS + 1);
  assert.equal(precheckInput(big), 'TOO_LONG');
});

test('precheckInput accepts normal text', () => {
  assert.equal(precheckInput('hello world'), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/gemini.test.mjs`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/lib/gemini.js`**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/gemini.test.mjs`
Expected: PASS — 9 tests pass.

- [ ] **Step 5: Run all tests together**

Run: `node --test tests/`
Expected: PASS — 13 tests total (4 from prompts + 9 from gemini).

---

## Task 5: `lib/storage.js`

**Files:**
- Create: `src/lib/storage.js`

(Not unit-tested — `chrome.storage` is a runtime API; we exercise this via manual smoke testing.)

- [ ] **Step 1: Create `src/lib/storage.js`**

```javascript
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
```

- [ ] **Step 2: Verify file exists**

Confirm the file is on disk. It will be exercised when the service worker imports it in Task 6.

---

## Task 6: Background service worker

**Files:**
- Create: `src/background/service-worker.js`

- [ ] **Step 1: Create `src/background/service-worker.js`**

```javascript
import { buildPrompt } from '../lib/prompts.js';
import { callGemini, precheckInput } from '../lib/gemini.js';
import { getApiKey, getHistory, clearHistory, pushHistory } from '../lib/storage.js';

const CONTEXT_MENU_ID = 'huh-explain-selection';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Explain with Huh?',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  if (!tab?.id) return;
  const text = info.selectionText || '';
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'huh:showCard', text });
  } catch (err) {
    // Content script may not be loaded (e.g. chrome:// pages). Open the popup paste flow instead.
    console.warn('Huh?: could not message content script', err);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    console.error('Huh?: handler error', err);
    sendResponse({ ok: false, errorCode: 'UNKNOWN', detail: String(err) });
  });
  return true; // keep channel open for async response
});

async function handleMessage(msg) {
  switch (msg?.type) {
    case 'explain':
      return doExplain(msg.text, msg.level || 1);
    case 'getHistory':
      return { ok: true, items: await getHistory() };
    case 'clearHistory':
      await clearHistory();
      return { ok: true };
    default:
      return { ok: false, errorCode: 'UNKNOWN', detail: 'Unknown message type' };
  }
}

async function doExplain(text, level) {
  const pre = precheckInput(text);
  if (pre) return { ok: false, errorCode: pre };

  const apiKey = await getApiKey();
  if (!apiKey) return { ok: false, errorCode: 'NO_KEY' };

  let promptParts;
  try {
    promptParts = buildPrompt(text, level);
  } catch (err) {
    return { ok: false, errorCode: 'UNKNOWN', detail: String(err) };
  }

  const result = await callGemini({
    apiKey,
    system: promptParts.system,
    user: promptParts.user,
  });

  if (result.ok) {
    await pushHistory({ text, explanation: result.explanation, level });
  }
  return result;
}
```

- [ ] **Step 2: Reload the extension**

In `chrome://extensions`, click the refresh icon on the Huh? card. Click "service worker" link → DevTools opens for the worker. Expected: no errors in the console. The context menu "Explain with Huh?" appears when you right-click selected text on a normal webpage (the message will fail until Task 9, but the menu itself should be there).

---

## Task 7: Settings page

**Files:**
- Create: `src/settings/settings.html`
- Create: `src/settings/settings.css`
- Create: `src/settings/settings.js`

- [ ] **Step 1: Create `src/settings/settings.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Huh? — Settings</title>
  <link rel="stylesheet" href="../shared/theme.css" />
  <link rel="stylesheet" href="settings.css" />
</head>
<body>
  <main class="container">
    <header>
      <h1>Huh? Settings</h1>
      <p class="subtitle">Your key and history live on this device only.</p>
    </header>

    <section class="card">
      <h2>Gemini API key</h2>
      <p class="hint">
        Get a free key at
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com</a>,
        then paste it below.
      </p>
      <div class="row">
        <input id="apiKey" type="password" placeholder="Paste your Gemini API key" autocomplete="off" />
        <button id="toggleVisibility" type="button" class="ghost">Show</button>
      </div>
      <div class="row">
        <button id="save" class="primary" type="button">Save</button>
        <span id="status" class="status" aria-live="polite"></span>
      </div>
    </section>

    <section class="card">
      <h2>History</h2>
      <label class="switch">
        <input id="historyEnabled" type="checkbox" />
        <span>Remember what I've looked up (last 5)</span>
      </label>
      <p class="hint">Stored locally, never sent anywhere.</p>
      <button id="clearHistory" class="danger" type="button">Clear history</button>
    </section>
  </main>
  <script type="module" src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/settings/settings.css`**

```css
body {
  background: var(--huh-bg);
  color: var(--huh-text);
  font-family: var(--huh-font);
  margin: 0;
  padding: 32px 16px;
}
.container { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
header h1 { margin: 0 0 4px; font-size: 24px; }
header .subtitle { margin: 0; color: var(--huh-text-muted); }
.card {
  background: var(--huh-bg-elevated);
  border: 1px solid var(--huh-border);
  border-radius: var(--huh-radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card h2 { margin: 0; font-size: 16px; }
.hint { margin: 0; color: var(--huh-text-muted); font-size: 13px; }
.hint a { color: var(--huh-accent); }
.row { display: flex; gap: 8px; align-items: center; }
input[type="password"], input[type="text"] {
  flex: 1;
  padding: 10px 12px;
  border-radius: var(--huh-radius-sm);
  border: 1px solid var(--huh-border);
  background: var(--huh-bg);
  color: var(--huh-text);
  font-family: var(--huh-font);
  font-size: 14px;
}
button {
  font-family: var(--huh-font);
  font-size: 14px;
  border-radius: var(--huh-radius-sm);
  padding: 10px 14px;
  border: 1px solid var(--huh-border);
  background: var(--huh-bg);
  color: var(--huh-text);
  cursor: pointer;
}
button.primary { background: var(--huh-accent); color: var(--huh-accent-fg); border-color: transparent; }
button.primary:hover { background: var(--huh-accent-hover); }
button.ghost { background: transparent; }
button.danger { color: var(--huh-danger); border-color: var(--huh-border); align-self: flex-start; }
.switch { display: flex; gap: 10px; align-items: center; cursor: pointer; }
.status { color: var(--huh-text-muted); font-size: 13px; }
```

- [ ] **Step 3: Create `src/settings/settings.js`**

```javascript
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
```

- [ ] **Step 4: Verify settings page**

Reload the extension. Right-click the Huh? toolbar icon → "Options". Expected: page loads with empty key field, history checkbox checked, no console errors. Paste any string, click Save, reload the page → the value persists. Toggle the checkbox → it persists.

---

## Task 8: Popup (paste mode + history)

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.css`
- Create: `src/popup/popup.js`

- [ ] **Step 1: Create `src/popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Huh?</title>
  <link rel="stylesheet" href="../shared/theme.css" />
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header>
    <h1>Huh?</h1>
    <button id="openSettings" class="icon-btn" title="Settings" type="button">⚙</button>
  </header>

  <section id="pasteSection">
    <textarea id="pasteInput" rows="6" placeholder="Paste anything confusing here…"></textarea>
    <div class="actions">
      <button id="explainBtn" class="primary" type="button">Explain it to me</button>
    </div>
  </section>

  <section id="resultSection" hidden>
    <div id="result" class="result"></div>
    <div class="actions">
      <button id="simplerBtn" class="ghost" type="button">Simpler please</button>
      <button id="copyBtn" class="ghost" type="button">Copy</button>
      <button id="backBtn" class="ghost" type="button">Back</button>
      <span id="copyStatus" class="status" aria-live="polite"></span>
    </div>
  </section>

  <section id="loadingSection" hidden>
    <div class="loading"><span></span><span></span><span></span></div>
  </section>

  <section id="errorSection" hidden>
    <p id="errorMsg" class="error"></p>
    <div class="actions">
      <button id="errorSettingsBtn" class="primary" type="button" hidden>Open Settings</button>
      <button id="errorBackBtn" class="ghost" type="button">Back</button>
    </div>
  </section>

  <section id="historySection">
    <h2>Recent</h2>
    <ul id="historyList" class="history"></ul>
  </section>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/popup/popup.css`**

```css
body {
  width: 360px;
  margin: 0;
  font-family: var(--huh-font);
  background: var(--huh-bg);
  color: var(--huh-text);
  padding: 14px;
  box-sizing: border-box;
}
header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
header h1 { margin: 0; font-size: 20px; }
.icon-btn {
  background: transparent;
  border: none;
  color: var(--huh-text-muted);
  font-size: 18px;
  cursor: pointer;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid var(--huh-border);
  border-radius: var(--huh-radius-sm);
  background: var(--huh-bg-elevated);
  color: var(--huh-text);
  font-family: var(--huh-font);
  font-size: 14px;
  resize: vertical;
}
.actions { display: flex; gap: 6px; margin-top: 8px; align-items: center; flex-wrap: wrap; }
button {
  font-family: var(--huh-font);
  font-size: 13px;
  border-radius: var(--huh-radius-sm);
  padding: 8px 12px;
  border: 1px solid var(--huh-border);
  background: var(--huh-bg);
  color: var(--huh-text);
  cursor: pointer;
}
button.primary { background: var(--huh-accent); color: var(--huh-accent-fg); border-color: transparent; }
button.primary:hover { background: var(--huh-accent-hover); }
button.ghost { background: transparent; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.result {
  background: var(--huh-bg-elevated);
  border: 1px solid var(--huh-border);
  border-radius: var(--huh-radius);
  padding: 12px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.loading { display: flex; gap: 6px; justify-content: center; padding: 24px; }
.loading span {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--huh-accent);
  animation: huh-bounce 1s infinite ease-in-out;
}
.loading span:nth-child(2) { animation-delay: 0.15s; }
.loading span:nth-child(3) { animation-delay: 0.3s; }
@keyframes huh-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
.error { color: var(--huh-danger); font-size: 14px; margin: 8px 0; }
.status { color: var(--huh-text-muted); font-size: 12px; }
#historySection h2 { font-size: 13px; color: var(--huh-text-muted); margin: 16px 0 6px; }
.history { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.history li button {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 8px;
  border-radius: var(--huh-radius-sm);
  font-size: 12px;
  color: var(--huh-text-muted);
  cursor: pointer;
}
.history li button:hover { border-color: var(--huh-border); color: var(--huh-text); }
.history-empty { color: var(--huh-text-muted); font-size: 12px; padding: 4px 8px; }
```

- [ ] **Step 3: Create `src/popup/popup.js`**

```javascript
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

let state = { originalText: '', level: 1 };

function show(section) {
  for (const s of [$paste, $result, $loading, $error]) s.hidden = (s !== section);
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
  state = { originalText: text, level };
  show($loading);
  const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
  if (res?.ok) {
    $resultBox.textContent = res.explanation;
    show($result);
    renderHistory(); // refresh after a successful call
  } else {
    $errorMsg.textContent = errorMessage(res?.errorCode);
    $errorSettings.hidden = !(res?.errorCode === 'NO_KEY' || res?.errorCode === 'BAD_KEY');
    show($error);
  }
}

$explain.addEventListener('click', () => {
  const text = $input.value.trim();
  if (!text) return;
  explain(text, 1);
});

$simpler.addEventListener('click', () => {
  if (!state.originalText) return;
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
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'Nothing yet.';
    $historyList.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `“${item.textPreview}” · ${timeAgo(item.ts)}`;
    btn.addEventListener('click', () => {
      state = { originalText: item.textPreview, level: item.level };
      $resultBox.textContent = item.explanation;
      show($result);
    });
    li.appendChild(btn);
    $historyList.appendChild(li);
  }
}

renderHistory();
```

- [ ] **Step 4: Verify popup**

Reload the extension. Click the toolbar icon. Expected: popup opens, shows textarea, gear icon, "Recent" section with "Nothing yet." Add a valid Gemini API key in Settings first. Then paste a sentence in the popup → click "Explain it to me" → loading dots → explanation appears. Click "Simpler please" → simpler explanation. Click "Copy" → "Copied!" briefly appears, clipboard has the text. Reopen the popup → the history list now shows your entry. Click it → the saved explanation re-renders without a new API call.

If you haven't entered a key, the popup should show "Add your Gemini API key to get started." with an "Open Settings" button.

---

## Task 9: Content script + floating card

**Files:**
- Create: `src/content/content.js`
- Create: `src/content/content.css`

The card lives in a shadow DOM to avoid style collisions with the host page. CSS in `content.css` is auto-injected by the manifest at the document level (we'll keep host-page rules minimal there); the card's own styles are injected inside the shadow root from a JS template string for full isolation.

- [ ] **Step 1: Create `src/content/content.css`**

```css
/* Host-page-level styles. We keep this nearly empty because the card lives in a shadow DOM. */
/* Reserve the host element from being affected by extreme page CSS by giving it a clean baseline. */
:host { all: initial; }
```

- [ ] **Step 2: Create `src/content/content.js`**

```javascript
const HOST_ID = 'huh-extension-host';
const CARD_CSS = `
  :host { all: initial; }
  .card {
    position: fixed;
    z-index: 2147483647;
    max-width: 360px;
    min-width: 260px;
    background: #ffffff;
    color: #111827;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(17,24,39,0.18);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    padding: 12px 14px;
  }
  @media (prefers-color-scheme: dark) {
    .card { background: #1f2937; color: #f3f4f6; border-color: #374151; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
  }
  header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
  header h1 { all: unset; font-weight: 600; font-size: 14px; }
  .close { all: unset; cursor: pointer; color: #6b7280; padding: 2px 6px; border-radius: 4px; }
  .close:hover { background: rgba(0,0,0,0.06); }
  .body { white-space: pre-wrap; }
  .actions { display:flex; gap: 6px; margin-top: 10px; align-items:center; flex-wrap: wrap; }
  button.btn {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: transparent;
    color: inherit;
  }
  button.btn:hover { background: rgba(99,102,241,0.08); }
  button.btn[disabled] { opacity: 0.6; cursor: not-allowed; }
  .status { font-size: 12px; color: #6b7280; }
  .error { color: #dc2626; }
  .loading { display:flex; gap:6px; padding: 8px 0; }
  .loading span {
    width:8px; height:8px; border-radius:50%; background:#6366f1;
    animation: huh-bounce 1s infinite ease-in-out;
  }
  .loading span:nth-child(2) { animation-delay: .15s; }
  .loading span:nth-child(3) { animation-delay: .3s; }
  @keyframes huh-bounce {
    0%,80%,100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

function errorMessage(code) {
  switch (code) {
    case 'NO_KEY': return "Add your Gemini API key in Settings to get started.";
    case 'BAD_KEY': return "That key didn't work. Check it in Settings.";
    case 'RATE_LIMIT': return "Gemini is rate-limiting you. Wait a minute.";
    case 'TOO_LONG': return "That's a lot of text! Try a smaller chunk.";
    case 'TOO_SHORT': return "Couldn't read your selection. Try the popup paste mode.";
    case 'NETWORK': return "Can't reach Gemini. Check your internet.";
    case 'SERVER': return "Gemini hiccupped. Try again in a sec.";
    default: return "Something went wrong. Try again.";
  }
}

function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.zIndex = '2147483647';
  document.documentElement.appendChild(host);
  host.attachShadow({ mode: 'open' });
  return host;
}

function positionCard(cardEl) {
  const sel = window.getSelection();
  let rect = null;
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    try { rect = sel.getRangeAt(0).getBoundingClientRect(); } catch (_) { /* ignore */ }
  }
  const margin = 12;
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = margin, left = margin;
  if (rect && rect.width > 0 && rect.height > 0) {
    top = Math.min(rect.bottom + 8, vh - 240);
    left = Math.min(Math.max(rect.left, margin), vw - 380);
  }
  cardEl.style.top = `${Math.max(margin, top)}px`;
  cardEl.style.left = `${Math.max(margin, left)}px`;
}

function renderCard({ state }) {
  const host = ensureHost();
  const root = host.shadowRoot;
  root.innerHTML = `
    <style>${CARD_CSS}</style>
    <div class="card" role="dialog" aria-label="Huh? explanation">
      <header>
        <h1>Huh?</h1>
        <button class="close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="content"></div>
    </div>
  `;
  const cardEl = root.querySelector('.card');
  const content = root.querySelector('.content');
  positionCard(cardEl);

  if (state.kind === 'loading') {
    content.innerHTML = `<div class="loading"><span></span><span></span><span></span></div>`;
  } else if (state.kind === 'result') {
    content.innerHTML = `
      <div class="body"></div>
      <div class="actions">
        <button class="btn" data-action="simpler">Simpler please</button>
        <button class="btn" data-action="copy">Copy</button>
        <span class="status" data-role="status"></span>
      </div>
    `;
    content.querySelector('.body').textContent = state.explanation;
  } else if (state.kind === 'error') {
    const isKeyErr = state.errorCode === 'NO_KEY' || state.errorCode === 'BAD_KEY';
    content.innerHTML = `
      <div class="body error"></div>
      <div class="actions">
        ${isKeyErr ? '<button class="btn" data-action="openSettings">Open Settings</button>' : ''}
        <button class="btn" data-action="close">Dismiss</button>
      </div>
    `;
    content.querySelector('.body').textContent = errorMessage(state.errorCode);
  }

  root.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => handleAction(el.dataset.action));
  });
}

let session = { originalText: '', level: 1 };

function close() {
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
}

async function handleAction(action) {
  if (action === 'close') return close();
  if (action === 'openSettings') {
    chrome.runtime.sendMessage({ type: 'openOptions' }).catch(() => {});
    // Fallback: just close — service worker doesn't handle openOptions; this is best-effort.
    return close();
  }
  if (action === 'simpler') {
    if (!session.originalText) return;
    return run(session.originalText, session.level + 1);
  }
  if (action === 'copy') {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    const body = host.shadowRoot.querySelector('.body');
    const status = host.shadowRoot.querySelector('[data-role="status"]');
    if (body) {
      try {
        await navigator.clipboard.writeText(body.textContent || '');
        if (status) {
          status.textContent = 'Copied!';
          setTimeout(() => { if (status) status.textContent = ''; }, 1500);
        }
      } catch (_) {
        if (status) status.textContent = 'Copy failed';
      }
    }
  }
}

async function run(text, level) {
  session = { originalText: text, level };
  renderCard({ state: { kind: 'loading' } });
  const res = await chrome.runtime.sendMessage({ type: 'explain', text, level });
  if (res?.ok) {
    renderCard({ state: { kind: 'result', explanation: res.explanation } });
  } else {
    renderCard({ state: { kind: 'error', errorCode: res?.errorCode || 'UNKNOWN' } });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'huh:showCard') {
    const text = (msg.text || '').trim();
    if (!text) {
      renderCard({ state: { kind: 'error', errorCode: 'TOO_SHORT' } });
      sendResponse({ ok: true });
      return;
    }
    run(text, 1);
    sendResponse({ ok: true });
  }
});
```

Note on `openOptions`: clicking "Open Settings" from inside a content script can't open the options page directly (content scripts don't have `chrome.runtime.openOptionsPage`). The best UX is to send a message the service worker handles. Add a handler for it in step 3 below.

- [ ] **Step 3: Add `openOptions` handler to the service worker**

Edit `src/background/service-worker.js`. In the `handleMessage` switch, add a case:

```javascript
    case 'openOptions':
      await chrome.runtime.openOptionsPage();
      return { ok: true };
```

The full updated `handleMessage`:

```javascript
async function handleMessage(msg) {
  switch (msg?.type) {
    case 'explain':
      return doExplain(msg.text, msg.level || 1);
    case 'getHistory':
      return { ok: true, items: await getHistory() };
    case 'clearHistory':
      await clearHistory();
      return { ok: true };
    case 'openOptions':
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    default:
      return { ok: false, errorCode: 'UNKNOWN', detail: 'Unknown message type' };
  }
}
```

Also remove the `close()` call after `openOptions` in `src/content/content.js` so the card stays put while the options tab opens. Replace the `if (action === 'openSettings')` block with:

```javascript
  if (action === 'openSettings') {
    chrome.runtime.sendMessage({ type: 'openOptions' }).catch(() => {});
    return;
  }
```

- [ ] **Step 4: Verify the floating card end-to-end**

Reload the extension. Open any normal article (e.g. a Wikipedia page). Select a sentence, right-click → "Explain with Huh?". Expected: floating card appears near the selection with loading dots, then an explanation. Click "Simpler please" → simpler explanation. Click "Copy" → "Copied!" appears. Click "×" → card disappears.

Test the empty-selection / Google Docs fallback: open `https://docs.google.com/document/u/0/` (or any doc you own), select text inside a doc, right-click → "Explain with Huh?". If selection is empty, the card should show "Couldn't read your selection. Try the popup paste mode." If selection is captured, it should explain.

Test the no-key state: open Settings, clear the key, reload extension, right-click an article selection → card shows the NO_KEY error with an "Open Settings" button that opens the options page.

---

## Task 10: README + manual test checklist

**Files:**
- Create: `README.md` (overwrite the existing one-line placeholder)
- Create: `docs/manual-test.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Huh? 🤔

A Chrome extension that explains any text like you're 5. Highlight something confusing on a webpage, right-click → *Explain with Huh?*, and get a warm, jargon-free explanation powered by Google Gemini.

Built by a student who got tired of re-reading dense lecture slides at 2am.

## Screenshots

_(coming soon — replace this section with a screenshot or GIF of the floating card and the popup paste mode.)_

## Features

- **Highlight & explain** — right-click any selection, get an ELI5 explanation in a floating card.
- **Paste mode** — paste text into the popup when highlighting doesn't work (PDFs, slides).
- **Simpler please** — re-explain progressively simpler, as many times as you want.
- **Copy to clipboard** — one click.
- **Local history** — last 5 explanations, on by default, toggleable in settings.
- **Auto dark mode** — follows your system theme.
- **No backend** — your API key and history live in `chrome.storage.local` only.

## Install

1. Clone this repo:
   ```bash
   git clone https://github.com/brucelsprouts/huh-extension.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned folder.
5. The Huh? icon appears in your toolbar.

## Get a Gemini API key

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Click **Create API key** → copy it.
4. Right-click the Huh? toolbar icon → **Options** (or click the gear in the popup).
5. Paste your key → click **Save**.

Gemini's free tier is plenty for personal study use.

## Usage

- **Highlight mode:** select text on any webpage, right-click → *Explain with Huh?*
- **Paste mode:** click the toolbar icon, paste text, click *Explain it to me*.
- **Simpler please:** click after any explanation for an even simpler version.

## Privacy

- Your API key, settings, and history are stored in `chrome.storage.local` on your device.
- The only network request this extension makes is directly to `https://generativelanguage.googleapis.com` (Google's Gemini API), using your key.
- No telemetry. No analytics. No user accounts.

## Tech stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no bundler, no build step)
- Gemini 2.0 Flash via REST
- `chrome.storage.local` for state
- `node --test` for unit tests on pure modules (no npm dependencies)

## Running tests

```bash
node --test tests/
```

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 2: Create `docs/manual-test.md`**

```markdown
# Manual smoke test

Run through this checklist after any change before shipping.

## Setup
- [ ] Load unpacked extension at `chrome://extensions`.
- [ ] Open Options, paste a valid Gemini API key, click Save.
- [ ] Confirm history toggle is ON (default).

## Highlight mode (normal article)
- [ ] Open a Wikipedia article. Select a sentence.
- [ ] Right-click → "Explain with Huh?" — card appears with loading dots, then explanation.
- [ ] Click "Simpler please" three times — output gets simpler each time.
- [ ] Click "Copy" — "Copied!" appears; paste into any text field to verify.
- [ ] Click × — card closes.

## Paste mode (popup)
- [ ] Click toolbar icon. Paste a paragraph. Click "Explain it to me".
- [ ] Loading → explanation. "Simpler please" works. "Copy" works.
- [ ] Close popup, reopen — history list shows the latest entry. Click it; the saved explanation re-renders without a new API call.

## Google Docs fallback
- [ ] Open a Google Doc. Try right-click → "Explain with Huh?" on a selection.
- [ ] If selection captured: explanation appears.
- [ ] If empty: card shows "Couldn't read your selection. Try the popup paste mode."

## Error states
- [ ] Clear API key in Settings. Trigger explain → error: "Add your Gemini API key…". "Open Settings" button works.
- [ ] Set API key to garbage. Trigger explain → "That key didn't work…".
- [ ] Disconnect from network. Trigger explain → "Can't reach Gemini…".
- [ ] Paste > 30,000 characters into popup. Click explain → "That's a lot of text!".

## Settings
- [ ] Toggle "Remember what I've looked up" OFF → trigger a new explanation → popup history list does not gain an entry.
- [ ] Toggle ON again → new explanation appears in history.
- [ ] Click "Clear history" → popup history list shows "Nothing yet.".

## Theming
- [ ] Switch system to dark mode → popup, settings, and floating card all use dark theme.
- [ ] Switch back to light → all return to light theme.

## Unit tests
- [ ] `node --test tests/` — all tests pass.
```

- [ ] **Step 3: Run the full manual smoke test**

Work through `docs/manual-test.md` start to finish. Fix any failures before declaring complete.

- [ ] **Step 4: Run unit tests one more time**

Run: `node --test tests/`
Expected: PASS — all tests pass (4 from prompts + 9 from gemini = 13 total).

---

## Done

All features from the spec implemented:
- ✅ Highlight → floating in-page card (shadow-DOM scoped)
- ✅ Paste mode in popup
- ✅ Settings page with API key + history toggle + clear button
- ✅ "Simpler please" using level-based prompt, anchored to original text
- ✅ Copy to clipboard with confirmation
- ✅ Recent history (last 5, FIFO, toggleable, default on, local only)
- ✅ Loading + classified error states (NO_KEY, BAD_KEY, RATE_LIMIT, TOO_LONG, NETWORK, SERVER, UNKNOWN)
- ✅ Auto dark mode (`prefers-color-scheme`)
- ✅ Minimum permissions (storage, contextMenus, scripting, single host)
- ✅ Google Docs/Slides best-effort with friendly fallback
- ✅ MIT license, README, .gitignore
- ✅ Pure-lib unit tests via `node --test`, no npm dependencies

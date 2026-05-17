# "Huh?" Chrome Extension — Design

**Date:** 2026-05-17
**Status:** Approved for implementation planning

## Summary

A Chrome (Manifest V3) extension that explains highlighted or pasted text in ELI5 language using the Gemini API. Open-source, no backend, no telemetry. Users supply their own Gemini API key.

## Goals

- Highlight any text on a webpage → one click → ELI5 explanation in a floating in-page card.
- Paste mode in the extension popup for cases where highlighting doesn't work (Docs/Slides canvas, PDFs).
- "Simpler please" button that progressively simplifies the explanation.
- Copy-to-clipboard, last-5 history (toggleable, default on), friendly errors.
- Auto dark mode (follows system).
- Zero build step: clone → load unpacked.

## Non-Goals (v1)

User accounts, cloud sync, multi-provider support, OCR, translation, mobile, Chrome Web Store listing.

## Project Structure

```
huh-extension/
├── manifest.json
├── README.md
├── LICENSE                       (MIT)
├── .gitignore
├── icons/                        icon16/48/128.png
├── src/
│   ├── background/
│   │   └── service-worker.js     context menu, message routing, Gemini calls, history writes
│   ├── content/
│   │   ├── content.js            selection capture + floating card injection
│   │   └── content.css           floating card styles (shadow-DOM scoped)
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js              paste mode, history list, link to settings
│   ├── settings/
│   │   ├── settings.html
│   │   ├── settings.css
│   │   └── settings.js           API key, history toggle, clear history
│   ├── lib/
│   │   ├── gemini.js             fetch wrapper + error classification (pure)
│   │   ├── prompts.js            system prompt + level-aware simpler prompt (pure)
│   │   └── storage.js            chrome.storage.local wrappers
│   └── shared/
│       └── theme.css             CSS variables + prefers-color-scheme dark mode
```

`lib/` is intentionally free of `chrome.*` calls (except `storage.js`) so prompt and error logic can be unit-tested with plain Node later.

## Architecture & Data Flow

The **service worker owns Gemini calls and history writes.** Content script and popup are render-only; they send messages and display results. This keeps the API key off the page context.

```
[content script]  ──┐
                    ├── chrome.runtime.sendMessage({type:'explain', text, level})
[popup]           ──┘
                       ↓
              [service worker]
                  • reads API key from chrome.storage.local
                  • builds prompt (lib/prompts.js)
                  • fetch → Gemini (lib/gemini.js)
                  • writes history if settings.historyEnabled
                  • returns {ok: true, explanation} | {ok: false, errorCode}
                       ↓
              caller renders result or error state
```

**Message types** (only three):

- `{type: 'explain', text, level}` → `{ok, explanation?, errorCode?}`
- `{type: 'getHistory'}` → `{items: HistoryItem[]}`
- `{type: 'clearHistory'}` → `{ok: true}`

Settings page reads/writes `chrome.storage.local` directly.

## Permissions

Minimum set:

- `storage` — key, settings, history
- `contextMenus` — right-click entry
- `scripting` — programmatic injection fallback (e.g. explain via toolbar icon)
- `content_scripts` matches `<all_urls>` — floating card on any page
- `host_permissions`: `https://generativelanguage.googleapis.com/*` — only the Gemini endpoint

No `activeTab` (content_scripts handle the common case). No broad host permissions beyond Gemini.

## User Flows

### Highlight → Floating Card

1. User selects text on a page.
2. User right-clicks → "Explain with Huh?" (context menu created by service worker on install).
3. Content script captures `window.getSelection().toString()`, injects a **shadow-DOM-scoped** floating card near the selection.
4. Card renders skeleton/loading state; content script sends `explain` message.
5. Service worker calls Gemini; response goes back to the card.
6. Card shows explanation with controls: **Simpler please**, **Copy**, **Close**.

### Google Docs / Slides (best-effort)

`window.getSelection()` may return empty in the canvas-based editor. When empty:

- Floating card shows: "Couldn't read your selection — open the popup and paste it" with a button that opens the popup. Honest, never silently fails.

### Paste Mode (popup)

1. User clicks extension icon.
2. Popup shows a textarea + "Explain it to me" button.
3. Same `explain` message → result rendered in popup with the same Simpler/Copy controls.
4. Popup also shows the history list and a gear → settings page.

### Simpler Please

State per card/popup: `{originalText, level}`. Each click increments `level` and re-sends **the original text** (not the previous explanation) with a level-aware prompt. This anchors quality to the source and prevents compounding semantic drift.

## Prompts (lib/prompts.js)

**System prompt (level 1):**

> You are a warm, encouraging tutor who explains things to a literal 5-year-old. Rules:
> - Use short, simple sentences.
> - Prefer everyday analogies (animals, food, toys, family).
> - Avoid jargon. If a technical term is unavoidable, define it inline in parentheses using simpler words.
> - Be kind and encouraging, never condescending.
> - If the input isn't really text to explain (e.g. a URL with no context, a single word with no meaning given), say so gently and ask for more.

**Simpler prompt (level N ≥ 2):** append to the system prompt:

> You already explained this at level {N-1}. Explain it at level {N} — even shorter sentences, even more familiar comparisons, fewer concepts per sentence. Do not repeat your earlier wording verbatim. Pretend the listener is younger and more tired than before.

**Model:** `gemini-2.0-flash` via REST: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={KEY}`.

## History

**Shape:**

```ts
type HistoryItem = {
  id: string;          // crypto.randomUUID()
  textPreview: string; // first 120 chars of original text
  explanation: string; // final explanation shown
  level: number;       // simplification level when stored
  ts: number;          // Date.now()
};
```

- Stored at `chrome.storage.local.history` as `HistoryItem[]`, capped at 5 (FIFO).
- Written by the service worker after every successful explanation, only if `settings.historyEnabled !== false`.
- Default: ON. Settings page label: "Remember what I've looked up".
- Popup renders the list with truncated preview + relative time ("2m ago"). Clicking re-opens the saved explanation inline in the popup (no new API call).
- Settings has a "Clear history" button.

## Errors

`lib/gemini.js` returns one of these codes; each surface maps to a friendly message:

| code         | trigger                                | message                                                                 |
|--------------|----------------------------------------|-------------------------------------------------------------------------|
| `NO_KEY`     | No key in storage                      | "Add your Gemini API key to get started." → button opens Settings.       |
| `BAD_KEY`    | 401/403 from Gemini                    | "That key didn't work. Double-check it in Settings."                     |
| `RATE_LIMIT` | 429                                    | "Gemini is rate-limiting you. Wait a minute and try again."              |
| `TOO_LONG`   | Input > 30,000 chars (precheck)        | "That's a lot of text! Try a smaller chunk."                             |
| `NETWORK`    | fetch throws / offline                 | "Can't reach Gemini. Check your internet."                               |
| `SERVER`     | 5xx                                    | "Gemini hiccupped. Try again in a sec."                                  |
| `UNKNOWN`    | anything else                          | "Something went wrong. Try again." (logs original error)                 |

Loading state: animated three-dot skeleton. Only one in-flight request per surface — the button is disabled while pending.

## Theming

`shared/theme.css` defines CSS variables for light theme; `@media (prefers-color-scheme: dark)` overrides them. Every surface imports this file. No user toggle in v1.

Visual style: soft colors, rounded corners (8–12px), generous spacing, system font stack, slightly playful but readable. "Study buddy at 2am" energy.

## Testing

No bundler ⇒ no test runner wired up in v1. Approach:

- Keep `lib/prompts.js` and `lib/gemini.js` (the classifier) free of `chrome.*` so they can be node-tested later.
- Ship a manual smoke-test checklist in `docs/manual-test.md`:
  - Highlight on a normal page → card appears with explanation.
  - Simpler × 3 → progressively simpler output.
  - Copy → clipboard contains explanation, "Copied!" confirmation shows briefly.
  - Paste mode in popup.
  - Bad key → friendly error + Settings link.
  - No key → onboarding message.
  - Toggle history off → no new entries written; existing entries preserved.
  - Clear history → list empties.
  - Google Docs page → fallback message renders.
  - Dark mode by toggling system theme.

## README Contents

- What it does (one-paragraph pitch).
- Screenshot/GIF placeholders.
- Install: clone → `chrome://extensions` → enable Developer mode → "Load unpacked" → select repo folder.
- Get a key: link to aistudio.google.com, 3-step instructions.
- Paste key into Settings.
- Privacy: "Your key and history live in `chrome.storage.local` on your machine. The only network call this extension makes is directly to `generativelanguage.googleapis.com`."
- Tech stack: MV3, vanilla JS, Gemini 2.0 Flash.
- License: MIT.

## Open Items

None for v1. Future ideas (out of scope): cloud sync, multi-provider, PDF OCR, translation, Chrome Web Store listing.

# huh?

Two ways to get dense text explained like you're five — a Chrome extension and a web app, both powered by Google Gemini.

Built by a student who got tired of re-reading dense lecture slides at 2am.

- **Web app:** [huh-extension.vercel.app](https://huh-extension.vercel.app/) — paste, hit explain, done. No install.
- **Chrome extension:** highlight text on any page → right-click → **huh?**. Or paste into the popup.

Same prompt, same model, same UI. Your API key and history stay on your device — no backend, no accounts, no telemetry.

## Features

- **Highlight & explain** (extension) — right-click any selection, get an ELI5 explanation in a floating card.
- **Multiple cards at once** (extension) — highlight different things on the same page and spawn independent cards. Each has its own state, position, and *simpler please* level.
- **Draggable cards** (extension) — grab a card by its header and move it anywhere. Click any card to raise it above the others.
- **Auto-prefill from selection** (extension) — highlight text, click the toolbar icon, and the popup opens with your selection already filled in.
- **Paste mode** (extension + web) — paste anything when highlighting won't work (PDFs, slides, screenshots-via-OCR, etc.).
- **Simpler please** — re-explain progressively simpler, as many times as you want.
- **Copy to clipboard** — one click.
- **Local history** — last 5 explanations by default, toggleable + adjustable in settings.
- **Auto dark mode** — follows your system theme.
- **Cross-document view transitions** (web) — page navigation cross-fades smoothly in Chromium.
- **No backend** — your API key and history live in `chrome.storage.local` (extension) or `localStorage` (web). Nothing leaves your browser except the call to Gemini itself.

## Use the web app

1. Visit [huh-extension.vercel.app](https://huh-extension.vercel.app/).
2. Click **⚙ settings**, paste a Gemini key (see below), click **save**.
3. Click **← back to app**, paste text, click **explain →**.

## Install the extension

1. Clone this repo:
   ```bash
   git clone https://github.com/brucelsprouts/huh-extension.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned folder.
5. The huh? icon appears in your toolbar.

## Get a Gemini API key (works for both surfaces)

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Click **Create API key** → copy it.
4. Paste it into settings on whichever surface you're using (extension popup gear, or the web app's settings page).

Gemini's free tier is plenty for personal study use. The same key works in both places — you'll just enter it once per browser, since storage is local to each surface.

## Usage

- **Highlight mode (extension):** select text → right-click → **huh?**. A draggable card appears next to your selection. Highlight more text and repeat to spawn additional cards; click a card to bring it to the front.
- **Quick popup (extension):** highlight text, then click the toolbar icon — the popup opens with your selection prefilled, just hit `explain →`. (Works on any normal site; chrome:// and the Web Store block content scripts so prefill is silently skipped there.)
- **Paste mode (both):** click the toolbar icon (extension) or open the web app, paste, hit explain.
- **Simpler please:** click after any explanation for an even simpler version. Click again for even simpler. Repeat until it makes sense. Each floating card tracks its own simpler level.
- **History:** the last few explanations are saved locally. Open settings to copy them all, export to JSON, or clear.

## Privacy

- Your API key, settings, and history are stored locally:
  - Extension → `chrome.storage.local`
  - Web app → `localStorage`
- The only network request either surface makes is directly to `https://generativelanguage.googleapis.com` (Google's Gemini API), using your key.
- No telemetry. No analytics. No user accounts. No server in the middle.

## Tech stack

- **Extension:** Chrome Extension Manifest V3, vanilla JS, no bundler, no build step.
- **Web app:** static HTML/JS deployed on Vercel. No framework, no build step. Shares the same `src/lib/` prompt + Gemini-call code as the extension.
- **Model:** Gemini 2.5 Flash Lite by default (configurable in settings).
- **Tests:** `node --test` on pure modules. No npm dependencies.

## Repo layout

```
index.html, settings.html, app.js, settings.js, storage.js  — web app (served at root)
src/popup/                                                  — extension popup UI
src/page/                                                   — extension full-tab mode
src/settings/                                               — extension settings page
src/content/                                                — content script (right-click card)
src/background/                                             — service worker
src/lib/                                                    — shared: prompts.js, gemini.js
src/shared/theme.css                                        — shared theme (both surfaces)
tests/                                                      — unit tests (node --test)
```

## Running tests

```bash
node --test tests/*.test.mjs
```

## Local development

- **Web app:** `npx serve .` from the repo root, open the printed URL.
- **Extension:** load unpacked from `chrome://extensions` (see install steps above). Reload from that page after edits.

## Deploy the web app

Push to GitHub → import the repo on [Vercel](https://vercel.com/new) → Framework Preset: **Other**, leave Build / Output / Install empty → Deploy. Or run `vercel` from the repo root.

## License

MIT — see [LICENSE](./LICENSE).

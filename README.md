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
node --test tests/*.test.mjs
```

## License

MIT — see [LICENSE](./LICENSE).

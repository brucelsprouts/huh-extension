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
- [ ] `node --test tests/*.test.mjs` — all 13 tests pass.

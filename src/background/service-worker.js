import { buildPrompt } from '../lib/prompts.js';
import { callGemini, precheckInput } from '../lib/gemini.js';
import { getApiKey, getModel, getHistory, clearHistory, pushHistory, deleteHistoryItem } from '../lib/storage.js';

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
    case 'deleteHistoryItem':
      await deleteHistoryItem(msg.id);
      return { ok: true };
    case 'openOptions':
      await chrome.runtime.openOptionsPage();
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

  const model = await getModel();
  const result = await callGemini({
    apiKey,
    model,
    system: promptParts.system,
    user: promptParts.user,
  });

  if (result.ok) {
    await pushHistory({ text, explanation: result.explanation, level });
  } else {
    console.warn('[Huh?] Gemini error:', result.errorCode, result.detail || '');
  }
  return result;
}

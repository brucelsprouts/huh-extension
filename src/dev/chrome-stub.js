// Dev-only stub for previewing popup.html / settings.html outside Chrome.
// Activates only when there is no real extension context. Safe to ship.
(function () {
  if (globalThis.chrome?.runtime?.id) return; // real extension — bail

  const fakeStorage = {
    apiKey: '',
    model: 'gemini-2.5-flash-lite',
    historyEnabled: true,
    historyLimit: 5,
    history: [
      {
        id: 'demo-1',
        textPreview: 'asymptotic time complexity of an algorithm describes how its running time grows',
        explanation:
          "Imagine you have a big toy box.\n\nIf there are 10 toys, finding one is fast.\nIf there are a million, it takes longer.\n\nBig-O is just a fancy way grown-ups talk about how much longer.",
        level: 2,
        ts: Date.now() - 1000 * 60 * 3,
      },
      {
        id: 'demo-2',
        textPreview: 'A hash table uses a hash function to map keys to array indices',
        explanation:
          'Think of a coat check at a fancy party.\n\nYou give your coat, they give you a number.\nLater, the number tells them exactly which hook your coat is on — no looking through every coat.',
        level: 1,
        ts: Date.now() - 1000 * 60 * 60 * 2,
      },
    ],
  };

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  const stub = {
    runtime: {
      id: 'dev-stub',
      sendMessage: async (msg) => {
        await new Promise((r) => setTimeout(r, 600)); // fake latency
        switch (msg?.type) {
          case 'explain':
            return {
              ok: true,
              explanation:
                "Okay, imagine you have a giant pile of LEGO bricks.\n\nSome ways of finding the red brick are quick — you sort them first, then peek in the middle.\n\nOther ways are slow — you check every single brick one by one.\n\nThat's what this is about: which way is fast, and which way is sloooow when the pile gets huge.",
            };
          case 'getHistory':
            return { ok: true, items: clone(fakeStorage.history) };
          case 'clearHistory':
            fakeStorage.history = [];
            return { ok: true };
          case 'openOptions':
            window.open('../settings/settings.html', '_blank');
            return { ok: true };
          default:
            return { ok: false, errorCode: 'UNKNOWN' };
        }
      },
      openOptionsPage: () => window.open('../settings/settings.html', '_blank'),
    },
    storage: {
      local: {
        get: async (keys) => {
          const out = {};
          const names = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys || fakeStorage);
          for (const k of names) if (k in fakeStorage) out[k] = clone(fakeStorage[k]);
          return out;
        },
        set: async (obj) => {
          Object.assign(fakeStorage, clone(obj));
        },
      },
    },
  };

  globalThis.chrome = stub;
  document.documentElement.dataset.devStub = 'true';
  console.info('[Huh? dev-stub] Chrome APIs stubbed for local preview.');
})();

/* Aura — shared prototype state.
   One source of truth for the six areas. Structured around what the
   information IS to the product, not which screen shows it:

     entries   — things put down and kept            (Record)
     threads   — what became visible across entries  (Over time)
     memories  — what Aura was told to remember      (Remember)
     suggested — what Aura has brought back

   These stay separate on purpose. An entry is not a memory; a thread is
   not a list of entries the user filed. Screens read what they need and
   write only through the actions below. */

(function () {
  if (window.AuraStore) return;

  // One timeline, not per-item offsets. Read together:
  //   e1 anchors the long-term thread, so it sits ~3 months back
  //   e2 is what This week quotes, so it sits inside the last 7 days
  //   the thread's layers stay months apart — "across months" is the premise
  const MONTHS = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'];
  const ago = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  };

  const state = {
    // ── Record: things put down and kept ──────────────────────────
    entries: [
      {
        id: 'e1', age: 88, date: ago(88), meta: 'spoken', threadId: 't1',
        pull: '“I kept waiting for someone to tell me it was a mistake.”',
        tail: 'The internship came through.',
        body: 'Got the internship. I kept waiting for someone to tell me it was a mistake. Everyone else seems to know what they’re doing and I’m just guessing and hoping nobody checks.',
        question: 'What happened that made this stay with you?',
        answer: 'I think because I applied without telling anyone, so if it went badly nobody would know. Now it went well and I still haven’t said anything.',
        summary: 'The internship came through. Glad about it, and braced for it to be taken back. Hasn’t told anyone yet.',
        now: null, nowMeta: null,
      },
      {
        id: 'e2', age: 2, date: ago(2), meta: 'written', threadId: null,
        pull: '“I don’t think I’m actually angry. I think I’m tired.”',
        tail: 'After the argument at dinner.',
        body: 'Snapped at Dev over something that didn’t matter and I could see his face change. I don’t think I’m actually angry. I think I’m tired and he happened to be standing there.',
        question: null, answer: null,
        summary: 'Snapped at Dev over something small. Reads it as tiredness rather than anger.',
        now: 'Apologised the next morning. He’d already forgotten it — I hadn’t.',
        nowMeta: 'Added ' + ago(1),
      },
      {
        id: 'e3', age: 5, date: ago(5), meta: 'written · a few lines', threadId: null,
        pull: '“Today felt lighter.”',
        tail: 'No particular reason given.',
        body: 'Today felt lighter. Nothing happened, really. I walked back the long way and didn’t rush.',
        question: null, answer: null, summary: null, now: null, nowMeta: null,
      },
      {
        id: 'e4', age: 34, date: ago(34), meta: 'spoken', threadId: null,
        pull: '“I keep saying I’m fine because it’s shorter than the truth.”',
        tail: 'Late, after a long week.',
        body: 'I keep saying I’m fine because it’s shorter than the truth. It’s not even a lie exactly. It’s just that the real answer takes twenty minutes and I don’t have twenty minutes of anyone’s attention.',
        question: 'Was there a person or a moment behind it?',
        answer: 'Mum asked twice today. Both times I said fine.',
        summary: 'Saying “fine” because the long answer takes energy she doesn’t have.',
        now: null, nowMeta: null,
      },
    ],

    // ── Over time: what became visible across entries ─────────────
    // Layers reference entries where one exists. A thread is not a folder:
    // it is what repetition made legible.
    threads: [
      {
        id: 't1', title: 'The internship.',
        layers: [
          { id: 'l1', date: ago(88), entryId: 'e1', text: '“I kept waiting for someone to tell me it was a mistake.”' },
          { id: 'l2', date: ago(58), entryId: null, text: '“I think I’m getting better at this. I still check my work four times.”' },
          { id: 'l3', date: ago(31), entryId: null, text: '“Maybe I don’t need someone to tell me anymore.”' },
        ],
      },
    ],

    // ── Remember: what Aura was told to remember ──────────────────
    // `remember` and `use` are independent. Remembering is not permission.
    memories: [
      { id: 1, text: 'Reading gives me some room to think.', origin: 'You mentioned this during onboarding.', remember: true, use: true, offer: 'Take your book outside for a while.' },
      { id: 2, text: 'Walking helps me clear my head.', origin: 'You’ve come back to this a few times.', remember: true, use: true, offer: 'Maybe take one today.' },
      { id: 3, text: 'I like having somewhere to put creative ideas.', origin: 'You mentioned this during onboarding.', remember: true, use: false, offer: null },
    ],

    // ── What Aura has brought back ────────────────────────────────
    suggested: [
      { id: 's1', text: 'Take your book outside', when: ago(9), memoryId: 1 },
      { id: 's2', text: 'Maybe take a walk today', when: ago(3), memoryId: 2 },
    ],
  };

  // newest first, whatever offsets the seeds were given
  state.entries.sort((a, b) => (a.age ?? 0) - (b.age ?? 0));

  const subs = new Set();
  const notify = () => subs.forEach((fn) => { try { fn(); } catch (e) {} });

  window.AuraStore = {
    get: () => state,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    // ── Record ──────────────────────────────────────────────────
    // An entry kept in Express lands here. Newest first, as the list reads.
    keepEntry({ body, answer, summary, spoken }) {
      const text = (body || '').trim();
      if (!text) return null;
      const first = text.split(/(?<=[.!?])\s/)[0] || text;
      const e = {
        id: 'e' + Date.now(),
        age: 0,
        date: 'Today',
        meta: spoken ? 'spoken' : 'written',
        threadId: null,
        pull: '“' + (first.length > 92 ? first.slice(0, 90).trim() + '…' : first.replace(/\s+$/, '')) + '”',
        tail: 'Put down today.',
        body: text,
        question: answer ? 'What happened that made this stay with you?' : null,
        answer: answer || null,
        summary: summary || null,
        now: null, nowMeta: null,
        isNew: true,
      };
      state.entries = [e, ...state.entries];
      notify();
      return e.id;
    },
    addNow(entryId, text) {
      const v = (text || '').trim();
      if (!v) return;
      state.entries = state.entries.map((e) =>
        e.id === entryId ? { ...e, now: v, nowMeta: 'Added today' } : e);
      notify();
    },

    // ── Over time ───────────────────────────────────────────────
    // A reflection is added as another layer. Nothing earlier changes.
    addLayer(threadId, text) {
      const v = (text || '').trim();
      if (!v) return;
      state.threads = state.threads.map((t) => t.id !== threadId ? t : {
        ...t,
        layers: [...t.layers, { id: 'l' + Date.now(), date: 'Today', entryId: null, text: v, isNew: true }],
      });
      notify();
    },
    clearLayers(threadId) {
      state.threads = state.threads.map((t) => t.id !== threadId ? t : {
        ...t, layers: t.layers.filter((l) => !l.isNew),
      });
      notify();
    },

    // ── Remember ────────────────────────────────────────────────
    addMemory(text) {
      const v = (text || '').trim();
      if (!v) return;
      state.memories = [...state.memories, {
        id: Date.now(), text: v, origin: 'You told me this just now.',
        remember: true, use: true, offer: null,
      }];
      notify();
    },
    editMemory(id, text) {
      const v = (text || '').trim();
      if (!v) return;
      state.memories = state.memories.map((m) => m.id === id ? { ...m, text: v } : m);
      notify();
    },
    patchMemory(id, fields) {
      state.memories = state.memories.map((m) => m.id === id ? { ...m, ...fields } : m);
      notify();
    },
    removeMemory(id) {
      state.memories = state.memories.filter((m) => m.id !== id);
      notify();
    },

    // ── Suggestions ─────────────────────────────────────────────
    // Only a memory the user allowed can produce one. No engine: the offer
    // text is the memory's own, so a suggestion always has a visible source.
    offerable() {
      return state.memories.filter((m) => m.remember && m.use && m.offer);
    },
    recordSuggestion(memoryId) {
      const m = state.memories.find((x) => x.id === memoryId);
      if (!m || !m.offer) return;
      state.suggested = [{ id: 's' + Date.now(), text: m.offer.replace(/\.$/, ''), when: 'Today', memoryId }, ...state.suggested];
      notify();
    },
  };
})();
